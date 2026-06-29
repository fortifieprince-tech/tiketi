'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Ticket, LogOut, Plus, Users, DollarSign,
  Calendar, MapPin, Pencil, Trash2, Eye, X, CheckCircle2,
  TrendingUp, Clock, ShoppingBag, Phone, Mail, Hash,
  RefreshCw, ChevronDown, QrCode, Archive, RotateCw,
  Info,
} from 'lucide-react'
import { supabase, DBEvent, DBOrder } from '@/lib/supabase'
import { EventCategory } from '@/lib/events'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface ManagedEvent extends DBEvent {
  status: 'upcoming' | 'past'
  _realRevenue?: number
  archived?: boolean
}

const GRADIENTS = [
  { value: 'from-blue-600 to-indigo-700' },
  { value: 'from-emerald-500 to-teal-700' },
  { value: 'from-orange-500 to-red-600' },
  { value: 'from-pink-500 to-rose-700' },
  { value: 'from-cyan-500 to-blue-700' },
  { value: 'from-violet-500 to-indigo-700' },
]
const ICONS = ['🎵','⚽','🎭','🎉','🎤','🏆','🎆','🎨','🎸','🏀','🎬','🎺']
const EMPTY_FORM = {
  title: '', date: '', time: '', venue: '',
  city: 'Brazzaville' as 'Brazzaville' | 'Pointe-Noire',
  category: 'Concert' as EventCategory,
  price: '', capacity: '', description: '',
  gradient: GRADIENTS[0].value, icon: '🎵',
  image_url: '',
}

interface OrderWithEvent extends DBOrder {
  event_title?: string
  event_icon?: string
}

interface CategoryForm {
  id?: string
  name: string
  price: string
  capacity: string
}

const numberFormat = new Intl.NumberFormat('fr-FR')
const dateFormat = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

