'use client'

import Link from 'next/link'
import { Ticket, LogOut, QrCode } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'

export default function Navbar() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser()
      setUser(data?.user ?? null)
      setLoading(false)
    }
    getUser()

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => authListener?.subscription.unsubscribe()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    setUser(null)
    window.location.href = '/'
  }

  if (loading) {
    return (
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 h-20 flex items-center px-6 justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-200 animate-pulse" />
          <div className="flex flex-col gap-1">
            <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
            <div className="h-3 w-32 bg-slate-100 rounded animate-pulse" />
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 h-20 flex items-center px-6 justify-between">
      <Link
        href="/"
        className="flex items-center gap-3 transition-transform duration-300 hover:scale-105 group"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow">
          <Ticket className="w-5 h-5 text-white" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="font-extrabold text-brand-600 text-lg sm:text-xl tracking-tight group-hover:text-brand-700 transition-colors">
            TIKETI
          </span>
          <span className="text-[10px] sm:text-xs text-slate-400 group-hover:text-slate-600 transition-colors">
            Brazzaville · Congo
          </span>
        </div>
      </Link>

      <div className="flex items-center gap-3">
        {user ? (
          <>
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
          </>
        ) : (
          <Link
            href="/admin/login"
            className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 px-3 py-2 rounded-lg hover:bg-brand-50 transition-colors"
          >
            <Ticket className="w-3.5 h-3.5" /> Espace organisateur
          </Link>
        )}
      </div>
    </header>
  )
}