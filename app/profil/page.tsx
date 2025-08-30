'use client'

import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type Profile = {
  id: string
  full_name: string | null
  phone: string | null
  avatar_url: string | null
}

/* ---------- Telefon (SE) ---------- */
function toE164SE(input: string): string | null {
  if (!input) return null
  let s = input.trim().replace(/[^\d+]/g, '')
  if (s.startsWith('00')) s = '+' + s.slice(2)
  if (s.startsWith('0')) s = '+46' + s.slice(1)
  if (!s.startsWith('+')) s = '+46' + s
  const digits = s.replace(/\D/g, '')
  if (!digits.startsWith('46')) return null
  const rest = digits.slice(2)
  if (rest.length < 7 || rest.length > 10) return null
  return '+' + digits
}
function prettySE(e164: string): string {
  const digits = e164.replace(/\D/g, '')
  let rest = digits.slice(2)
  const groups: string[] = []
  if (rest.length === 9) groups.push(rest.slice(0, 2), rest.slice(2, 5), rest.slice(5, 7), rest.slice(7))
  else if (rest.length === 8) groups.push(rest.slice(0, 1), rest.slice(1, 4), rest.slice(4, 6), rest.slice(6))
  else {
    while (rest.length) {
      const take = rest.length > 7 ? 2 : rest.length > 4 ? 3 : rest.length > 2 ? 2 : rest.length
      groups.push(rest.slice(0, take))
      rest = rest.slice(take)
    }
  }
  return `+46 ${groups.join(' ')}`
}

/* ---------- Bild: beskär/komprimera ---------- */
async function cropSquareToJpeg(file: File, maxSide = 512, quality = 0.9): Promise<File> {
  const img = document.createElement('img')
  const url = URL.createObjectURL(file)
  await new Promise<void>((res, rej) => {
    img.onload = () => res()
    img.onerror = rej
    img.src = url
  })
  const size = Math.min(img.naturalWidth, img.naturalHeight)
  const sx = Math.floor((img.naturalWidth - size) / 2)
  const sy = Math.floor((img.naturalHeight - size) / 2)
  const scale = Math.min(maxSide / size, 1)
  const target = Math.floor(size * scale)
  const canvas = document.createElement('canvas')
  canvas.width = target
  canvas.height = target
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, sx, sy, size, size, 0, 0, target, target)
  const blob: Blob = await new Promise((res, rej) =>
    canvas.toBlob(b => (b ? res(b) : rej(new Error('toBlob misslyckades'))), 'image/jpeg', quality)
  )
  URL.revokeObjectURL(url)
  return new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
}

/* ---------- Hjälpare för Storage ---------- */
const BUCKETS = ['avatars', 'AVATARS'] as const

function extractObjectPathFromPublicUrl(publicUrl: string): { bucket: string | null; objectPath: string | null } {
  const m = publicUrl.match(/\/storage\/v1\/object\/public\/(avatars|AVATARS)\/(.+)$/)
  return { bucket: m ? m[1] : null, objectPath: m ? m[2] : null }
}

async function uploadToAnyBucket(path: string, file: File): Promise<string | null> {
  let lastErr: string | null = null
  for (const bucket of BUCKETS) {
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      upsert: true,
      contentType: 'image/jpeg'
    })
    if (!error) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path)
      return data.publicUrl
    }
    console.error('Storage upload error (bucket:', bucket, '):', error)
    lastErr = error.message || 'Uppladdning misslyckades'
  }
  throw new Error(lastErr ?? 'Uppladdning misslyckades')
}

