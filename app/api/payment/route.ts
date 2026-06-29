import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { generateQRCode } from '@/lib/qrcode'
import { generateTicketsPDF } from '@/lib/pdf-ticket'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      eventId, categoryId, firstName, lastName, whatsapp, email,
      quantity, totalPrice, phone, operator,
    } = body

    // 1. Créer la commande en "pending"
    const orderQrCode = 'CT-' + Math.random().toString(36).substring(2, 10).toUpperCase()
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        event_id:    eventId,
        category_id: categoryId || null,
        first_name:  firstName,
        last_name:   lastName,
        whatsapp:    whatsapp,
        email:       email || null,
        quantity:    quantity,
        total_price: totalPrice,
        status:      'pending',
        qr_code:     orderQrCode,
      })
      .select()
      .single()

    if (orderError) throw new Error(orderError.message)

    // 2. Récupérer les infos événement
    const { data: eventData } = await supabase
      .from('events')
      .select('title, date, time, venue, city, price, organizer_id')
      .eq('id', eventId)
      .single()

    let categoryName = ''
    if (categoryId) {
      const { data: catData } = await supabase
        .from('ticket_categories')
        .select('name')
        .eq('id', categoryId)
        .single()
      if (catData) categoryName = catData.name
    }

    let organizerEmail = ''
    if (eventData?.organizer_id) {
      const { data: organizer } = await supabase
        .from('organizers')
        .select('email')
        .eq('id', eventData.organizer_id)
        .single()
      if (organizer?.email) organizerEmail = organizer.email
    }

    // 3. Créer l'intention de paiement Yabetoopay
    const createRes = await fetch('https://pay.sandbox.yabetoopay.com/v1/payment-intents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.YABETOO_SECRET_KEY}`,
      },
      body: JSON.stringify({
        amount:   totalPrice,
        currency: 'XAF',
        label:    'payment_intent',
        metadata: {
          order_id: order.id,
          qr_code:  orderQrCode,
          event_id: eventId,
        },
      }),
    })

    const intent = await createRes.json()
    if (!createRes.ok) throw new Error(JSON.stringify(intent))

    // 4. Confirmer le paiement
    const confirmRes = await fetch(
      `https://pay.sandbox.yabetoopay.com/v1/payment-intents/${intent.id}/confirm`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.YABETOO_SECRET_KEY}`,
        },
        body: JSON.stringify({
          client_secret: intent.clientSecret,
          first_name:    firstName,
          last_name:     lastName,
          receipt_email: email || undefined,
          payment_method_data: {
            type: 'momo',
            momo: {
              country:       'cg',
              msisdn:        phone.replace(/\s/g, ''),
              operator_name: operator,
            },
          },
        }),
      }
    )

    const confirmation = await confirmRes.json()
    if (!confirmRes.ok) throw new Error(JSON.stringify(confirmation))

    if (confirmation.status === 'succeeded') {

      // 5. Marquer la commande comme payée
      await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('id', order.id)

      // 6. Créer les tickets (TOUS AVEC LE MÊME QR CODE : celui de la commande)
      const ticketsData: any[] = []
      for (let i = 1; i <= quantity; i++) {
        // 🔧 MODIFICATION ICI : on utilise orderQrCode pour tous les tickets
        const ticketQrCode = orderQrCode  // plus de "TKT-...-N"
        ticketsData.push({
          order_id:      order.id,
          event_id:      eventId,
          category_id:   categoryId || null,
          ticket_number: i,
          qr_code:       ticketQrCode,
        })
      }

      const { data: createdTickets } = await supabase
        .from('tickets')
        .insert(ticketsData)
        .select()

      // 7. Générer le QR code image pour chaque ticket
      const ticketsForPdf = []
      if (createdTickets) {
        for (const ticket of createdTickets) {
          const qrImage = await generateQRCode(ticket.qr_code)
          ticketsForPdf.push({
            eventTitle:   eventData?.title || '',
            eventDate:    eventData?.date || '',
            eventTime:    eventData?.time || '',
            eventVenue:   eventData?.venue || '',
            eventCity:    eventData?.city || '',
            firstName,
            lastName,
            qrCodeImage:  qrImage,
            qrCode:       ticket.qr_code,
            ticketNumber: ticket.ticket_number,
            totalTickets: quantity,
            price:        totalPrice / quantity,
            categoryName: categoryName || undefined,
          })
        }
      }

      // 8. Générer le PDF avec tous les billets
      const pdfBuffer = await generateTicketsPDF(ticketsForPdf)

      // 9. Sauvegarder le PDF dans Supabase Storage
      const pdfFilename = `ticket-${orderQrCode}.pdf`
      await supabase.storage
        .from('events')
        .upload(`tickets/${pdfFilename}`, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true,
        })

      const pdfUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/events/tickets/${pdfFilename}`

      // 10. Mettre à jour le sold (catégorie OU event selon le cas)
      if (categoryId) {
        const { data: cat } = await supabase
          .from('ticket_categories')
          .select('sold')
          .eq('id', categoryId)
          .single()

        if (cat) {
          await supabase
            .from('ticket_categories')
            .update({ sold: cat.sold + quantity })
            .eq('id', categoryId)
        }
      } else {
        const { data: ev } = await supabase
          .from('events')
          .select('sold')
          .eq('id', eventId)
          .single()

        if (ev) {
          await supabase
            .from('events')
            .update({ sold: ev.sold + quantity })
            .eq('id', eventId)
        }
      }

      // 11. Envoyer à n8n pour l'email
      if (process.env.N8N_WEBHOOK_URL && email) {
        try {
          await fetch(process.env.N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clientEmail:    email,
              firstName,
              lastName,
              eventTitle:     eventData?.title || '',
              categoryName:   categoryName || '',
              quantity,
              amount:         totalPrice.toLocaleString('fr-FR'),
              pdfUrl,
              organizerEmail,
            }),
          })
          console.log('✅ Notification n8n envoyée')
        } catch (notifError) {
          console.error('⚠️ Erreur notification n8n:', notifError)
        }
      }

      return NextResponse.json({
        success: true,
        qrCode: orderQrCode,
        pdfUrl,
        orderId: order.id,
      })

    } else {
      await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', order.id)
      return NextResponse.json(
        { error: 'Paiement refusé par l\'opérateur mobile' },
        { status: 400 }
      )
    }

  } catch (err: any) {
    console.error('Payment error:', err.message)
    return NextResponse.json(
      { error: err.message || 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}