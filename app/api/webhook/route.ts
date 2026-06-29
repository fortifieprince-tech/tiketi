import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { metadata, status } = body

    if (status === 'succeeded' && metadata?.order_id) {
      // Marquer la commande comme payée
      await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('id', metadata.order_id)

      // Mettre à jour le nombre de billets vendus
      const { data: order } = await supabase
        .from('orders')
        .select('event_id, quantity')
        .eq('id', metadata.order_id)
        .single()

      if (order) {
        const { data: event } = await supabase
          .from('events')
          .select('sold')
          .eq('id', order.event_id)
          .single()

        if (event) {
          await supabase
            .from('events')
            .update({ sold: event.sold + order.quantity })
            .eq('id', order.event_id)
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}