export default function ProfilPage() {
  const router = useRouter()
  const [checkedAuth, setCheckedAuth] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  const [phoneInput, setPhoneInput] = useState('')
  const [phoneError, setPhoneError] = useState<string | null>(null)

  const [pickedFile, setPickedFile] = useState<File | null>(null)
  const [localPreview, setLocalPreview] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  /* --- Auth-guard --- */
  useEffect(() => {
    let unsub = () => {}
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        router.replace('/')
        return
      }
      setCheckedAuth(true)
      setUserId(data.session.user.id)
      const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
        if (!s) router.replace('/')
      })
      unsub = () => sub.subscription.unsubscribe()
    })()
    return () => unsub()
  }, [router])

  /* --- Hämta profil --- */
  useEffect(() => {
    if (!userId) return
    ;(async () => {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
      const prof = (p as Profile) ?? { id: userId, full_name: '', phone: null, avatar_url: null }
      setProfile(prof)
      setPhoneInput(prof.phone ? prettySE(prof.phone) : '')
      setLocalPreview(null)
      setPickedFile(null)
    })()
  }, [userId])

  /* --- Telefon --- */
  const onPhoneBlur = () => {
    if (!phoneInput.trim()) {
      setPhoneError(null)
      setProfile(p => (p ? { ...p, phone: null } : p))
      return
    }
    const e164 = toE164SE(phoneInput)
    if (!e164) {
      setPhoneError('Ogiltigt svenskt nummer. Exempel: 070-123 45 67 eller +46701234567.')
      return
    }
    setPhoneError(null)
    setPhoneInput(prettySE(e164))
    setProfile(p => (p ? { ...p, phone: e164 } : p))
  }

  /* --- Filval --- */
  const onChooseAvatar = (file: File) => {
    setPickedFile(file)
    const url = URL.createObjectURL(file)
    setLocalPreview(url)
  }

  const uploadAvatarIfNeeded = async (): Promise<string | null> => {
    if (!pickedFile || !userId) return null
    if (!/^image\/(png|jpe?g|webp)$/i.test(pickedFile.type)) {
      setMsg('Endast JPG/PNG/WEBP tillåts.')
      return null
    }
    if (pickedFile.size > 8 * 1024 * 1024) {
      setMsg('Bilden är för stor. Max 8 MB.')
      return null
    }

    let prepared: File
    try {
      prepared = await cropSquareToJpeg(pickedFile, 512, 0.9)
    } catch (e: any) {
      setMsg(e?.message || 'Kunde inte bearbeta bilden.')
      return null
    }

    const path = `${userId}/${Date.now()}.jpg`
    try {
      const publicUrl = await uploadToAnyBucket(path, prepared)
      return publicUrl
    } catch (e: any) {
      setMsg(e?.message || 'Uppladdning misslyckades.')
      return null
    }
  }

  const onRemoveAvatar = async () => {
    if (!profile?.avatar_url) return
    const { bucket, objectPath } = extractObjectPathFromPublicUrl(profile.avatar_url)
    setMsg(null)

    if (bucket && objectPath) {
      await supabase.storage.from(bucket).remove([objectPath]).catch(() => {})
    }
    await supabase.from('profiles').update({ avatar_url: null }).eq('id', profile.id)
    setProfile(p => (p ? { ...p, avatar_url: null } : p))
    setLocalPreview(null)
    setPickedFile(null)

    // signalera headern
    try {
      window.dispatchEvent(new Event('profile:updated'))
      localStorage.setItem('profile_updated', String(Date.now()))
    } catch {}

    setMsg('Profilbild borttagen.')
  }

  /* --- Spara --- */
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!profile) return

    setSaving(true)
    setMsg(null)

    // 1) Normalisera telefon direkt från input
    let normalizedPhone: string | null = null
    const raw = phoneInput.trim()
    if (raw !== '') {
      const e164 = toE164SE(raw)
      if (!e164) {
        setSaving(false)
        setPhoneError('Ogiltigt svenskt nummer. Exempel: 070-123 45 67 eller +46701234567.')
        return
      }
      setPhoneError(null)
      normalizedPhone = e164
    }

    // 2) Ladda upp avatar om vald
    let newAvatarUrl: string | null = null
    try {
      newAvatarUrl = await uploadAvatarIfNeeded()
    } catch (err: unknown) {
      console.error('Storage upload error:', err)
      const msg =
        typeof err === 'object' && err && 'message' in err ? String((err as any).message) : 'Uppladdning misslyckades.'
      setMsg(msg)
    }

    // 3) Spara profilen
    const payload = {
      id: profile.id,
      full_name: profile.full_name,
      phone: normalizedPhone,
      avatar_url: newAvatarUrl ?? profile.avatar_url,
      updated_at: new Date().toISOString()
    }

    const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' })
    setSaving(false)

    if (error) {
      setMsg(error.message || 'Kunde inte spara.')
      return
    }

    // 4) UI-uppdateringar
    setMsg('Sparat ✔︎')
    if (normalizedPhone) setPhoneInput(prettySE(normalizedPhone))
    if (newAvatarUrl) {
      setPickedFile(null)
      setLocalPreview(null)
      setProfile(p => (p ? { ...p, avatar_url: newAvatarUrl! } : p))
    }

    // 5) Signalera headern att uppdatera avataren
    try {
      window.dispatchEvent(new Event('profile:updated'))
      localStorage.setItem('profile_updated', String(Date.now()))
    } catch {}
  }

  if (!checkedAuth) {
    return (
      <main className="mx-auto max-w-md p-6">
        <div className="bg-white/95 backdrop-blur shadow-2xl ring-1 ring-black/5 border border-slate-300 rounded-3xl p-6">
          <p className="text-slate-700">Laddar…</p>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-xl p-6">
      <div className="bg-white/95 backdrop-blur shadow-2xl ring-1 ring-black/5 border border-slate-300 rounded-3xl p-6">
        <h1 className="text-lg font-semibold mb-4">Min profil</h1>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full overflow-hidden border border-slate-300 bg-slate-100">
              {localPreview ? (
                <img src={localPreview} alt="Preview" className="h-full w-full object-cover" />
              ) : profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profilbild" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full grid place-items-center text-slate-500">IMG</div>
              )}
            </div>

            <div className="flex gap-2 items-center">
              <label className="inline-block">
                <span className="field-label mb-1 block">Profilbild</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => e.target.files?.[0] && onChooseAvatar(e.target.files[0])}
                  className="block text-[13px]"
                />
              </label>
              {(profile?.avatar_url || localPreview) && (
                <button
                  type="button"
                  onClick={onRemoveAvatar}
                  className="rounded-lg border border-slate-300 px-2 py-1 text-[13px] hover:bg-slate-100"
                >
                  Ta bort
                </button>
              )}
            </div>
          </div>

          {/* Namn */}
          <div className="flex flex-col gap-1">
            <label className="field-label">Namn</label>
            <input
              value={profile?.full_name ?? ''}
              onChange={e => setProfile(p => (p ? { ...p, full_name: e.target.value } : p))}
              className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-[14px] focus:border-[#1E3A8A] focus:outline-none"
              placeholder="För- och efternamn"
              required
            />
          </div>

          {/* Telefon */}
          <div className="flex flex-col gap-1">
            <label className="field-label">Telefon</label>
            <input
              value={phoneInput}
              onChange={e => setPhoneInput(e.target.value)}
              onBlur={onPhoneBlur}
              className={`h-10 rounded-xl border px-3 text-[14px] focus:outline-none ${
                phoneError ? 'border-red-500 focus:border-red-500 bg-red-50' : 'border-slate-300 bg-white focus:border-[#1E3A8A]'
              }`}
              placeholder="+46 70 123 45 67"
              inputMode="tel"
            />
            {phoneError && <span className="text-xs text-red-600">{phoneError}</span>}
          </div>

          {/* E-post (read-only) */}
          <ReadonlyEmail />

          {msg && <p className="text-[13px] text-slate-700">{msg}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl px-4 py-2.5 text-[13px] md:text-sm font-semibold bg-[#1E3A8A] text-white shadow hover:bg-[#1E40AF] transition disabled:opacity-60"
          >
            {saving ? 'Sparar…' : 'Spara profil'}
          </button>
        </form>
      </div>
    </main>
  )
}

function ReadonlyEmail() {
  const [email, setEmail] = useState<string>('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ''))
  }, [])

  return (
    <div className="flex flex-col gap-1">
      <label className="field-label">E-post</label>
      <input value={email} readOnly className="h-10 rounded-xl border border-slate-300 bg-slate-50 px-3 text-[14px]" />
    </div>
  )
}
