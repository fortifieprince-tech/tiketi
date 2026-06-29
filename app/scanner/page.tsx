'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  Ticket, QrCode, Keyboard,
  CheckCircle2, XCircle, RefreshCw, Lock,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

type ScanResult = {
  status: 'valid' | 'already_used' | 'invalid'
  firstName?: string
  lastName?: string
  eventTitle?: string
  quantity?: number
  qrCode?: string
}

export default function ScannerPage() {
  // ── Auth PIN ──
  const [pinInput, setPinInput]   = useState('')
  const [pinError, setPinError]   = useState('')
  const [unlocked, setUnlocked]   = useState(false)

  // ── Scanner ──
  const [mode, setMode]           = useState<'camera' | 'manual'>('manual')
  const [manualCode, setManualCode] = useState('')
  const [scanning, setScanning]   = useState(false)
  const [result, setResult]       = useState<ScanResult | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const html5QrRef = useRef<any>(null)

  useEffect(() => {
    return () => {
      if (html5QrRef.current) {
        html5QrRef.current.stop().catch(() => {})
      }
    }
  }, [])

  // ── Vérifier le PIN ──
  function handlePin(e: React.FormEvent) {
    e.preventDefault()
    const correctPin = process.env.NEXT_PUBLIC_SCANNER_PIN
    if (pinInput === correctPin) {
      setUnlocked(true)
      setPinError('')
    } else {
      setPinError('Code incorrect. Contactez l\'organisateur.')
      setPinInput('')
    }
  }

  // ── Caméra ──
  async function startCamera() {
    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      html5QrRef.current = new Html5Qrcode('qr-reader')
      await html5QrRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText: string) => {
          html5QrRef.current.stop()
          setCameraActive(false)
          checkCode(decodedText)
        },
        () => {}
      )
      setCameraActive(true)
    } catch {
      alert('Impossible d\'accéder à la caméra. Utilisez la saisie manuelle.')
      setMode('manual')
    }
  }

  function stopCamera() {
    if (html5QrRef.current) {
      html5QrRef.current.stop().catch(() => {})
    }
    setCameraActive(false)
  }

  // ── Vérifier le code dans Supabase ──
  async function checkCode(code: string) {
    setScanning(true)
    setResult(null)

    const cleanCode = code.trim().toUpperCase()

    const { data: order, error } = await supabase
      .from('orders')
      .select('*, events(title)')
      .eq('qr_code', cleanCode)
      .eq('status', 'paid')
      .single()

    if (error || !order) {
      setResult({ status: 'invalid', qrCode: cleanCode })
      setScanning(false)
      return
    }

    if (order.used) {
      setResult({
        status:     'already_used',
        firstName:  order.first_name,
        lastName:   order.last_name,
        eventTitle: order.events?.title,
        quantity:   order.quantity,
        qrCode:     cleanCode,
      })
      setScanning(false)
      return
    }

    // Marquer comme utilisé
    await supabase
      .from('orders')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('id', order.id)

    setResult({
      status:     'valid',
      firstName:  order.first_name,
      lastName:   order.last_name,
      eventTitle: order.events?.title,
      quantity:   order.quantity,
      qrCode:     cleanCode,
    })
    setScanning(false)
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!manualCode.trim()) return
    checkCode(manualCode)
  }

  function reset() {
    setResult(null)
    setManualCode('')
    setScanning(false)
  }

  // ══════════════════════════════════════════
  // ÉCRAN 1 — PAGE PIN (gardien non connecté)
  // ══════════════════════════════════════════
  if (!unlocked) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm">

          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <div className="flex items-center justify-center gap-2 font-bold text-xl text-white mb-1">
              <Ticket className="w-5 h-5 text-brand-400" />
              Tiketi
            </div>
            <h1 className="text-lg font-extrabold text-white mt-3">Accès Scanner</h1>
            <p className="text-slate-400 text-sm mt-1">
              Entrez le code fourni par l'organisateur
            </p>
          </div>

          {/* Formulaire PIN */}
          <form onSubmit={handlePin} className="space-y-4">
            <div>
              <input
                type="number"
                value={pinInput}
                onChange={e => setPinInput(e.target.value)}
                placeholder="_ _ _ _"
                maxLength={6}
                autoFocus
                className="w-full bg-slate-800 border border-slate-600 rounded-2xl px-4 py-5 text-white text-center font-mono text-3xl tracking-[0.5em] placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>

            {/* Erreur */}
            {pinError && (
              <div className="flex items-center gap-2 bg-red-900/30 border border-red-700 text-red-400 text-xs rounded-xl px-4 py-3">
                <XCircle className="w-4 h-4 flex-shrink-0" />
                {pinError}
              </div>
            )}

            <button
              type="submit"
              disabled={!pinInput}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white font-bold py-4 rounded-2xl text-base transition-colors"
            >
              Accéder au scanner
            </button>
          </form>

          {/* Info */}
          <div className="mt-8 bg-slate-800 rounded-2xl p-4 border border-slate-700 text-center">
            <p className="text-xs text-slate-400 leading-relaxed">
              Ce code vous a été communiqué par l'organisateur de l'événement. Contactez-le si vous ne l'avez pas.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════
  // ÉCRAN 2 — RÉSULTAT SCAN (plein écran)
  // ══════════════════════════════════════════
  if (result) {
    const isValid = result.status === 'valid'
    const isUsed  = result.status === 'already_used'

    return (
      <div className={`fixed inset-0 flex flex-col items-center justify-center text-white text-center px-6 ${
        isValid ? 'bg-emerald-500' : 'bg-red-600'
      }`}>
        <div className="mb-6">
          {isValid
            ? <CheckCircle2 className="w-28 h-28 text-white drop-shadow-lg" />
            : <XCircle className="w-28 h-28 text-white drop-shadow-lg" />
          }
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
          {isValid ? 'TICKET VALIDÉ' : isUsed ? 'DÉJÀ UTILISÉ' : 'TICKET INVALIDE'}
        </h1>

        {(isValid || isUsed) && (
          <div className="mb-4">
            <p className="text-xl font-semibold">
              {result.firstName} {result.lastName}
            </p>
            <p className="text-white/80 text-sm mt-1">{result.eventTitle}</p>
            <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-5 py-2 mt-3 text-sm font-bold">
              🎟️ {result.quantity} billet{(result.quantity ?? 0) > 1 ? 's' : ''}
            </div>
          </div>
        )}

        {result.status === 'invalid' && (
          <p className="text-white/80 text-sm mb-4">
            Ce code n'existe pas ou n'est pas payé.
          </p>
        )}

        <div className="font-mono text-white/50 text-sm mb-8">
          {result.qrCode}
        </div>

        <button
          onClick={reset}
          className="flex items-center gap-2 bg-white/20 hover:bg-white/30 border border-white/30 text-white font-bold px-8 py-4 rounded-2xl transition-all text-base"
        >
          <RefreshCw className="w-5 h-5" />
          Scanner le suivant
        </button>
      </div>
    )
  }

  // ══════════════════════════════════════════
  // ÉCRAN 3 — SCANNER PRINCIPAL
  // ══════════════════════════════════════════
  return (
    <div className="min-h-screen bg-slate-900 text-white">

      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 h-16 flex items-center justify-between px-6">
        <div className="flex items-center gap-2 font-bold text-lg text-white">
          <Ticket className="w-5 h-5 text-brand-400" />
          Tiketi
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Scanner actif
          </div>
          {/* Bouton déconnexion gardien */}
          <button
            onClick={() => { setUnlocked(false); setPinInput('') }}
            className="text-xs text-slate-500 hover:text-red-400 transition-colors font-semibold"
          >
            Quitter
          </button>
        </div>
      </header>

      <div className="max-w-sm mx-auto px-4 py-8">

        {/* Titre */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <QrCode className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Scanner les billets</h1>
          <p className="text-slate-400 text-sm mt-1">Vérifiez les billets à l'entrée</p>
        </div>

        {/* Toggle mode */}
        <div className="flex gap-1 bg-slate-800 p-1 rounded-xl mb-6">
          <button
            onClick={() => { setMode('camera'); stopCamera() }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              mode === 'camera' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <QrCode className="w-4 h-4" /> Caméra
          </button>
          <button
            onClick={() => { setMode('manual'); stopCamera() }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              mode === 'manual' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Keyboard className="w-4 h-4" /> Manuel
          </button>
        </div>

        {/* Mode Caméra */}
        {mode === 'camera' && (
          <div className="space-y-4">
            <div className="relative bg-slate-800 rounded-2xl overflow-hidden aspect-square">
              <div id="qr-reader" className="w-full h-full" />
              {!cameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <QrCode className="w-16 h-16 text-slate-600" />
                  <p className="text-slate-500 text-sm">Caméra non démarrée</p>
                </div>
              )}
              {cameraActive && (
                <>
                  <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-brand-400 rounded-tl-lg" />
                  <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-brand-400 rounded-tr-lg" />
                  <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-brand-400 rounded-bl-lg" />
                  <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-brand-400 rounded-br-lg" />
                </>
              )}
            </div>
            {!cameraActive ? (
              <button onClick={startCamera} className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-4 rounded-2xl text-base transition-colors flex items-center justify-center gap-2">
                <QrCode className="w-5 h-5" /> Démarrer la caméra
              </button>
            ) : (
              <button onClick={stopCamera} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 rounded-2xl text-sm transition-colors">
                Arrêter la caméra
              </button>
            )}
          </div>
        )}

        {/* Mode Manuel */}
        {mode === 'manual' && (
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                Code du billet
              </label>
              <input
                value={manualCode}
                onChange={e => setManualCode(e.target.value.toUpperCase())}
                placeholder="CT-XXXXXXXX"
                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-4 text-white text-center font-mono text-lg tracking-widest placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                autoFocus
                autoComplete="off"
              />
            </div>
            <button
              type="submit"
              disabled={scanning || !manualCode.trim()}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold py-4 rounded-2xl text-base transition-colors flex items-center justify-center gap-2"
            >
              {scanning ? (
                <>
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31" strokeDashoffset="10" />
                  </svg>
                  Vérification…
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Vérifier le billet
                </>
              )}
            </button>
          </form>
        )}

        {/* Guide */}
        <div className="mt-8 bg-slate-800 rounded-2xl p-4 border border-slate-700">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Guide
          </div>
          <div className="space-y-2">
            {[
              { icon: '🟢', text: 'Écran vert → billet valide, laissez passer' },
              { icon: '🔴', text: 'Écran rouge → déjà scanné, refusez l\'entrée' },
              { icon: '🔴', text: 'Écran rouge → code invalide ou non payé' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-slate-400">
                <span>{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}