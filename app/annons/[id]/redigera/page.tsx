'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type Props = { params: { id: string } }

export default function EditListingRedirect({ params }: Props) {
  const router = useRouter()
  const [msg, setMsg] = useState('Laddar…')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const id = params.id

      // Hämta annonsens typ från public.listings
      const { data, error } = await supabase
        .from('listings')
        .select('id, kind')
        .eq('id', id)
        .single()

      if (cancelled) return

      if (error || !data) {
        setMsg('Kunde inte hitta annonsen.')
        return
      }

      // Omdirigera till samma sida som användes vid skapandet
      const kind = String(data.kind ?? '').toUpperCase()
      const target =
        kind === 'RENT'
          ? `/hyra-ut?edit=${encodeURIComponent(id)}`
          : `/salja?edit=${encodeURIComponent(id)}`

      // Typcast för att undvika typed-routes-varning (ingen logik ändras)
      router.replace(target as any)
      setMsg('Omdirigerar till redigeringssidan…')
    })()

    return () => {
      cancelled = true
    }
  }, [params.id, router])

  return (
    <main className="mx-auto max-w-md p-6">
      <div className="bg-white/95 backdrop-blur shadow-2xl ring-1 ring-black/5 border border-slate-300 rounded-3xl p-6">
        <p className="text-slate-700">{msg}</p>
      </div>
    </main>
  )
}
