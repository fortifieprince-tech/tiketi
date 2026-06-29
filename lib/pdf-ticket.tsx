import { jsPDF } from 'jspdf'

export async function generateTicketsPDF(tickets: any[]): Promise<Buffer> {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = 210
  const pageHeight = 297
  const margin = 15
  let y = margin

  tickets.forEach((ticket, index) => {
    if (index > 0) {
      doc.addPage()
      y = margin
    }

    doc.setFontSize(22)
    doc.setTextColor('#1A2B4C')
    doc.text('TIKETI', pageWidth / 2, y, { align: 'center' })
    y += 8

    doc.setFontSize(10)
    doc.setTextColor('#94A3B8')
    doc.text('Brazzaville · Congo', pageWidth / 2, y, { align: 'center' })
    y += 12

    doc.setDrawColor('#E2E8F0')
    doc.line(margin, y, pageWidth - margin, y)
    y += 8

    doc.setFontSize(14)
    doc.setTextColor('#0F172A')
    doc.setFont('helvetica', 'bold')
    doc.text(ticket.eventTitle || 'Événement', margin, y)
    y += 7

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor('#475569')
    doc.text(`${ticket.eventDate || ''} · ${ticket.eventTime || ''}`, margin, y)
    y += 5
    doc.text(`${ticket.eventVenue || ''}, ${ticket.eventCity || ''}`, margin, y)
    y += 10

    doc.setDrawColor('#E2E8F0')
    doc.line(margin, y, pageWidth - margin, y)
    y += 8

    doc.setFontSize(10)
    doc.setTextColor('#475569')
    doc.text(`Billet ${ticket.ticketNumber || 1} / ${ticket.totalTickets || 1}`, margin, y)
    doc.text(`Prix: ${ticket.price?.toLocaleString('fr-FR') || 0} XAF`, pageWidth - margin, y, { align: 'right' })
    y += 6

    doc.text(`Titulaire: ${ticket.firstName || ''} ${ticket.lastName || ''}`, margin, y)
    if (ticket.categoryName) {
      doc.text(`Catégorie: ${ticket.categoryName}`, pageWidth - margin, y, { align: 'right' })
    }
    y += 10

    if (ticket.qrCodeImage) {
      try {
        const qrImage = ticket.qrCodeImage.replace('data:image/png;base64,', '')
        const qrSize = 60
        const qrX = (pageWidth - qrSize) / 2
        doc.addImage(qrImage, 'PNG', qrX, y, qrSize, qrSize)
        y += qrSize + 4
      } catch (e) {
        console.warn('QR Code non disponible')
      }
    }

    doc.setFontSize(8)
    doc.setTextColor('#94A3B8')
    doc.text(`Code: ${ticket.qrCode || ''}`, pageWidth / 2, y, { align: 'center' })
    y += 6

    const footerY = pageHeight - margin - 5
    doc.setFontSize(7)
    doc.setTextColor('#CBD5E1')
    doc.text('Ce billet est nominatif et non transférable.', pageWidth / 2, footerY, { align: 'center' })
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, pageWidth / 2, footerY + 4, { align: 'center' })
  })

  return Buffer.from(doc.output('arraybuffer'))
}