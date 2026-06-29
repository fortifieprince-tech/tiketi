'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'

// Composant qui utilise useSearchParams (doit être encapsulé dans un Suspense)
function SuccessContent() {
  const searchParams = useSearchParams()
  const qrCode = searchParams.get('qr') || ''
  const pdfUrl = searchParams.get('pdf') || ''
  const orderId = searchParams.get('order') || ''

  return (
    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
      <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">
        ✅ Paiement réussi !
      </h1>
      <p className="text-slate-500 mb-4">
        Vos billets ont été envoyés par email.
      </p>

      {/* QR Code via API publique (ne nécessite pas de package) */}
      {qrCode && (
        <div className="flex justify-center mb-4">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode)}`}
            alt="QR Code"
            className="w-48 h-48"
          />
        </div>
      )}
      {qrCode && (
        <div className="text-xs text-slate-400 mb-6 font-mono break-all">
          Code : {qrCode}
        </div>
      )}

      {/* PDF Téléchargement */}
      {pdfUrl && (
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary w-full mb-3 inline-block"
        >
          📥 Télécharger mes billets PDF
        </a>
      )}

      <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-5 text-xs text-amber-700 font-medium">
        📧 Vos billets ont aussi été envoyés par email.
      </div>

      <Link href="/" className="btn-ghost w-full text-xs inline-block">
        Retour aux événements
      </Link>
    </div>
  )
}

// Page principale avec Suspense
export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-slate-500">Chargement...</div>}>
        <SuccessContent />
      </Suspense>
    </div>
  )
}