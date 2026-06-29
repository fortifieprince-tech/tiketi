import Link from 'next/link'
import { Ticket } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-center px-4">
      <div className="text-6xl mb-6">🎟️</div>
      <h1 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">Page introuvable</h1>
      <p className="text-slate-500 text-sm mb-8 max-w-sm">
        L'événement ou la page que vous cherchez n'existe pas ou a été supprimé.
      </p>
      <Link href="/" className="btn-primary">
        <Ticket className="w-4 h-4" />
        Retour aux événements
      </Link>
    </div>
  )
}
