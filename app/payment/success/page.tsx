'use client'

import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          ✅ Paiement réussi !
        </h1>
        <p className="text-slate-500 mb-6">
          Vos billets ont été envoyés par email.
        </p>
        <Link href="/" className="btn-primary w-full">
          Retour à l'accueil
        </Link>
      </div>
    </div>
  )
}