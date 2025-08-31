'use client'

import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Mode = 'login' | 'signup' | 'reset'
type Props = { open: boolean; onClose: () => void; initialMode?: Mode }

export default function LoginModal({ open, onClose, initialMode = 'login' }: Props) {
  const [mode, setMode] = useState<Mode>(initialMode)
  useEffect(() => { if (open) setMode(initialMode) }, [open, initialMode])

  // ESC för att stänga
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  const stop = (e: React.MouseEvent) => e.stopPropagation()

  return (
    <div onClick={onClose} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-3 md:p-6" aria-modal role="dialog">
      <div onClick={stop} className="w-full max-w-[560px] bg-white/95 backdrop-blur shadow-2xl ring-1 ring-black/5 border border-slate-300 rounded-3xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h3 className="text-[15px] md:text-base font-semibold">
            {mode === 'login' && 'Logga in'}
            {mode === 'signup' && 'Skapa konto'}
            {mode === 'reset' && 'Återställ lösenord'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition" aria-label="Stäng" type="button">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 md:p-6">
          {mode === 'login'  && <LoginForm  onForgot={() => setMode('reset')} onToSignup={() => setMode('signup')} onSuccess={onClose} />}
          {mode === 'signup' && <SignupForm onToLogin={() => setMode('login')} />}
          {mode === 'reset'  && <ResetForm  onToLogin={() => setMode('login')} />}
        </div>
      </div>
    </div>
  )
}

/* ---------- Forms ---------- */

function LoginForm(p: { onForgot: () => void; onToSignup: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        setErr(null); setMsg(null); setLoading(true)
        try {
          const fd = new FormData(e.currentTarget)
          const email = String(fd.get('email') || '').trim()
          const password = String(fd.get('password') || '')

          const { data, error } = await supabase.auth.signInWithPassword({ email, password })
          if (error) {
            const m = (error.message || '').toLowerCase()
            if (m.includes('invalid login') || m.includes('invalid')) {
              setErr('Fel e-post eller lösenord.')
            } else if (m.includes('email not confirmed') || m.includes('confirm')) {
              setErr('Din e-post är inte verifierad ännu. Kolla din inkorg.')
            } else {
              setErr(error.message)
            }
            return
          }
          if (!data.session) { setErr('Inloggning misslyckades.'); return }
          setMsg('Inloggad!')
          p.onSuccess()
        } catch (e: any) {
          setErr(e?.message || 'Ett fel uppstod vid inloggning.')
        } finally {
          setLoading(false)
        }
      }}
      className="space-y-4"
    >
      <div className="flex flex-col gap-1">
        <label className="field-label">E-post</label>
        <input name="email" type="email" required placeholder="namn@exempel.se" className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-[14px] focus:border-[#1E3A8A] focus:outline-none"/>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label className="field-label">Lösenord</label>
          <button type="button" className="text-[12px] md:text-[13px] font-semibold text-[#1E3A8A] hover:underline" onClick={p.onForgot}>
            Har du glömt lösenordet?
          </button>
        </div>
        <input name="password" type="password" required placeholder="••••••••" className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-[14px] focus:border-[#1E3A8A] focus:outline-none"/>
      </div>

      {err && <p className="text-[13px] text-red-600">{err}</p>}
      {msg && <p className="text-[13px] text-emerald-700">{msg}</p>}

      <button type="submit" disabled={loading}
        className="w-full rounded-xl px-4 py-2.5 text-[13px] md:text-sm font-semibold bg-[#1E3A8A] text-white shadow hover:bg-[#1E40AF] transition disabled:opacity-60">
        {loading ? 'Loggar in…' : 'Logga in'}
      </button>

      <AuthAltLink text="Har du inget konto?" action="Skapa konto" onClick={p.onToSignup}/>
    </form>
  )
}

function SignupForm(p: { onToLogin: () => void }) {
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        setErr(null); setMsg(null); setLoading(true)
        try {
          const fd = new FormData(e.currentTarget)
          const name = String(fd.get('name') || '').trim()
          const email = String(fd.get('email') || '').trim()
          const password = String(fd.get('password') || '')
          const confirm = String(fd.get('confirm') || '')
          if (password !== confirm) { setErr('Lösenorden matchar inte.'); return }

          const site = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
          const { error } = await supabase.auth.signUp({
            email, password,
            options: {
              data: { name },
              emailRedirectTo: `${site}/auth/confirm`
            }
          })
          if (error) { setErr(error.message || 'Registrering misslyckades.'); return }
          setMsg('Verifieringslänk skickad! Kontrollera din inkorg och bekräfta kontot. Hittar du inte mejlet? Titta även i Skräppost/Spam”.')
        } catch (e: any) {
          setErr(e?.message || 'Ett fel uppstod vid registrering.')
        } finally {
          setLoading(false)
        }
      }}
      className="space-y-4"
    >
      <div className="flex flex-col gap-1">
        <label className="field-label">Namn</label>
        <input name="name" type="text" required placeholder="För- och efternamn" className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-[14px] focus:border-[#1E3A8A] focus:outline-none"/>
      </div>

      <div className="flex flex-col gap-1">
        <label className="field-label">E-post</label>
        <input name="email" type="email" required placeholder="namn@exempel.se" className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-[14px] focus:border-[#1E3A8A] focus:outline-none"/>
      </div>

      <div className="flex flex-col gap-1">
        <label className="field-label">Lösenord</label>
        <input name="password" type="password" required placeholder="Minst 8 tecken" className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-[14px] focus:border-[#1E3A8A] focus:outline-none"/>
      </div>

      <div className="flex flex-col gap-1">
        <label className="field-label">Bekräfta lösenord</label>
        <input name="confirm" type="password" required placeholder="Upprepa lösenord" className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-[14px] focus:border-[#1E3A8A] focus:outline-none"/>
      </div>

      {err && <p className="text-[13px] text-red-600">{err}</p>}
      {msg && <p className="text-[13px] text-emerald-700">{msg}</p>}

      <button type="submit" disabled={loading}
        className="w-full rounded-xl px-4 py-2.5 text-[13px] md:text-sm font-semibold bg-[#1E3A8A] text-white shadow hover:bg-[#1E40AF] transition disabled:opacity-60">
        {loading ? 'Skapar konto…' : 'Skapa konto'}
      </button>

      <AuthAltLink text="Har du redan ett konto?" action="Logga in" onClick={p.onToLogin}/>
    </form>
  )
}

function ResetForm(p: { onToLogin: () => void }) {
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        setErr(null); setMsg(null); setLoading(true)
        try {
          const fd = new FormData(e.currentTarget)
          const email = String(fd.get('email') || '').trim()
          const site = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
          const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${site}/auth/reset` })
          if (error) { setErr(error.message || 'Kunde inte skicka återställningslänk.'); return }
          setMsg('Om e-post finns registrerad skickas en återställningslänk.')
        } catch (e: any) {
          setErr(e?.message || 'Ett fel uppstod.')
        } finally {
          setLoading(false)
        }
      }}
      className="space-y-4"
    >
      <p className="text-[13px] md:text-sm text-slate-700">Ange din e-postadress så skickar vi en återställningslänk.</p>
      <div className="flex flex-col gap-1">
        <label className="field-label">E-post</label>
        <input name="email" type="email" required placeholder="namn@exempel.se" className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-[14px] focus:border-[#1E3A8A] focus:outline-none"/>
      </div>
      {err && <p className="text-[13px] text-red-600">{err}</p>}
      {msg && <p className="text-[13px] text-emerald-700">{msg}</p>}
      <button type="submit" disabled={loading}
        className="w-full rounded-xl px-4 py-2.5 text-[13px] md:text-sm font-semibold bg-[#1E3A8A] text-white shadow hover:bg-[#1E40AF] transition disabled:opacity-60">
        {loading ? 'Skickar…' : 'Skicka återställningslänk'}
      </button>
      <div className="text-center text-[13px] md:text-sm text-slate-600">
        <a href="#" onClick={(e)=>{e.preventDefault(); p.onToLogin()}} className="font-semibold text-[#1E3A8A] hover:underline">Tillbaka till inloggning</a>
      </div>
    </form>
  )
}

function AuthAltLink(props: { text: string; action: string; onClick: () => void }) {
  return (
    <div className="text-center text-[13px] md:text-sm text-slate-600">
      {props.text}{' '}
      <a href="#" onClick={(e)=>{e.preventDefault(); props.onClick()}} className="font-semibold text-[#1E3A8A] hover:underline">
        {props.action}
      </a>
    </div>
  )
}
