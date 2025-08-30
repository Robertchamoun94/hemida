'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

type Profile = { id: string; full_name: string | null; avatar_url: string | null }

export default function ProfileMenu() {
  const [open, setOpen] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let unsubAuth = () => {}
    let channel: ReturnType<typeof supabase.channel> | null = null

    const fetchProfile = async (uid: string) => {
      const { data: p } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', uid)
        .maybeSingle()

      if (!p) {
        // Skapa raden om den saknas (ignorerar konflikt om den redan finns)
        await supabase
          .from('profiles')
          .upsert({ id: uid }, { onConflict: 'id' })

        setProfile({ id: uid, full_name: null, avatar_url: null })
      } else {
        setProfile(p as Profile)
      }
    }

    ;(async () => {
      const { data } = await supabase.auth.getUser()
      const user = data.user
      if (!user) { setProfile(null); return }

      await fetchProfile(user.id)

      // Lyssna på in/utloggning
      const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
        if (!session) setProfile(null)
        else fetchProfile(session.user.id)
      })
      unsubAuth = () => sub.subscription.unsubscribe()

      // Realtime: uppdatera när profilen ändras
      channel = supabase
        .channel(`profiles:${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
          (payload: RealtimePostgresChangesPayload<Profile>) => {
            const rec = (payload.new ?? payload.old) as Profile | null
            if (!rec) return
            setProfile(prev =>
              prev
                ? {
                    ...prev,
                    full_name: rec.full_name ?? prev.full_name,
                    avatar_url: rec.avatar_url ?? prev.avatar_url,
                  }
                : { id: user.id, full_name: rec.full_name ?? null, avatar_url: rec.avatar_url ?? null }
            )
          }
        )
        .subscribe()

      // Fallback: uppdatera när profilsidan signalerar eller fönstret får fokus
      const refresh = () => fetchProfile(user.id)
      const onStorage = (e: StorageEvent) => { if (e.key === 'profile_updated') refresh() }
      window.addEventListener('focus', refresh)
      window.addEventListener('profile:updated' as any, refresh)
      window.addEventListener('storage', onStorage)

      // Stäng menyn vid klick utanför
      const onDoc = (e: MouseEvent) => {
        if (!menuRef.current?.contains(e.target as Node)) setOpen(false)
      }
      document.addEventListener('mousedown', onDoc)

      return () => {
        unsubAuth()
        if (channel) supabase.removeChannel(channel)
        window.removeEventListener('focus', refresh)
        window.removeEventListener('profile:updated' as any, refresh)
        window.removeEventListener('storage', onStorage)
        document.removeEventListener('mousedown', onDoc)
      }
    })()
  }, [])

  const initial = profile?.full_name?.trim()?.[0]?.toUpperCase() ?? 'U'

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="h-8 w-8 md:h-9 md:w-9 rounded-full overflow-hidden border border-white bg-white/20 grid place-items-center hover:ring-2 hover:ring-white/60 transition"
        aria-label="Profilmeny"
      >
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="Profilbild" className="h-full w-full object-cover" />
        ) : (
          <span className="text-white text-sm md:text-base font-semibold">{initial}</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 z-[80] bg-white rounded-2xl border border-slate-200 shadow-xl p-1.5">
          <a href="/profil" className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-100" onClick={() => setOpen(false)}>
            Profil
          </a>
          <a href="/mina-annonser" className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-100" onClick={() => setOpen(false)}>
            Mina annonser
          </a>
          <div className="my-1 h-px bg-slate-200" />
          <button
            className="w-full text-left rounded-lg px-3 py-2 text-sm hover:bg-slate-100"
            onClick={async () => { setOpen(false); await supabase.auth.signOut() }}
          >
            Logga ut
          </button>
        </div>
      )}
    </div>
  )
}