export default function DashboardPage() {
  const [tab, setTab] = useState<'events' | 'orders'>('events')
  const [events, setEvents] = useState<ManagedEvent[]>([])
  const [orders, setOrders] = useState<OrderWithEvent[]>([])
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [modal, setModal] = useState<'create' | 'edit' | 'delete' | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'paid' | 'cancelled'>('all')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [orgName, setOrgName] = useState('Organisateur')
  const [userId, setUserId] = useState<string | null>(null)
  const [categories, setCategories] = useState<CategoryForm[]>([])

  const [showArchived, setShowArchived] = useState(false)

  // ===== GAINS (calculés en direct) =====
  const [earnings, setEarnings] = useState<any[]>([])
  const [loadingEarnings, setLoadingEarnings] = useState(false)
  const [calculating, setCalculating] = useState(false)

  // Nettoyage toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  useEffect(() => {
    loadEvents(false)
  }, [])

  useEffect(() => {
    if (tab === 'orders') loadOrders()
  }, [tab])

  useEffect(() => {
    if (userId) {
      loadLiveEarnings()
    }
  }, [userId])

  // ---- LOAD EVENTS ----
  async function loadEvents(includeArchived: boolean) {
    setLoadingEvents(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/admin/login'
        return
      }
      setUserId(user.id)

      const { data: profile } = await supabase
        .from('organizers')
        .select('org_name')
        .eq('id', user.id)
        .single()
      if (profile) setOrgName(profile.org_name)

      let query = supabase
        .from('events')
        .select('*')
        .eq('organizer_id', user.id)
        .order('created_at', { ascending: false })

      if (!includeArchived) {
        query = query.eq('archived', false)
      }

      const { data } = await query

      if (data) {
        const eventIds = data.map(e => e.id)
        const { data: allCats } = await supabase
          .from('ticket_categories')
          .select('event_id, price, sold, capacity')
          .in('event_id', eventIds)

        const catsByEvent = (allCats || []).reduce((acc, cat) => {
          acc[cat.event_id] = acc[cat.event_id] || []
          acc[cat.event_id].push(cat)
          return acc
        }, {} as Record<string, any[]>)

        const eventsWithRealStats = data.map(ev => {
          const cats = catsByEvent[ev.id] || []
          if (cats.length > 0) {
            const totalSold = cats.reduce((s, c) => s + c.sold, 0)
            const totalCapacity = cats.reduce((s, c) => s + c.capacity, 0)
            const totalRevenue = cats.reduce((s, c) => s + c.price * c.sold, 0)
            return {
              ...ev,
              sold: totalSold,
              capacity: totalCapacity,
              _realRevenue: totalRevenue,
              status: 'upcoming' as const,
              archived: ev.archived ?? false,
            }
          }
          return {
            ...ev,
            _realRevenue: ev.price * ev.sold,
            status: 'upcoming' as const,
            archived: ev.archived ?? false,
          }
        })

        setEvents(eventsWithRealStats)
      }
    } catch (error) {
      console.error('Erreur chargement événements:', error)
      showToast('Erreur de chargement des événements')
    } finally {
      setLoadingEvents(false)
    }
  }

  // ---- LOAD ORDERS ----
  async function loadOrders() {
    if (!userId) return
    setLoadingOrders(true)
    try {
      const { data: eventsData } = await supabase
        .from('events')
        .select('id')
        .eq('organizer_id', userId)

      if (!eventsData || eventsData.length === 0) {
        setOrders([])
        setLoadingOrders(false)
        return
      }

      const eventIds = eventsData.map(e => e.id)

      const { data } = await supabase
        .from('orders')
        .select('*, events(title, icon)')
        .in('event_id', eventIds)
        .order('created_at', { ascending: false })

      if (data) {
        setOrders(data.map((o: any) => ({
          ...o,
          event_title: o.events?.title,
          event_icon:  o.events?.icon,
        })))
      }
    } catch (error) {
      console.error('Erreur chargement commandes:', error)
      showToast('Erreur de chargement des commandes')
    } finally {
      setLoadingOrders(false)
    }
  }

  // ---- CALCULER LES GAINS EN DIRECT ----
  async function loadLiveEarnings() {
    if (!userId) return
    setLoadingEarnings(true)
    try {
      // Récupérer le taux de commission de l'organisateur
      const { data: organizer } = await supabase
        .from('organizers')
        .select('commission_rate')
        .eq('id', userId)
        .single()

      const commissionRate = organizer?.commission_rate ?? 8 // 8% par défaut

      // Récupérer tous les événements avec leurs commandes
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select(`
          id,
          title,
          date,
          price,
          orders ( total_price, status )
        `)
        .eq('organizer_id', userId)
        .eq('archived', false)

      if (eventsError) throw eventsError
      if (!eventsData || eventsData.length === 0) {
        setEarnings([])
        setLoadingEarnings(false)
        return
      }

      const parseFrenchDate = (dateStr: string): Date | null => {
        if (!dateStr) return null
        const mois: Record<string, number> = {
          'janvier': 0, 'février': 1, 'mars': 2, 'avril': 3,
          'mai': 4, 'juin': 5, 'juillet': 6, 'août': 7,
          'septembre': 8, 'octobre': 9, 'novembre': 10, 'décembre': 11
        }
        const parts = dateStr.trim().split(' ')
        if (parts.length !== 3) return null
        const day = parseInt(parts[0])
        const month = mois[parts[1].toLowerCase()]
        const year = parseInt(parts[2])
        if (isNaN(day) || month === undefined || isNaN(year)) return null
        return new Date(year, month, day)
      }

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const liveEarnings = eventsData
        .filter(ev => {
          const eventDate = parseFrenchDate(ev.date)
          return eventDate && eventDate < today
        })
        .map(ev => {
          const paidOrders = ev.orders?.filter((o: any) => o.status === 'paid') || []
          const totalSales = paidOrders.reduce((sum: number, o: any) => sum + o.total_price, 0)
          const yabetooFee = Math.round(totalSales * 0.05)
          const platformFee = Math.round(totalSales * (commissionRate / 100))
          const netAmount = totalSales - yabetooFee - platformFee
          const pricePerTicket = ev.price || 0
          const ticketCount = pricePerTicket > 0 ? Math.round(totalSales / pricePerTicket) : 0

          return {
            id: ev.id,
            event_id: ev.id,
            events: { title: ev.title, date: ev.date, price: ev.price },
            total_sales: totalSales,
            yabetoo_fee: yabetooFee,
            platform_fee: platformFee,
            net_amount: netAmount,
            ticketCount: ticketCount
          }
        })
        .filter(e => e.total_sales > 0)

      setEarnings(liveEarnings)
    } catch (error) {
      console.error('Erreur chargement gains:', error)
      showToast('Erreur de chargement des gains')
    } finally {
      setLoadingEarnings(false)
    }
  }

  // ---- GÉNÉRER LE PDF DE RÉCAPITULATIF ----
  function generateEarningsPDF(item: any) {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    
    // En-tête
    doc.setFontSize(20)
    doc.setTextColor('#1A2B4C')
    doc.text('TIKETI', pageWidth / 2, 20, { align: 'center' })
    
    doc.setFontSize(10)
    doc.setTextColor('#94A3B8')
    doc.text('Brazzaville · Congo', pageWidth / 2, 28, { align: 'center' })
    
    doc.setDrawColor('#E2E8F0')
    doc.line(20, 33, pageWidth - 20, 33)
    
    // Infos événement
    doc.setFontSize(14)
    doc.setTextColor('#0F172A')
    doc.setFont('helvetica', 'bold')
    doc.text(item.events?.title || 'Événement', 20, 45)
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor('#475569')
    doc.text(`Date : ${item.events?.date || ''}`, 20, 55)
    
    // Tableau des gains
    autoTable(doc, {
      startY: 65,
      head: [['Description', 'Montant']],
      body: [
        ['Total des ventes (brut)', `${item.total_sales.toLocaleString('fr-FR')} XAF`],
        ['Frais Yabetoo (5%)', `${item.yabetoo_fee.toLocaleString('fr-FR')} XAF`],
        ['Commission Tiketi', `${item.platform_fee.toLocaleString('fr-FR')} XAF`],
        ['', ''],
        ['Net à reverser', `${item.net_amount.toLocaleString('fr-FR')} XAF`],
      ],
      theme: 'striped',
      headStyles: { fillColor: '#1A2B4C', textColor: '#FFFFFF' },
      bodyStyles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 60, halign: 'right' },
      },
      didDrawCell: (data: any) => {
        if (data.row.index === 4 && data.column.index === 0) {
          doc.setFont('helvetica', 'bold')
          doc.setTextColor('#E85D04')
        }
        if (data.row.index === 4 && data.column.index === 1) {
          doc.setFont('helvetica', 'bold')
          doc.setTextColor('#E85D04')
        }
      },
    })
    
    // Pied de page
    const finalY = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(8)
    doc.setTextColor('#CBD5E1')
    doc.text(
      'Ce document fait office de justificatif de gains.',
      pageWidth / 2,
      finalY + 10,
      { align: 'center' }
    )
    doc.text(
      `Généré le ${new Date().toLocaleDateString('fr-FR')}`,
      pageWidth / 2,
      finalY + 16,
      { align: 'center' }
    )
    
    doc.save(`Gains_${item.events?.title || 'evenement'}.pdf`)
  }

  // ---- FORCER LE RAFRAÎCHISSEMENT ----
  async function handleRefreshEarnings() {
    if (calculating) return
    setCalculating(true)
    await loadLiveEarnings()
    setCalculating(false)
    showToast('💰 Gains actualisés !')
  }

  // ---- LOAD CATEGORIES ----
  async function loadCategories(eventId: string) {
    try {
      const { data } = await supabase
        .from('ticket_categories')
        .select('*')
        .eq('event_id', eventId)
      if (data) {
        setCategories(data.map(c => ({
          id: c.id, name: c.name, price: String(c.price), capacity: String(c.capacity),
        })))
      }
    } catch (error) {
      console.error('Erreur chargement catégories:', error)
    }
  }

  // ---- CATEGORY HELPERS ----
  function addCategory() {
    setCategories(prev => [...prev, { name: '', price: '', capacity: '' }])
  }

  function updateCategory(index: number, field: string, value: string) {
    setCategories(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c))
  }

  function removeCategory(index: number) {
    setCategories(prev => prev.filter((_, i) => i !== index))
  }

  // ---- LOGOUT ----
  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/admin/login'
  }

  // ---- IMAGE UPLOAD ----
  async function handleImageUpload(file: File): Promise<string> {
    const ext = file.name.split('.').pop()
    const filename = `event-${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage
      .from('events')
      .upload(filename, file, { upsert: true, cacheControl: '3600' })
    if (error) throw new Error(error.message)
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/events/${filename}`
  }

  // ---- UPDATE ORDER STATUS ----
  async function updateOrderStatus(orderId: string, status: 'paid' | 'cancelled') {
    try {
      await supabase.from('orders').update({ status }).eq('id', orderId)
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
      showToast(status === 'paid' ? 'Commande marquée comme payée ✓' : 'Commande annulée')
    } catch (error) {
      console.error('Erreur mise à jour statut:', error)
      showToast('Erreur lors de la mise à jour')
    }
  }

  // ---- STATISTIQUES ----
  const activeEvents = events.filter(e => !e.archived)
  const totalRevenue = activeEvents.reduce((s, e) => s + (e._realRevenue ?? e.price * e.sold), 0)
  const totalSold    = activeEvents.reduce((s, e) => s + e.sold, 0)
  const upcoming     = activeEvents.filter(e => e.status === 'upcoming').length
  const totalCapacity = activeEvents.reduce((s, e) => s + e.capacity, 0)
  const fillRate     = totalCapacity > 0
    ? Math.round((totalSold / totalCapacity) * 100)
    : 0

  // ---- TOAST ----
  function showToast(msg: string) {
    setToast(msg)
  }

  // ---- MODAL OPEN/CLOSE ----
  function openCreate() {
    setForm(EMPTY_FORM)
    setImageFile(null)
    setImagePreview('')
    setCategories([])
    setModal('create')
  }

  function openEdit(id: string) {
    const ev = events.find(e => e.id === id)!
    setForm({
      title: ev.title, date: ev.date, time: ev.time,
      venue: ev.venue, city: ev.city, category: ev.category as EventCategory,
      price: String(ev.price), capacity: String(ev.capacity),
      description: ev.description ?? '', gradient: ev.gradient, icon: ev.icon,
      image_url: ev.image_url ?? '',
    })
    setImageFile(null)
    setImagePreview(ev.image_url ?? '')
    setSelectedId(id)
    loadCategories(id)
    setModal('edit')
  }

  function openDelete(id: string) { setSelectedId(id); setModal('delete') }

  // ---- ARCHIVER ----
  async function archiveEvent(id: string) {
    try {
      const { error } = await supabase
        .from('events')
        .update({ archived: true })
        .eq('id', id)
      if (error) throw error

      await loadEvents(showArchived)
      showToast('Événement archivé.')
    } catch (error) {
      console.error('Erreur archivage:', error)
      showToast('Erreur lors de l\'archivage')
    }
  }

  // ---- RESTAURER ----
  async function restoreEvent(id: string) {
    try {
      const { error } = await supabase
        .from('events')
        .update({ archived: false })
        .eq('id', id)
      if (error) throw error

      await loadEvents(showArchived)
      showToast('Événement restauré.')
    } catch (error) {
      console.error('Erreur restauration:', error)
      showToast('Erreur lors de la restauration')
    }
  }

  // ---- DELETE ----
  async function confirmDelete() {
    if (!selectedId) return
    try {
      const { count, error: countError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', selectedId)

      if (countError) throw countError

      if (count && count > 0) {
        showToast('Impossible de supprimer : des commandes existent. Utilisez l\'archivage.')
        setModal(null)
        return
      }

      const { error } = await supabase.from('events').delete().eq('id', selectedId)
      if (error) throw error

      await loadEvents(showArchived)
      setModal(null)
      showToast('Événement supprimé.')
    } catch (error) {
      console.error('Erreur suppression:', error)
      showToast('Erreur lors de la suppression')
      setModal(null)
    }
  }

  // ---- SAVE (CREATE / EDIT) ----
  async function handleSave() {
    if (!form.title || !form.date || !form.venue) {
      showToast('Veuillez remplir tous les champs obligatoires.')
      return
    }
    setSaving(true)

    let imageUrl = form.image_url
    if (imageFile) {
      setUploadingImage(true)
      try {
        imageUrl = await handleImageUpload(imageFile)
        setUploadingImage(false)
      } catch (error) {
        console.error('Erreur upload image:', error)
        showToast('Erreur upload image')
        setUploadingImage(false)
        setSaving(false)
        return
      }
    }

    try {
      let eventIdForCategories = selectedId

      const validCategories = categories.filter(c => c.name && c.price)
      const hasCategories = validCategories.length > 0

      const eventPrice = hasCategories ? 0 : Number(form.price) || 0
      const eventCapacity = hasCategories ? 0 : Number(form.capacity) || 100

      if (modal === 'create') {
        const { data: { user } } = await supabase.auth.getUser()
        const { data, error } = await supabase.from('events').insert({
          title: form.title,
          date: form.date,
          time: form.time || '20h00',
          venue: form.venue,
          city: form.city,
          category: form.category,
          price: eventPrice,
          capacity: eventCapacity,
          sold: 0,
          description: form.description,
          gradient: form.gradient,
          icon: form.icon,
          image_url: imageUrl || null,
          organizer_id: user?.id,
          archived: false,
        }).select().single()
        if (error) throw error
        if (data) {
          setEvents(prev => [{ ...data, status: 'upcoming', _realRevenue: data.price * data.sold, archived: false }, ...prev])
          eventIdForCategories = data.id
        }
        showToast('Événement créé !')
      } else {
        const { error } = await supabase.from('events').update({
          title: form.title,
          date: form.date,
          time: form.time,
          venue: form.venue,
          city: form.city,
          category: form.category,
          price: eventPrice,
          capacity: eventCapacity,
          description: form.description,
          gradient: form.gradient,
          icon: form.icon,
          image_url: imageUrl || null,
        }).eq('id', selectedId!)
        if (error) throw error

        setEvents(prev => prev.map(e => e.id === selectedId
          ? { ...e, ...form, price: eventPrice, capacity: eventCapacity, image_url: imageUrl, _realRevenue: eventPrice * e.sold }
          : e
        ))
        showToast('Événement mis à jour !')
      }

      if (eventIdForCategories) {
        await supabase.from('ticket_categories').delete().eq('event_id', eventIdForCategories)

        if (validCategories.length > 0) {
          const { error } = await supabase.from('ticket_categories').insert(
            validCategories.map(c => ({
              event_id: eventIdForCategories,
              name:     c.name,
              price:    Number(c.price),
              capacity: Number(c.capacity) || 100,
              sold:     0,
            }))
          )
          if (error) throw error
        }
      }

      setSaving(false)
      setModal(null)
      await loadEvents(showArchived)
    } catch (error) {
      console.error('Erreur sauvegarde:', error)
      showToast('Erreur lors de la sauvegarde')
      setSaving(false)
    }
  }

  function fc(field: string, value: string) { setForm(f => ({ ...f, [field]: value })) }

  const selectedEvent   = events.find(e => e.id === selectedId)
  const filteredOrders  = orderFilter === 'all' ? orders : orders.filter(o => o.status === orderFilter)

  const statusStyle = {
    pending:   'bg-amber-50 text-amber-700 border-amber-100',
    paid:      'bg-emerald-50 text-emerald-700 border-emerald-100',
    cancelled: 'bg-red-50 text-red-600 border-red-100',
  }
  const statusLabel = { pending: '⏳ En attente', paid: '✓ Payé', cancelled: '✗ Annulé' }

  return (
    <div className="min-h-screen bg-slate-50">

      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-slate-900 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />{toast}
        </div>
      )}

      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 h-16 flex items-center px-6 justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-brand-600 tracking-tight">
          <Ticket className="w-6 h-6" />
          <span>Tiketi</span>
        </Link>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-sm">
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-xs">
              {orgName.substring(0, 2).toUpperCase()}
            </div>
            <span className="font-semibold text-slate-700">{orgName}</span>
          </div>
          <Link
            href="/scanner"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-600 px-3 py-2 rounded-lg hover:bg-brand-50 transition-colors"
          >
            <QrCode className="w-3.5 h-3.5" /> Scanner
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-red-500 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Déconnexion
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Tableau de bord</h1>
            <p className="text-sm text-slate-500 mt-0.5">Bienvenue, {orgName} 👋</p>
          </div>
          <div className="flex items-center gap-2">
            {tab === 'events' && (
              <>
                <button
                  onClick={() => {
                    setShowArchived(!showArchived)
                    loadEvents(!showArchived)
                  }}
                  className={`btn-ghost flex items-center gap-2 text-xs ${showArchived ? 'bg-amber-50 text-amber-700 border-amber-200' : ''}`}
                >
                  <Archive className="w-3.5 h-3.5" />
                  {showArchived ? 'Masquer les archives' : 'Voir les archives'}
                </button>
                <button onClick={openCreate} className="btn-primary">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Nouvel événement</span>
                  <span className="sm:hidden">Créer</span>
                </button>
              </>
            )}
            {tab === 'orders' && (
              <button onClick={loadOrders} className="btn-ghost flex items-center gap-2 text-xs">
                <RefreshCw className="w-3.5 h-3.5" /> Actualiser
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Calendar,   label: 'Événements',     value: upcoming,                                   color: 'bg-brand-50 text-brand-600',    trend: 'actifs' },
            { icon: Users,      label: 'Billets vendus',  value: numberFormat.format(totalSold),             color: 'bg-emerald-50 text-emerald-600', trend: 'au total' },
            { icon: DollarSign, label: 'Revenus',         value: numberFormat.format(totalRevenue) + ' XAF', color: 'bg-amber-50 text-amber-600',  trend: 'générés' },
            { icon: TrendingUp, label: 'Remplissage',     value: fillRate + '%',                             color: 'bg-violet-50 text-violet-600',  trend: 'en moyenne' },
          ].map(stat => (
            <div key={stat.label} className="card p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${stat.color}`}>
                  <stat.icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-slate-500">{stat.label}</div>
                  <div className="text-lg font-extrabold text-slate-900 truncate">{stat.value}</div>
                  <div className="text-xs text-slate-400">{stat.trend}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setTab('events')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'events' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Calendar className="w-4 h-4" /> Événements
          </button>
          <button
            onClick={() => setTab('orders')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'orders' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <ShoppingBag className="w-4 h-4" /> Commandes
            {orders.filter(o => o.status === 'pending').length > 0 && (
              <span className="bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                {orders.filter(o => o.status === 'pending').length}
              </span>
            )}
          </button>
        </div>

        {/* ===== TABLEAU ÉVÉNEMENTS ===== */}
        {tab === 'events' && (
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-900">
                {showArchived ? 'Événements archivés' : 'Mes événements'}
              </h2>
              <span className="text-xs text-slate-400">{events.length} événements</span>
            </div>
            {loadingEvents ? (
              <div className="p-6 space-y-3">
                {[...Array(4)].map((_,i) => <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />)}
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-4xl mb-3">{showArchived ? '📦' : '🎟️'}</div>
                <p className="font-bold text-slate-700 mb-1">
                  {showArchived ? 'Aucun événement archivé' : 'Aucun événement'}
                </p>
                <p className="text-sm text-slate-400 mb-4">
                  {showArchived ? 'Les événements que vous archivez apparaîtront ici.' : 'Créez votre premier événement.'}
                </p>
                {!showArchived && (
                  <button onClick={openCreate} className="btn-primary text-xs"><Plus className="w-3.5 h-3.5" /> Créer</button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {['Événement','Date','Lieu','Billets','Revenus','Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {events.map(ev => {
                      const fill = ev.capacity > 0 ? Math.round((ev.sold / ev.capacity) * 100) : 0
                      const revenue = ev._realRevenue ?? ev.price * ev.sold
                      const hasOrders = orders.some(o => o.event_id === ev.id)
                      const isArchived = ev.archived === true

                      return (
                        <tr key={ev.id} className={`hover:bg-slate-50/60 transition-colors ${isArchived ? 'bg-slate-50/50 text-slate-500' : ''}`}>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 ${!ev.image_url ? `bg-gradient-to-br ${ev.gradient}` : ''} flex items-center justify-center`}>
                                {ev.image_url
                                  ? <img src={ev.image_url} alt="" className="w-full h-full object-cover" />
                                  : <span className="text-lg">{ev.icon}</span>
                                }
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-slate-800 line-clamp-1 max-w-[160px]">{ev.title}</div>
                                <div className="text-xs text-slate-400 flex items-center gap-1">
                                  {ev.category}
                                  {isArchived && <span className="ml-1 text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded text-[10px] font-medium">Archivé</span>}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-xs text-slate-600"><Calendar className="w-3.5 h-3.5 text-slate-400" />{ev.date}</div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5"><Clock className="w-3.5 h-3.5" />{ev.time}</div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1 text-xs text-slate-600"><MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" /><span className="truncate max-w-[120px]">{ev.venue}</span></div>
                            <div className="text-xs text-slate-400 mt-0.5 ml-4">{ev.city}</div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="text-xs font-semibold text-slate-700">{ev.sold} / {ev.capacity}</div>
                            <div className="w-20 h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                              <div className={`h-full rounded-full ${fill>=80?'bg-red-500':fill>=50?'bg-amber-500':'bg-brand-600'}`} style={{width:`${fill}%`}} />
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="text-sm font-bold text-brand-600">
                              {numberFormat.format(revenue)} XAF
                            </div>
                            <div className="text-xs text-slate-400">{numberFormat.format(ev.price)} XAF / billet</div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1">
                              <Link href={`/event/${ev.id}`} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"><Eye className="w-3.5 h-3.5" /></Link>
                              {!isArchived ? (
                                <button onClick={() => openEdit(ev.id)} className="w-8 h-8 rounded-lg hover:bg-brand-50 flex items-center justify-center text-slate-400 hover:text-brand-600 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                              ) : (
                                <span className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 cursor-not-allowed"><Pencil className="w-3.5 h-3.5" /></span>
                              )}
                              {!isArchived ? (
                                <button
                                  onClick={() => archiveEvent(ev.id)}
                                  className="w-8 h-8 rounded-lg hover:bg-amber-50 flex items-center justify-center text-slate-400 hover:text-amber-600 transition-colors"
                                  title="Archiver"
                                >
                                  <Archive className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => restoreEvent(ev.id)}
                                  className="w-8 h-8 rounded-lg hover:bg-emerald-50 flex items-center justify-center text-slate-400 hover:text-emerald-600 transition-colors"
                                  title="Restaurer"
                                >
                                  <RotateCw className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {!hasOrders && (
                                <button onClick={() => openDelete(ev.id)} className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ===== TABLEAU COMMANDES ===== */}
        {tab === 'orders' && (
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
              <h2 className="font-bold text-slate-900">Mes commandes</h2>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <select
                    value={orderFilter}
                    onChange={e => setOrderFilter(e.target.value as typeof orderFilter)}
                    className="appearance-none pl-3 pr-8 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                  >
                    <option value="all">Tous</option>
                    <option value="pending">En attente</option>
                    <option value="paid">Payés</option>
                    <option value="cancelled">Annulés</option>
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <span className="text-xs text-slate-400">{filteredOrders.length} commandes</span>
              </div>
            </div>
            {loadingOrders ? (
              <div className="p-6 space-y-3">
                {[...Array(5)].map((_,i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-4xl mb-3">📋</div>
                <p className="font-bold text-slate-700 mb-1">Aucune commande</p>
                <p className="text-sm text-slate-400">Les commandes apparaîtront ici dès qu'un billet sera acheté.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {['#','Client','Contact','Événement','Billets','Total','Statut','Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredOrders.map(order => (
                      <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1 text-xs font-mono text-slate-400">
                            <Hash className="w-3 h-3" />{order.qr_code}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {dateFormat.format(new Date(order.created_at))}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700 flex-shrink-0">
                              {order.first_name[0]}{order.last_name[0]}
                            </div>
                            <div className="text-sm font-semibold text-slate-800">{order.first_name} {order.last_name}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 text-xs text-slate-600"><Phone className="w-3 h-3 text-slate-400" />{order.whatsapp}</div>
                          {order.email && <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5"><Mail className="w-3 h-3" />{order.email}</div>}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2 text-xs text-slate-700">
                            <span className="text-base">{order.event_icon ?? '🎟️'}</span>
                            <span className="font-medium line-clamp-1 max-w-[140px]">{order.event_title ?? '—'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 text-sm font-bold text-slate-700">{order.quantity}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="text-sm font-bold text-brand-600">{numberFormat.format(order.total_price)} XAF</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${statusStyle[order.status as keyof typeof statusStyle]}`}>
                            {statusLabel[order.status as keyof typeof statusLabel]}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          {order.status === 'pending' ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => updateOrderStatus(order.id, 'paid')} className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg transition-colors">✓ Payé</button>
                              <button onClick={() => updateOrderStatus(order.id, 'cancelled')} className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-lg transition-colors">✗ Annuler</button>
                            </div>
                          ) : <span className="text-xs text-slate-400">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ===== SECTION GAINS AVEC PDF ===== */}
        <div className="card p-6 mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-brand-600" /> Mes gains
            </h2>
            <button
              onClick={handleRefreshEarnings}
              disabled={calculating}
              className="btn-primary text-sm disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${calculating ? 'animate-spin' : ''}`} />
              {calculating ? 'Actualisation...' : 'Actualiser'}
            </button>
          </div>

          {loadingEarnings ? (
            <div className="py-4 text-center text-slate-400">Chargement...</div>
          ) : earnings.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <div className="text-4xl mb-2">💰</div>
              <p>Aucun gain pour le moment.</p>
              <p className="text-xs">Les gains apparaissent après la fin de vos événements.</p>
              <p className="text-xs text-brand-600 mt-2">
                💡 Cliquez sur "Actualiser" pour mettre à jour les gains.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto mt-4">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Événement</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Ventes</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Brut</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Yabetoo (5%)</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Commission</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Net</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {earnings.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-3 py-3">
                          <div className="text-sm font-semibold text-slate-800">{item.events?.title || 'Événement'}</div>
                          <div className="text-xs text-slate-400">{item.events?.date || ''}</div>
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-600">{item.ticketCount || 0}</td>
                        <td className="px-3 py-3 text-sm font-semibold text-slate-800">{numberFormat.format(item.total_sales)} XAF</td>
                        <td className="px-3 py-3 text-sm text-slate-600">{numberFormat.format(item.yabetoo_fee)} XAF</td>
                        <td className="px-3 py-3 text-sm text-slate-600">{numberFormat.format(item.platform_fee)} XAF</td>
                        <td className="px-3 py-3 text-sm font-bold text-brand-600">{numberFormat.format(item.net_amount)} XAF</td>
                        <td className="px-3 py-3">
                          <button
                            onClick={() => generateEarningsPDF(item)}
                            className="text-brand-600 hover:text-brand-800 text-xs font-medium underline"
                          >
                            📄 PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total des gains */}
              <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                <div className="text-right">
                  <div className="text-xs text-slate-400">Total net à reverser</div>
                  <div className="text-xl font-extrabold text-brand-600">
                    {numberFormat.format(
                      earnings.reduce((sum, e) => sum + e.net_amount, 0)
                    )} XAF
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Instructions */}
          <div className="mt-6 p-4 bg-brand-50 rounded-xl border border-brand-100">
            <h4 className="font-semibold text-brand-700 text-sm flex items-center gap-2">
              <Info className="w-4 h-4" /> Comment être payé ?
            </h4>
            <ul className="text-xs text-slate-600 mt-2 space-y-1 list-disc list-inside">
              <li>Vérifie le montant net à reverser (colonne "Net").</li>
              <li>Envoie un message WhatsApp au <strong>+242 XX XXX XXXX</strong> avec :</li>
              <ul className="list-disc list-inside ml-4 text-slate-500">
                <li>Le nom de l'événement</li>
                <li>Le montant à reverser</li>
                <li>Ton numéro MTN ou Airtel Money</li>
              </ul>
              <li>Nous effectuons le virement sous <strong>48h</strong>.</li>
              <li>Le statut passe à "Payé" une fois le virement effectué.</li>
            </ul>
          </div>
        </div>

      </main>

      {/* Modals existants (create, edit, delete) - inchangés */}
      {(modal === 'create' || modal === 'edit') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(15,23,42,0.5)'}}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center"><Ticket className="w-5 h-5 text-brand-600" /></div>
                <h3 className="font-bold text-slate-900">{modal === 'create' ? 'Nouvel événement' : "Modifier l'événement"}</h3>
              </div>
              <button onClick={() => setModal(null)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* ... tout le formulaire est identique ... */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Titre *</label>
                <input value={form.title} onChange={e=>fc('title',e.target.value)} placeholder="Concert Afrobeat — Brazzaville" className="input-field" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Date *</label>
                  <input value={form.date} onChange={e=>fc('date',e.target.value)} placeholder="14 juin 2025" className="input-field" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Heure</label>
                  <input value={form.time} onChange={e=>fc('time',e.target.value)} placeholder="20h00" className="input-field" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Lieu *</label>
                  <input value={form.venue} onChange={e=>fc('venue',e.target.value)} placeholder="Espace Tati" className="input-field" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Ville</label>
                  <select value={form.city} onChange={e=>fc('city',e.target.value)} className="input-field">
                    <option>Brazzaville</option>
                    <option>Pointe-Noire</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Catégorie</label>
                  <select value={form.category} onChange={e=>fc('category',e.target.value)} className="input-field">
                    {['Concert','Musique','Culture','Sport','Soirée'].map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Prix (XAF)</label>
                  <input type="number" value={form.price} onChange={e=>fc('price',e.target.value)} placeholder="5000" min="0" className="input-field" />
                  <p className="text-xs text-slate-400 mt-1">Ignoré si catégories VIP ajoutées</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Capacité</label>
                  <input type="number" value={form.capacity} onChange={e=>fc('capacity',e.target.value)} placeholder="200" min="1" className="input-field" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description</label>
                <textarea value={form.description} onChange={e=>fc('description',e.target.value)} placeholder="Décrivez votre événement..." rows={3} className="input-field resize-none" />
              </div>

              {/* Catégories VIP */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Catégories de billets <span className="text-slate-400 font-normal">(optionnel)</span>
                  </label>
                  <button
                    type="button"
                    onClick={addCategory}
                    className="text-xs text-brand-600 font-semibold hover:underline"
                  >
                    + Ajouter une catégorie
                  </button>
                </div>

                {categories.length === 0 ? (
                  <p className="text-xs text-slate-400 bg-slate-50 rounded-xl p-3 border border-slate-100">
                    Aucune catégorie — l'événement utilisera le prix unique défini plus haut.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2 text-xs text-slate-400 px-1">
                      <span className="flex-1">Nom</span>
                      <span className="w-24">Prix (XAF)</span>
                      <span className="w-20">Places</span>
                      <span className="w-6"></span>
                    </div>
                    {categories.map((cat, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          value={cat.name}
                          onChange={e => updateCategory(i, 'name', e.target.value)}
                          placeholder="VIP"
                          className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                        <input
                          type="number"
                          value={cat.price}
                          onChange={e => updateCategory(i, 'price', e.target.value)}
                          placeholder="15000"
                          className="w-24 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                        <input
                          type="number"
                          value={cat.capacity}
                          onChange={e => updateCategory(i, 'capacity', e.target.value)}
                          placeholder="50"
                          className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                        <button
                          type="button"
                          onClick={() => removeCategory(i)}
                          className="text-red-500 hover:bg-red-50 rounded-lg p-1.5 flex-shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Affiche de l'événement</label>
                <div
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${imagePreview ? 'border-brand-300 bg-brand-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                  onClick={() => document.getElementById('image-upload')?.click()}
                >
                  {imagePreview ? (
                    <div className="relative">
                      <img src={imagePreview} alt="Aperçu" className="w-full h-32 object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); setImageFile(null); setImagePreview(''); fc('image_url', '') }}
                        className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                      >✕</button>
                    </div>
                  ) : (
                    <div className="py-4">
                      <div className="text-2xl mb-2">🖼️</div>
                      <div className="text-xs font-semibold text-slate-600">Cliquez pour ajouter une affiche</div>
                      <div className="text-xs text-slate-400 mt-1">JPG, PNG — max 5MB</div>
                    </div>
                  )}
                </div>
                <input id="image-upload" type="file" accept="image/*" className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    setImageFile(file)
                    setImagePreview(URL.createObjectURL(file))
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Couleur bannière (si pas d'affiche)</label>
                <div className="grid grid-cols-3 gap-2">
                  {GRADIENTS.map(g=>(
                    <button key={g.value} type="button" onClick={()=>fc('gradient',g.value)}
                      className={`h-10 rounded-xl bg-gradient-to-br ${g.value} border-2 transition-all ${form.gradient===g.value?'border-slate-900 scale-95':'border-transparent'}`}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Icône (si pas d'affiche)</label>
                <div className="flex flex-wrap gap-2">
                  {ICONS.map(icon=>(
                    <button key={icon} type="button" onClick={()=>fc('icon',icon)}
                      className={`w-10 h-10 rounded-xl text-xl border-2 transition-all ${form.icon===icon?'border-brand-600 bg-brand-50':'border-slate-200 hover:border-slate-300'}`}
                    >{icon}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3 justify-end">
              <button onClick={()=>setModal(null)} className="btn-ghost">Annuler</button>
              <button onClick={handleSave} disabled={saving || uploadingImage} className="btn-primary disabled:opacity-60">
                {saving || uploadingImage
                  ? <span className="flex items-center gap-2"><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31" strokeDashoffset="10"/></svg>{uploadingImage ? 'Upload…' : 'Enregistrement…'}</span>
                  : modal==='create' ? "Créer l'événement" : 'Enregistrer'
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Delete */}
      {modal === 'delete' && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(15,23,42,0.5)'}}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 className="w-6 h-6 text-red-500" /></div>
            <h3 className="font-bold text-slate-900 text-lg mb-2">Supprimer cet événement ?</h3>
            <p className="text-sm text-slate-500 mb-6">
              <span className="font-semibold text-slate-700">«{selectedEvent.title}»</span> sera supprimé définitivement.
            </p>
            <div className="flex gap-3">
              <button onClick={()=>setModal(null)} className="btn-ghost flex-1">Annuler</button>
              <button onClick={confirmDelete} className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold text-sm rounded-xl transition-all">
                <Trash2 className="w-4 h-4" /> Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}