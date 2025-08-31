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
  table: 'annonser' | 'uthyrning' | 'listings'
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
      unsub = () => sub?.subscription.unsubscribe()
    })()
    return () => unsub()
  }, [router])

  // — Hämta mina annonser
  useEffect(() => {
    if (auth !== 'authed') return
    void fetchAll()
  }, [auth])

  const isMissingColumn = (err: any) => {
    const msg = `${err?.message ?? ''} ${err?.details ?? ''} ${err?.hint ?? ''}`.toLowerCase()
    return msg.includes('column') && msg.includes('does not exist')
  }

  async function fetchForTable(
    table: 'annonser' | 'uthyrning',
    userId: string | null,
    email: string | null
  ) {
    // Pröva vanliga ägarkolumner; hoppa över saknade kolumner utan att krascha
    const candidates: Array<{ col: string; val: string | null }> = [
      { col: 'created_by', val: userId },
      { col: 'owner_id',   val: userId },
      { col: 'user_id',    val: userId },
      { col: 'contact_email', val: email },
      { col: 'email',         val: email },
    ]

    for (const c of candidates) {
      if (!c.val) continue
      const query = (supabase as any)
        .from(table as any)
        .select('id, title, created_at' as any)
        .eq(c.col as any, c.val as any)
        .order('created_at', { ascending: false } as any)

      const { data, error } = await query
      if (error) {
        if (isMissingColumn(error)) continue
        throw error
      }
      if (Array.isArray(data) && data.length > 0) return data
    }

    // Fallback: läs det som RLS ändå tillåter
    const { data, error } = await (supabase as any)
      .from(table as any)
      .select('id, title, created_at' as any)
      .order('created_at', { ascending: false } as any)
    if (error) throw error
    return data ?? []
  }

  // NY: hämta från public.listings (där dina poster finns)
  async function fetchFromListings(userId: string | null, email: string | null) {
    // Försök i första hand på user_id (kolumnen finns enligt ditt schema)
    if (userId) {
      const { data, error } = await (supabase as any)
        .from('listings' as any)
        .select('id, kind, title, created_at, user_id' as any)
        .eq('user_id' as any, userId as any)
        .order('created_at', { ascending: false } as any)

      if (error && !isMissingColumn(error)) throw error
      if (Array.isArray(data) && data.length > 0) return data
    }

    // Fallback: prova e-postkolumner om de råkar finnas
    const emailCols = ['contact_email', 'email']
    for (const col of emailCols) {
      if (!email) continue
      const { data, error } = await (supabase as any)
        .from('listings' as any)
        .select('id, kind, title, created_at' as any)
        .eq(col as any, email as any)
        .order('created_at', { ascending: false } as any)

      if (error) {
        if (isMissingColumn(error)) continue
        throw error
      }
      if (Array.isArray(data) && data.length > 0) return data
    }

    // Slutlig fallback (om RLS tillåter): läs allt, vi filtrerar i klienten.
    const { data, error } = await (supabase as any)
      .from('listings' as any)
      .select('id, kind, title, created_at, user_id' as any)
      .order('created_at', { ascending: false } as any)
    if (error) throw error
    // Filtrera på userId om möjligt
    return (data ?? []).filter((r: any) => !userId || r?.user_id === userId)
  }

  async function fetchAll() {
    setLoading(true)
    setError(null)
    try {
      const { data: udata, error: uerr } = await supabase.auth.getUser()
      if (uerr) throw uerr
      const userId = udata.user?.id ?? null
      const email = udata.user?.email ?? null

      // Tidigare två tabeller
      const sale = await fetchForTable('annonser',  userId, email)
      const rent = await fetchForTable('uthyrning', userId, email)

      // NY: även från listings
      const lst = await fetchFromListings(userId, email)

      const merged: Item[] = [
        ...(sale ?? []).map((r: any) => ({
          id: String(r.id),
          title: r?.title ?? null,
          created_at: String(r?.created_at),
          kind: 'sale' as const,
          table: 'annonser' as const,
        })),
        ...(rent ?? []).map((r: any) => ({
          id: String(r.id),
          title: r?.title ?? null,
          created_at: String(r?.created_at),
          kind: 'rent' as const,
          table: 'uthyrning' as const,
        })),
        ...(lst ?? []).map((r: any) => ({
          id: String(r.id),
          title: r?.title ?? null,
          created_at: String(r?.created_at),
          // listings.kind kan vara 'SALE'/'RENT' eller redan lowercase
          kind: (String(r?.kind || '').toLowerCase() === 'rent' ? 'rent' : 'sale') as 'sale' | 'rent',
          table: 'listings' as const,
        })),
      ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))

      setItems(merged)
    } catch (err: any) {
      setError(err?.message || 'Kunde inte hämta dina annonser.')
    } finally {
      setLoading(false)
    }
  }

  // OBS: Delete för 'listings' aktiveras i nästa steg (API-route + bildrensning).
  async function handleDelete(item: Item) {
    const ok = confirm('Vill du ta bort den här annonsen? Alla bilder raderas. Detta går inte att ångra.')
    if (!ok) return
    try {
      const res = await fetch('/api/ads/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, table: item.table }),
      })
      if (!res.ok) {
        const msg = await res.text()
        throw new Error(msg || 'Kunde inte ta bort annonsen.')
      }
      await fetchAll()
    } catch (e: any) {
      alert(e?.message || 'Kunde inte ta bort annonsen.')
    }
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
                  {/* Gå till annons */}
                  <a
                    href={
                      it.table === 'annonser'
                        ? `/annonser/${it.id}`
                        : it.table === 'uthyrning'
                        ? `/uthyrning/${it.id}`
                        : `/annons/${it.id}` /* listings */
                    }
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Gå till annons
                  </a>

                  {/* Redigera */}
                  <a
                    href={
                      it.table === 'annonser'
                        ? `/annonser/${it.id}/redigera`
                        : it.table === 'uthyrning'
                        ? `/uthyrning/${it.id}/redigera`
                        : `/annons/${it.id}/redigera` /* listings */
                    }
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Redigera
                  </a>

                  {/* Ta bort */}
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
