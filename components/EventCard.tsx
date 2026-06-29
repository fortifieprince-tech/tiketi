import Link from 'next/link'
import { Calendar, MapPin, Users } from 'lucide-react'
import { DBEvent } from '@/lib/supabase'

type EventWithCats = DBEvent & {
  ticket_categories?: { price: number; capacity: number }[]
  displayPrice?: number
  displayCapacity?: number
}

export default function EventCard({ event }: { event: EventWithCats }) {
  const cats = event.ticket_categories || []
  const hasCats = cats.length > 0
  const displayPrice = event.displayPrice ?? (hasCats ? Math.min(...cats.map(c => c.price)) : event.price)
  const displayCapacity = event.displayCapacity ?? (hasCats ? cats.reduce((sum, c) => sum + c.capacity, 0) : event.capacity)

  const fillPct = displayCapacity > 0 ? Math.round((event.sold / displayCapacity) * 100) : 0
  const isHot   = fillPct >= 65
  const isFree  = displayPrice === 0
  const price   = isFree ? 'Gratuit' : displayPrice.toLocaleString('fr-FR') + ' XAF'
  const remaining = displayCapacity - event.sold

  return (
    <div className="card overflow-hidden hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 group">
      <div className={`relative h-40 overflow-hidden flex items-center justify-center ${!event.image_url ? `bg-gradient-to-br ${event.gradient}` : ''}`}>
        {event.image_url ? (
          <img
            src={event.image_url}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <span className="text-5xl select-none">{event.icon}</span>
        )}
        <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm ${isFree ? 'bg-emerald-500 text-white' : 'bg-white/90 text-brand-600'}`}>
          {price}
        </div>
        {isHot && (
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500 text-white">
            🔥 Populaire
          </div>
        )}
        <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold bg-black/30 text-white backdrop-blur-sm">
          {event.category}
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-bold text-slate-900 text-sm leading-snug mb-3 line-clamp-2 group-hover:text-brand-600 transition-colors">
          {event.title}
        </h3>
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            {event.date} · {event.time}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="truncate">{event.venue}, {event.city}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Users className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            {remaining} places restantes
          </div>
        </div>
        <div className="mb-4">
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${fillPct >= 80 ? 'bg-red-500' : fillPct >= 50 ? 'bg-amber-500' : 'bg-brand-600'}`}
              style={{ width: `${Math.min(fillPct, 100)}%` }}
            />
          </div>
        </div>
        <Link href={`/event/${event.id}`} className="btn-primary w-full text-xs py-2.5">
          {isFree ? 'Réserver gratuitement' : 'Acheter un billet'}
        </Link>
      </div>
    </div>
  )
}