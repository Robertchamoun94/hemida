'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function ConfirmPage() {
  const router = useRouter()

  useEffect(() => {
    (async () => {
      try {
        const url = new URL(window.location.href)

        // Nyare Supabase-länkar: ?code=...&type=signup
        const code = url.searchParams.get('code')
        if (code) {
          // Fallback om din @supabase/supabase-js inte har exchangeCodeForSession
          const authAny = supabase.auth as any
          if (typeof authAny.exchangeCodeForSession === 'function') {
            await authAny.exchangeCodeForSession({ code })
          } else if (typeof authAny.getSessionFromUrl === 'function') {
            // Äldre API – plockar token direkt från current URL
            await authAny.getSessionFromUrl({ storeSession: true })
          }
        } else {
          // Äldre variant med tokens i hash (#access_token=&refresh_token=)
          const hash = new URLSearchParams(url.hash.replace(/^#/, ''))
          const access_token = hash.get('access_token')
          const refresh_token = hash.get('refresh_token')
          if (access_token && refresh_token) {
            await supabase.auth.setSession({ access_token, refresh_token })
          }
        }
      } catch {
        // no-op – vi dirigerar hem oavsett
      } finally {
        router.replace('/') // till startsidan som "inloggad"
      }
    })()
  }, [router])

  return (
    <main className="mx-auto max-w-md p-6">
      <div className="bg-white/95 backdrop-blur shadow-2xl ring-1 ring-black/5 border border-slate-300 rounded-3xl p-6">
        <p className="text-slate-700">Loggar in…</p>
      </div>
    </main>
  )
}
