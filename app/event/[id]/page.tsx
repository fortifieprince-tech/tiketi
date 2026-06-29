'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft, Calendar, MapPin, Users, Clock,
  Minus, Plus, CheckCircle2, ShieldCheck, Smartphone,
} from 'lucide-react'
import Navbar from '@/components/Navbar'
import { supabase, DBEvent, DBTicketCategory } from '@/lib/supabase'

// Formateur stable pour l'hydratation
const numberFormat = new Intl.NumberFormat('fr-FR')
const dateFormat = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

export default function EventDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [event, setEvent]           = useState<DBEvent | null>(null)
  const [categories, setCategories] = useState<DBTicketCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState<DBTicketCategory | null>(null)
  const [loading, setLoading]       = useState(true)
  const [qty, setQty]               = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(false)
  const [qrCode, setQrCode]         = useState('')
  const [pdfUrl, setPdfUrl]         = useState('')
  const [error, setError]           = useState('')
  const [phone, setPhone]           = useState('')
  const [operator, setOperator]     = useState<'mtn' | 'airtel'>('mtn')
  const [form, setForm] = useState({
    firstName: '',
    lastName:  '',
    whatsapp:  '',
    email:     '',
  })

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('id', id)
          .single()
        if (error) throw error
        if (data) setEvent(data)

        const { data: cats, error: catsError } = await supabase
          .from('ticket_categories')
          .select('*')
          .eq('event_id', id)
          .order('price', { ascending: true })

        if (catsError) throw catsError

        if (cats && cats.length > 0) {
          setCategories(cats)
          setSelectedCategory(cats[0])
        }
      } catch (err) {
        console.error('Erreur chargement:', err)
        setError('Erreur de chargement des données')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  // Calcul de la capacité totale (somme des catégories ou capacité de l'événement)
  const totalCapacity = categories.length > 0
    ? categories.reduce((sum, c) => sum + c.capacity, 0)
    : (event?.capacity || 0)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const res = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId:     event!.id,
          categoryId:  selectedCategory?.id || null,
          firstName:   form.firstName,
          lastName:    form.lastName,
          whatsapp:    form.whatsapp,
          email:       form.email,
          quantity:    qty,
          totalPrice:  total,
          phone:       phone.replace(/\s/g, ''),
          operator:    operator,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setQrCode(data.qrCode)
        setPdfUrl(data.pdfUrl)
        setSubmitted(true)
      } else {
        setError(data.error || 'Une erreur est survenue.')
      }
    } catch (err) {
      console.error('Erreur paiement:', err)
      setError('Erreur de connexion au serveur')
    } finally {
      setSubmitting(false)
    }
  }

  const activePrice    = selectedCategory ? selectedCategory.price : (event?.price ?? 0)
  const activeCapacity = selectedCategory ? selectedCategory.capacity : (event?.capacity ?? 0)
  const activeSold     = selectedCategory ? selectedCategory.sold : (event?.sold ?? 0)
  const total          = activePrice * qty
  const fillPct        = activeCapacity > 0 ? Math.round((activeSold / activeCapacity) * 100) : 0
  const remaining      = activeCapacity - activeSold

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="h-52 sm:h-72 bg-slate-200 animate-pulse" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="card p-6 space-y-3 animate-pulse">
                <div className="h-5 bg-slate-200 rounded w-1/3" />
                <div className="h-4 bg-slate-100 rounded w-full" />
                <div className="h-4 bg-slate-100 rounded w-4/5" />
              </div>
            </div>
            <div className="card p-6 animate-pulse">
              <div className="h-8 bg-slate-200 rounded w-1/2 mb-4" />
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-10 bg-slate-100 rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-center px-4">
        <Navbar />
        <div className="text-6xl mb-4">🎟️</div>
        <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Événement introuvable</h1>
        <p className="text-slate-500 text-sm mb-6">Cet événement n'existe pas ou a été supprimé.</p>
        <Link href="/" className="btn-primary">Retour aux événements</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className={`relative h-52 sm:h-72 bg-gradient-to-br ${event.gradient} overflow-hidden`}>
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.2) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <Link
          href="/"
          className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-sm font-semibold px-3 py-2 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Retour
        </Link>
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 bg-white/20 backdrop-blur-sm border border-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-full">
          {event.category}
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8">
          <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight drop-shadow-sm">
            {event.title}
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <span className="flex items-center gap-1.5 text-white/80 text-xs">
              <Calendar className="w-3.5 h-3.5" />{event.date} · {event.time}
            </span>
            <span className="flex items-center gap-1.5 text-white/80 text-xs">
              <MapPin className="w-3.5 h-3.5" />{event.venue}, {event.city}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Colonne de gauche : description et informations */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6">
              <h2 className="font-bold text-slate-900 text-base mb-3">À propos de cet événement</h2>
              <p className="text-slate-600 text-sm leading-relaxed">{event.description}</p>
            </div>
            <div className="card p-6">
              <h2 className="font-bold text-slate-900 text-base mb-4">Informations</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { icon: Calendar, label: 'Date',     value: event.date },
                  { icon: Clock,    label: 'Heure',    value: event.time },
                  { icon: MapPin,   label: 'Lieu',     value: `${event.venue}, ${event.city}` },
                  // Utilisation de totalCapacity au lieu de event.capacity
                  { icon: Users,    label: 'Capacité', value: `${totalCapacity.toLocaleString('fr-FR')} personnes` },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-brand-600" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 font-medium">{label}</div>
                      <div className="text-sm font-semibold text-slate-800 mt-0.5">{value}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 pt-5 border-t border-slate-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-slate-600">{activeSold} billets vendus</span>
                  <span className="text-xs font-semibold text-slate-600">{remaining} places restantes</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${fillPct >= 80 ? 'bg-red-500' : fillPct >= 50 ? 'bg-amber-500' : 'bg-brand-600'}`}
                    style={{ width: `${Math.min(fillPct, 100)}%` }}
                  />
                </div>
                <div className="text-xs text-slate-400 mt-1.5">{fillPct}% des places réservées</div>
              </div>
            </div>
          </div>

          {/* Colonne de droite : formulaire de réservation */}
          <div className="lg:col-span-1">
            <div className="card p-6 sticky top-24">

              {submitted ? (
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-lg mb-1">Paiement confirmé ! 🎉</h3>
                  <p className="text-sm text-slate-500 mb-5">
                    Vos billets sont prêts. Téléchargez-les ou consultez votre email.
                  </p>

                  <div className="border-2 border-dashed border-brand-200 bg-brand-50 rounded-xl p-6 mb-4">
                    <div className="text-5xl mb-3">📄</div>
                    <div className="font-mono text-brand-700 font-bold text-sm tracking-widest mb-1">
                      {qrCode}
                    </div>
                    <div className="text-xs text-slate-400">
                      {qty} billet{qty > 1 ? 's' : ''} · {event.title}
                    </div>
                  </div>

                  {pdfUrl && (
                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary w-full mb-3"
                    >
                      📥 Télécharger mes billets PDF
                    </a>
                  )}

                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-5 text-xs text-amber-700 font-medium">
                    📧 Vos billets ont aussi été envoyés par email.
                  </div>

                  <Link href="/" className="btn-ghost w-full text-xs">
                    Retour aux événements
                  </Link>
                </div>

              ) : (
                <>
                  {/* Sélecteur de catégorie VIP */}
                  {categories.length > 0 && (
                    <div className="mb-5">
                      <label className="block text-xs font-semibold text-slate-700 mb-2">
                        Choisissez votre catégorie
                      </label>
                      <div className="space-y-2">
                        {categories.map(cat => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setSelectedCategory(cat)}
                            className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                              selectedCategory?.id === cat.id
                                ? 'border-brand-600 bg-brand-50'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                          >
                            <div className="text-left">
                              <div className="text-sm font-bold text-slate-900">{cat.name}</div>
                              <div className="text-xs text-slate-400">{cat.capacity - cat.sold} places restantes</div>
                            </div>
                            <div className="text-sm font-extrabold text-brand-600">
                              {numberFormat.format(cat.price)} XAF
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-baseline justify-between mb-5">
                    <div>
                      <div className="text-xs text-slate-400 font-medium mb-0.5">
                        Prix {selectedCategory ? `(${selectedCategory.name})` : 'par billet'}
                      </div>
                      <div className="text-2xl font-extrabold text-brand-600">
                        {activePrice === 0 ? 'Gratuit' : numberFormat.format(activePrice) + ' XAF'}
                      </div>
                    </div>
                    {remaining < 50 && (
                      <div className="bg-red-50 text-red-600 text-xs font-bold px-2.5 py-1 rounded-full border border-red-100">
                        {remaining} restants !
                      </div>
                    )}
                  </div>

                  {activePrice > 0 && (
                    <div className="mb-5">
                      <label className="block text-xs font-semibold text-slate-700 mb-2">
                        Nombre de billets
                      </label>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setQty(q => Math.max(1, q - 1))}
                          disabled={qty <= 1}
                          className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center transition-colors disabled:opacity-40"
                        >
                          <Minus className="w-4 h-4 text-slate-600" />
                        </button>
                        <span className="w-10 text-center font-extrabold text-slate-900 text-lg">{qty}</span>
                        <button
                          onClick={() => setQty(q => Math.min(remaining, q + 1))}
                          disabled={qty >= remaining}
                          className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center transition-colors disabled:opacity-40"
                        >
                          <Plus className="w-4 h-4 text-slate-600" />
                        </button>
                        <div className="flex-1 text-right">
                          <div className="text-xs text-slate-400">Total</div>
                          <div className="font-extrabold text-slate-900 text-base">
                            {numberFormat.format(total)} XAF
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-3">

                    {error && (
                      <div className="bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl p-3">
                        {error}
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Prénom *</label>
                      <input
                        name="firstName"
                        value={form.firstName}
                        onChange={handleChange}
                        placeholder="Jean-Pierre"
                        required
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nom *</label>
                      <input
                        name="lastName"
                        value={form.lastName}
                        onChange={handleChange}
                        placeholder="Moukouri"
                        required
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        <span className="flex items-center gap-1">
                          <Smartphone className="w-3 h-3" /> WhatsApp *
                        </span>
                      </label>
                      <input
                        name="whatsapp"
                        value={form.whatsapp}
                        onChange={handleChange}
                        placeholder="+242 06 000 0000"
                        required
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="jean@exemple.com"
                        required
                        className="input-field"
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        Votre billet PDF sera envoyé à cette adresse
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-2">
                        Opérateur Mobile Money *
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { value: 'mtn',    label: 'MTN Money',    color: 'border-amber-400 bg-amber-50 text-amber-700' },
                          { value: 'airtel', label: 'Airtel Money', color: 'border-red-400 bg-red-50 text-red-700' },
                        ].map(op => (
                          <button
                            key={op.value}
                            type="button"
                            onClick={() => setOperator(op.value as 'mtn' | 'airtel')}
                            className={`py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${
                              operator === op.value ? op.color : 'border-slate-200 bg-white text-slate-500'
                            }`}
                          >
                            {op.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Numéro {operator === 'mtn' ? 'MTN' : 'Airtel'} Money *
                      </label>
                      <input
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="242066000000"
                        required
                        className="input-field"
                      />
                      <p className="text-xs text-slate-400 mt-1">Format : 242 suivi du numéro</p>
                    </div>

                    {activePrice > 0 && (
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span>{qty} × {numberFormat.format(activePrice)} XAF</span>
                          <span>Sous-total</span>
                        </div>
                        <div className="flex justify-between font-extrabold text-slate-900 text-sm">
                          <span>Total à payer</span>
                          <span className="text-brand-600">{numberFormat.format(total)} XAF</span>
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn-success w-full mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <span className="flex items-center gap-2 justify-center">
                          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31" strokeDashoffset="10" />
                          </svg>
                          Traitement du paiement…
                        </span>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          {activePrice === 0
                            ? 'Réserver gratuitement'
                            : `Payer ${numberFormat.format(total)} XAF`
                          }
                        </>
                      )}
                    </button>
                  </form>

                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="text-xs text-slate-400 text-center mb-3 font-medium">
                      Moyens de paiement acceptés
                    </div>
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      {[
                        { label: 'MTN Money',    color: 'text-amber-700 bg-amber-50 border-amber-100' },
                        { label: 'Airtel Money', color: 'text-red-700 bg-red-50 border-red-100' },
                        { label: 'Visa',         color: 'text-blue-700 bg-blue-50 border-blue-100' },
                      ].map(p => (
                        <div key={p.label} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-bold ${p.color}`}>
                          <ShieldCheck className="w-3 h-3" />{p.label}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-center gap-1 mt-3 text-xs text-slate-400">
                      <ShieldCheck className="w-3 h-3 text-emerald-500" />
                      Paiement 100% sécurisé via Yabetoopay
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}