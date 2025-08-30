'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function MinaAnnonserPage() {
  const router = useRouter()
  const [checkedAuth, setCheckedAuth] = useState(false)

  useEffect(() => {
    let unsub = () => {}
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        router.replace('/')
        return
      }
      setCheckedAuth(true)
      const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
        if (!s) router.replace('/')
      })
      unsub = () => sub.subscription.unsubscribe()
    })()
    return () => unsub()
  }, [router])

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
        <h1 className="text-lg font-semibold mb-2">Mina annonser</h1>
        <p className="text-slate-700">Här visar vi dina sparade/skapade annonser (kommer strax).</p>
      </div>
    </main>
  )
}
