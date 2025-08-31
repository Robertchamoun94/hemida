'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type Ad = {
  id: string
  title?: string
  rubrik?: string
  address?: string
  ort?: string
  price?: number
  hyra?: number
  created_at?: string
  status?: string
  table: 'annonser' | 'uthyrning'
}

export default function MinaAnnonserPage() {
  const router = useRouter()
  const [checkedAuth, setCheckedAuth] = useState(false)
  const [uid, setUid] = useState<string | null>(null)

  const [ads, setAds] = useState<Ad[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  // Auth-vakt
  useEffect(() => {
    let unsub = () => {}
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        router.replace('/')
        return
      }
      setUid(data.session.user.id)
      setCheckedAuth(true)
      const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
        if (!s) router.replace('/')
      })
      unsub = () => sub.subscription.unsubscribe()
    })()
    return () => unsub()
  }, [router])

  const load = useCallback(
    async (userId: string) => {
      setLoading(true)
      setErr(null)

      const tables: Array<'annonser' | 'uthyrning'> = ['annonser', 'uthyrning']
      const collected: Ad[] = []

      for (const table of tables) {
        let fetched: any[] | null = null

        // 1) Försök enkel hämtning (ordnad)
        const first = await (supabase as any)
          .from(table as any)
          .select('*')
          .order('created_at', { ascending: false })

        if (!first.error) {
          fetched = first.data ?? []
        }

        // 2) Om tomt/behörighet – försök filtrera på tänkbara user-id-kolumner
        if (!fetched || fetched.length === 0) {
          const candidateKeys = ['user_id', 'owner_id', 'profile_id', 'created_by', 'author_id']
          for (const key of candidateKeys) {
            const { data: dataByKey, error: errByKey } = await (supabase as any)
              .from(table as any)
              .select('*')
              .eq(key as any, userId)
              .order('created_at', { ascending: false })
            if (!errByKey) {
              fetched = dataByKey ?? []
              break
            }
          }
        }

        // 3) Mappa till visningsformat
        if (fetched && fetched.length) {
          for (const r of fetched) {
            // visa publicerade/aktiva (om statusfält existerar)
            if (r.status && !['published', 'active'].includes(String(r.status))) continue
            collected.push({
              id: r.id,
              title: r.title ?? r.rubrik ?? r.ad_title,
              rubrik: r.rubrik,
              address: r.address ?? r.adress,
              ort: r.city ?? r.ort,
              price: r.price ?? r.pris,
              hyra: r.rent ?? r.hyra,
              created_at: r.created_at,
              status: r.status ?? r.state,
              table,
            })
          }
        }
      }

      setAds(collected)
      setLoading(false)
    },
    []
  )

  useEffect(() => {
    if (uid) load(uid)
  }, [uid, load])

  const onDelete = async (ad: Ad) => {
    if (!confirm('Ta bort den här annonsen?')) return
    const { error } = await (supabase as any)
      .from(ad.table as any)
      .delete()
      .eq('id', ad.id)
    if (error) {
      alert(error.message)
      return
    }
    setAds((prev) => prev.filter((x) => !(x.id === ad.id && x.table === ad.table)))
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
    <main className="mx-auto max-w-3xl p-6">
      <div className="bg-white/95 backdrop-blur shadow-2xl ring-1 ring-black/5 border border-slate-300 rounded-3xl p-6">
        <h1 className="text-lg font-semibold mb-3">Mina annonser</h1>

        {loading ? (
          <p className="text-slate-700">Hämtar dina annonser…</p>
        ) : err ? (
          <p className="text-red-600">{err}</p>
        ) : ads.length === 0 ? (
          <p className="text-slate-700">Du har inga publicerade annonser ännu.</p>
        ) : (
          <ul className="space-y-3">
            {ads.map((ad) => (
              <li
                key={`${ad.table}-${ad.id}`}
                className="border border-slate-200 rounded-xl p-4 flex items-start justify-between gap-4"
              >
                <div>
                  <p className="font-semibold">
                    {ad.title || ad.rubrik || 'Annons utan rubrik'}
                    <span className="ml-2 text-xs rounded-full px-2 py-0.5 border border-slate-300 text-slate-600">
                      {ad.table === 'annonser' ? 'Till salu' : 'Uthyres'}
                    </span>
                  </p>
                  {(ad.address || ad.ort) && (
                    <p className="text-sm text-slate-600">
                      {(ad.address || '') + (ad.ort ? (ad.address ? ', ' : '') + ad.ort : '')}
                    </p>
                  )}
                  <p className="text-sm text-slate-600">
                    {ad.price ? `${ad.price} kr` : ad.hyra ? `${ad.hyra} kr/mån` : null}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    className="rounded-lg border px-3 py-1.5 text-sm font-semibold text-[#1E3A8A] border-[#1E3A8A] hover:bg-[#1E3A8A] hover:text-white"
                    onClick={() =>
                      router.push(ad.table === 'annonser' ? `/salja?edit=${ad.id}` : `/hyra-ut?edit=${ad.id}`)
                    }
                  >
                    Redigera
                  </button>
                  <button
                    className="rounded-lg border px-3 py-1.5 text-sm font-semibold text-red-600 border-red-600 hover:bg-red-600 hover:text-white"
                    onClick={() => onDelete(ad)}
                  >
                    Ta bort
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
