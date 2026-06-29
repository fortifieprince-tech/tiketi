'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Ticket, Mail, Lock, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function AdminLoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError('Email ou mot de passe incorrect.')
      setLoading(false)
      return
    }

    window.location.href = '/admin/dashboard'
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 h-16 flex items-center px-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-brand-600 tracking-tight">
          <Ticket className="w-6 h-6" />
          <span>Tiketi</span>
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="card p-8">
            <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Ticket className="w-7 h-7 text-brand-600" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 text-center tracking-tight mb-1">
              Espace organisateur
            </h1>
            <p className="text-sm text-slate-500 text-center mb-7">
              Connectez-vous pour gérer vos événements
            </p>

            {error && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-xl p-3.5 mb-5">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Adresse email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    required
                    className="input-field pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Mot de passe</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="input-field pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="text-right mt-1.5">
                  <a className="text-xs text-brand-600 hover:underline cursor-pointer">Mot de passe oublié ?</a>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full mt-2 disabled:opacity-60"
              >
                {loading ? (
                  <span className="flex items-center gap-2 justify-center">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31" strokeDashoffset="10" />
                    </svg>
                    Connexion…
                  </span>
                ) : (
                  <><LogIn className="w-4 h-4" /> Se connecter</>
                )}
              </button>
            </form>

            <p className="text-center text-xs text-slate-500 mt-5">
              Pas encore de compte ?{' '}
              <Link href="/admin/register" className="text-brand-600 font-semibold hover:underline">
                Créer un compte organisateur
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}