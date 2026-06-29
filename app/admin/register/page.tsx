'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Ticket, Building2, Mail, Lock, Eye, EyeOff, UserPlus, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function AdminRegisterPage() {
  const [form, setForm] = useState({ orgName: '', email: '', password: '', confirm: '' })
  const [showPwd, setShowPwd]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [done, setDone]         = useState(false)
  const [errors, setErrors]     = useState<any>({})

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setErrors((er: any) => ({ ...er, [e.target.name]: '' }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const newErrors: any = {}
    if (!form.orgName.trim()) newErrors.orgName = "Nom de l'organisation requis"
    if (!form.email.includes('@')) newErrors.email = 'Adresse email invalide'
    if (form.password.length < 8) newErrors.password = 'Minimum 8 caractères'
    if (form.password !== form.confirm) newErrors.confirm = 'Les mots de passe ne correspondent pas'
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }

    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email:    form.email,
      password: form.password,
    })

    if (signUpError) {
      setErrors({ global: signUpError.message })
      setLoading(false)
      return
    }

    if (data.user) {
      const { error: profileError } = await supabase
        .from('organizers')
        .insert({
          id:       data.user.id,
          email:    form.email,
          org_name: form.orgName,
        })

      if (profileError) {
        setErrors({ global: profileError.message })
        setLoading(false)
        return
      }
    }

    setLoading(false)
    setDone(true)
  }

  const passwordStrength = (pwd: string) => {
    if (!pwd) return null
    if (pwd.length < 6) return { label: 'Faible', color: 'bg-red-400', w: 'w-1/4' }
    if (pwd.length < 8) return { label: 'Moyen', color: 'bg-amber-400', w: 'w-2/4' }
    if (pwd.length < 12 || !/[0-9]/.test(pwd)) return { label: 'Bien', color: 'bg-blue-500', w: 'w-3/4' }
    return { label: 'Fort', color: 'bg-emerald-500', w: 'w-full' }
  }
  const strength = passwordStrength(form.password)

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
            {done ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 mb-2">Compte créé !</h2>
                <p className="text-sm text-slate-500 mb-6">
                  Votre compte organisateur a été créé avec succès.
                </p>
                <Link href="/admin/login" className="btn-primary w-full">
                  Se connecter
                </Link>
              </div>
            ) : (
              <>
                <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <UserPlus className="w-7 h-7 text-brand-600" />
                </div>
                <h1 className="text-2xl font-extrabold text-slate-900 text-center tracking-tight mb-1">
                  Créer un compte
                </h1>
                <p className="text-sm text-slate-500 text-center mb-7">
                  Commencez à vendre des billets en quelques minutes
                </p>

                {errors.global && (
                  <div className="bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl p-3 mb-4">
                    {errors.global}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Nom de l'organisation *
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        name="orgName"
                        value={form.orgName}
                        onChange={handleChange}
                        placeholder="Association, entreprise, artiste..."
                        required
                        className={`input-field pl-10 ${errors.orgName ? 'border-red-400' : ''}`}
                      />
                    </div>
                    {errors.orgName && <p className="text-xs text-red-500 mt-1">{errors.orgName}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Adresse email *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="contact@organisation.cg"
                        required
                        className={`input-field pl-10 ${errors.email ? 'border-red-400' : ''}`}
                      />
                    </div>
                    {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Mot de passe *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        name="password"
                        type={showPwd ? 'text' : 'password'}
                        value={form.password}
                        onChange={handleChange}
                        placeholder="Minimum 8 caractères"
                        required
                        className={`input-field pl-10 pr-10 ${errors.password ? 'border-red-400' : ''}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd(v => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                      >
                        {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {form.password && strength && (
                      <div className="mt-2">
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${strength.color} ${strength.w} rounded-full transition-all`} />
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          Sécurité : <span className="font-semibold">{strength.label}</span>
                        </div>
                      </div>
                    )}
                    {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Confirmer le mot de passe *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        name="confirm"
                        type={showPwd ? 'text' : 'password'}
                        value={form.confirm}
                        onChange={handleChange}
                        placeholder="Répétez le mot de passe"
                        required
                        className={`input-field pl-10 ${errors.confirm ? 'border-red-400' : ''}`}
                      />
                      {form.confirm && form.confirm === form.password && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                      )}
                    </div>
                    {errors.confirm && <p className="text-xs text-red-500 mt-1">{errors.confirm}</p>}
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
                        Création du compte…
                      </span>
                    ) : (
                      <><UserPlus className="w-4 h-4" /> Créer mon compte</>
                    )}
                  </button>

                  <p className="text-center text-xs text-slate-500">
                    En créant un compte, vous acceptez nos{' '}
                    <a className="text-brand-600 hover:underline cursor-pointer">CGU</a>
                  </p>
                </form>

                <p className="text-center text-xs text-slate-500 mt-5">
                  Déjà un compte ?{' '}
                  <Link href="/admin/login" className="text-brand-600 font-semibold hover:underline">
                    Se connecter
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}