'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type AuthState = 'checking' | 'authed' | 'anon'

type Item = {
  id: string
  title: string | null
  created_at: string
  kind: 'sale' | 'rent'
  table: 'annonser' | 'uthyrning'
}

export default function MinaAnnonserPage() {
  const router = useRouter()
  const [auth, setAuth] = useState<AuthState>('checking')
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // — Auth-kontroll (samma beteende som tidigare)
  useEffect(() => {
    let unsub = () => {}
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        setAuth('anon')
        router.replace('/')
        return
      }
      setAuth('authed')
      const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
        if (!s) router.replace('/')
      })
      unsub = () => sub.subscription.unsubscribe()
    })()
    return () => unsub()
  }, [router])

  // — Hämta mina annonser (både till salu & uthyrning)
  useEffect(() => {
    if (auth !== 'authed') return
    void fetchAll()
  }, [auth])

  async function fetchAll() {
    setLoading(true)
    setError(null)
    try {
      // Till salu
      const { data: sale, error: e1 } = await supabase
        .from('annonser')
        .select('id, title, created_at')
        .order('created_at', { ascending: false })
      if (e1) throw e1

      // Uthyres
      const { data: rent, error: e2 } = await supabase
        .from('uthyrning')
        .select('id, title, created_at')
        .order('created_at', { ascending: false })
      if (e2) throw e2

      const merged: Item[] = [
        ...(sale ?? []).map((r) => ({
          id: String(r.id),
          title: (r as any).title ?? null,
          created_at: String((r as any).created_at),
          kind: 'sale' as const,
          table: 'annonser' as const,
        })),
        ...(rent ?? []).map((r) => ({
          id: String(r.id),
          title: (r as any).title ?? null,
          created_at: String((r as any).created_at),
          kind: 'rent' as const,
          table: 'uthyrning' as const,
        })),
      ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))

      setItems(merged)
    } catch (err: any) {
      setError(err?.message || 'Kunde inte hämta dina annonser.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(item: Item) {
    const ok = confirm('Vill du ta bort den här annonsen? Detta går inte att ångra.')
    if (!ok) return
    const { error } = await supabase.from(item.table).delete().eq('id', item.id)
    if (error) {
      alert(error.message || 'Kunde inte ta bort annonsen.')
      return
    }
    // Uppdatera listan
    await fetchAll()
  }

  if (auth === 'checking') {
    return (
      <main className="mx-auto max-w-md p-6">
        <div className="bg-white/95 backdrop-blur shadow-2xl ring-1 ring-black/5 border border-slate-300 rounded-3xl p-6">
          <p className="text-slate-700">Laddar…</p>
        </div>
      </main>
    )
  }

  if (auth === 'anon') return null

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="bg-white/95 backdrop-blur shadow-2xl ring-1 ring-black/5 border border-slate-300 rounded-3xl p-6">
        <h1 className="text-lg font-semibold mb-2">Mina annonser</h1>

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        {loading ? (
          <p className="text-slate-700">Hämtar dina annonser…</p>
        ) : items.length === 0 ? (
          <p className="text-slate-700">Du har inga publicerade annonser ännu.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {items.map((it) => (
              <li
                key={`${it.table}_${it.id}`}
                className="rounded-2xl border border-slate-200 p-4 flex items-start justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        it.kind === 'sale'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-sky-50 text-sky-700 border border-sky-200'
                      }`}
                    >
                      {it.kind === 'sale' ? 'Till salu' : 'Uthyres'}
                    </span>
                    <span className="text-[12px] text-slate-500">
                      {new Date(it.created_at).toLocaleDateString('sv-SE', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="mt-1 font-medium text-slate-900">
                    {it.title || 'Annons utan titel'}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Justera länkarna om du har andra redigeringsrutter */}
                  <a
                    href={it.table === 'annonser' ? `/annonser/${it.id}/redigera` : `/uthyrning/${it.id}/redigera`}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Redigera
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDelete(it)}
                    className="rounded-lg border border-red-300 px-3 py-1.5 text-[13px] font-semibold text-red-700 hover:bg-red-50"
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
