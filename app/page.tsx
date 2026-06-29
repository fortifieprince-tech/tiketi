'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search, MapPin, ChevronDown } from 'lucide-react'
import Navbar from '@/components/Navbar'
import EventCard from '@/components/EventCard'
import { supabase } from '@/lib/supabase'
import { CATEGORIES } from '@/lib/events'

type CityFilter = 'Toutes' | 'Brazzaville' | 'Pointe-Noire'

// Type enrichi : étend l'événement avec les données de catégorie
type EventWithCats = any

export default function HomePage() {
  const [events, setEvents]   = useState<EventWithCats[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [cat, setCat]         = useState('Tous')
  const [city, setCity]       = useState<CityFilter>('Toutes')

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          ticket_categories ( price, capacity )
        `)
        .eq('archived', false)
        .order('created_at', { ascending: false })

      if (data) {
        const enriched = data.map((ev: any) => {
          const cats = ev.ticket_categories || []
          const hasCats = cats.length > 0
          return {
            ...ev,
            ticket_categories: cats,
            displayPrice: hasCats
              ? Math.min(...cats.map((c: any) => c.price))
              : ev.price,
            displayCapacity: hasCats
              ? cats.reduce((sum: number, c: any) => sum + c.capacity, 0)
              : ev.capacity,
          }
        })
        setEvents(enriched)
      } else {
        setEvents([])
      }
      setLoading(false)
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    return events.filter(e => {
      const matchCat    = cat === 'Tous' || e.category === cat
      const matchCity   = city === 'Toutes' || e.city === city
      const matchSearch = search === '' ||
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.venue.toLowerCase().includes(search.toLowerCase())
      return matchCat && matchCity && matchSearch
    })
  }, [events, search, cat, city])

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <section className="relative bg-brand-900 overflow-hidden">
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 text-center">
          <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-xs font-semibold text-blue-200 mb-5">
            <MapPin className="w-3 h-3" /> Brazzaville · Pointe-Noire
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight mb-4">
            Vos billets pour les meilleurs<br />
            <span className="text-blue-300">événements du Congo</span>
          </h1>
          <p className="text-blue-200 text-base max-w-lg mx-auto mb-8 leading-relaxed">
            Réservez en quelques clics. Payez par MTN Money ou Airtel Money. Recevez votre QR code instantanément.
          </p>
          <div className="max-w-xl mx-auto flex items-center gap-3 bg-white/10 border border-white/20 rounded-2xl px-4 py-2">
            <Search className="w-5 h-5 text-blue-300 flex-shrink-0" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Chercher un concert, match, soirée..."
              className="flex-1 bg-transparent border-none outline-none text-white text-sm placeholder-blue-300/70 font-medium"
            />
          </div>
          <div className="flex justify-center gap-8 mt-10 pt-8 border-t border-white/10">
            {[
              { num: events.length + '+', label: 'Événements actifs' },
              { num: events.reduce((s, e) => s + e.sold, 0).toLocaleString('fr-FR'), label: 'Billets vendus' },
              { num: '200+', label: 'Organisateurs' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-xl sm:text-2xl font-extrabold text-white">{s.num}</div>
                <div className="text-xs text-blue-300 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        <svg viewBox="0 0 1440 48" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-10 -mb-px">
          <path d="M0,48 L0,20 Q360,48 720,20 Q1080,-8 1440,20 L1440,48 Z" fill="#f8fafc" />
        </svg>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-8">
          <div className="flex items-center gap-2 flex-wrap">
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
                  cat === c
                    ? 'bg-brand-600 border-brand-600 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >{c}</button>
            ))}
          </div>
          <div className="sm:ml-auto relative">
            <select
              value={city}
              onChange={e => setCity(e.target.value as CityFilter)}
              className="appearance-none pl-4 pr-9 py-2 bg-white border border-slate-200 rounded-full text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
            >
              <option value="Toutes">Toutes les villes</option>
              <option value="Brazzaville">Brazzaville</option>
              <option value="Pointe-Noire">Pointe-Noire</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="card overflow-hidden animate-pulse">
                <div className="h-40 bg-slate-200" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                  <div className="h-8 bg-slate-200 rounded-xl mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🎟️</div>
            <h3 className="text-lg font-bold text-slate-700 mb-2">Aucun événement trouvé</h3>
            <p className="text-sm text-slate-500">Essayez d'autres filtres.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((event: any) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>

      <section className="bg-brand-900 relative overflow-hidden mt-8">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <h2 className="text-2xl font-extrabold text-white mb-2">Vous organisez un événement ?</h2>
          <p className="text-blue-200 text-sm mb-6 max-w-md mx-auto">Créez votre billetterie en quelques minutes.</p>
          <div className="flex justify-center gap-3 flex-wrap">
            <a href="/admin/register" className="bg-white text-brand-700 font-bold text-sm px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors">Créer mon événement</a>
            <a href="/admin/login" className="bg-transparent border border-white/30 text-white font-bold text-sm px-6 py-3 rounded-xl hover:bg-white/10 transition-colors">Se connecter</a>
          </div>
        </div>
      </section>

      <footer className="bg-white border-t border-slate-200 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-400">
          © 2026 Tiketi · Brazzaville, République du Congo
        </div>
      </footer>
    </div>
  )
}