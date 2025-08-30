'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false)
  const [ok, setOk] = useState<boolean | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setReady(true)
      setOk(!!data.user)
      if (!data.user) setMsg('Ogiltig eller föråldrad länk. Begär en ny återställningslänk.')
    })
  }, [])

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const pw = String(fd.get('password') || '')
    const pw2 = String(fd.get('confirm') || '')
    if (pw !== pw2) {
      setMsg('Lösenorden matchar inte.')
      return
    }
    const { error } = await supabase.auth.updateUser({ password: pw })
    if (error) setMsg(error.message || 'Kunde inte uppdatera lösenord.')
    else setMsg('Lösenord uppdaterat. Du kan nu logga in med ditt nya lösenord.')
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <div className="bg-white/95 backdrop-blur shadow-2xl ring-1 ring-black/5 border border-slate-300 rounded-3xl p-6">
        {!ready && <p className="text-slate-700">Laddar…</p>}
        {ready && ok && (
          <form onSubmit={onSubmit} className="space-y-4">
            <h1 className="text-xl font-semibold">Sätt nytt lösenord</h1>
            <div className="flex flex-col gap-1">
              <label className="field-label">Nytt lösenord</label>
              <input
                name="password"
                type="password"
                required
                className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-[14px] focus:border-[#1E3A8A] focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="field-label">Bekräfta nytt lösenord</label>
              <input
                name="confirm"
                type="password"
                required
                className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-[14px] focus:border-[#1E3A8A] focus:outline-none"
              />
            </div>
            {msg && <p className="text-[13px] text-slate-700">{msg}</p>}
            <button
              type="submit"
              className="w-full rounded-xl px-4 py-2.5 text-[13px] md:text-sm font-semibold bg-[#1E3A8A] text-white shadow hover:bg-[#1E40AF] transition"
            >
              Spara nytt lösenord
            </button>
          </form>
        )}
        {ready && ok === false && <p className="text-[13px] text-red-600">{msg}</p>}
      </div>
    </main>
  )
}
