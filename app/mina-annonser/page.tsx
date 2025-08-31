'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

/** Byt till ditt faktiska tabellnamn  */
const LISTINGS_TABLE = 'annonser'

type Row = Record<string, any>
const SKIP_KEYS = new Set([
  'id',
  'created_at',
  'updated_at',
  'inserted_at',
  'user_id',
  'owner_id',
  'author_id',
  'created_by',
  'profile_id',
])

export default function MinaAnnonserPage() {
  const router = useRouter()
  const [checkedAuth, setCheckedAuth] = useState(false)

  // ------- NYTT: state för listning / CRUD -------
  const [rows, setRows] = useState<Row[]>([])
  const [loadingRows, setLoadingRows] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editing, setEditing] = useState<Row | null>(null)
  const [editDraft, setEditDraft] = useState<Row>({})
  // -----------------------------------------------

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

  // ------- NYTT: hämta annonser när vi vet att vi är inloggade -------
  useEffect(() => {
    if (!checkedAuth) return
    let active = true
    ;(async () => {
      try {
        setLoadingRows(true)
        setError(null)

        // Antag RLS (owner = auth.uid()). Om du inte har RLS kan du lägga till .eq('user_id', uid) här.
        const { data, error } = await supabase
          .from(LISTINGS_TABLE)
          .select('*')
        if (error) throw error
        if (!active) return
        setRows(data ?? [])
      } catch (e: any) {
        if (!active) return
        setError(e?.message || 'Kunde inte hämta dina annonser.')
      } finally {
        if (active) setLoadingRows(false)
      }
    })()
    return () => {
      active = false
    }
  }, [checkedAuth])
  // -------------------------------------------------------------------

  // ------- NYTT: CRUD-hjälpare -------
  const startEdit = (row: Row) => {
    setEditing(row)
    const draft: Row = {}
    Object.keys(row).forEach((k) => {
      if (!SKIP_KEYS.has(k)) draft[k] = row[k]
    })
    setEditDraft(draft)
  }

  const saveEdit = async () => {
    if (!editing?.id) return
    try {
      const { error } = await supabase
        .from(LISTINGS_TABLE)
        .update(editDraft)
        .eq('id', editing.id)
      if (error) throw error
      setRows((prev) => prev.map((r) => (r.id === editing.id ? { ...r, ...editDraft } : r)))
      setEditing(null)
    } catch (e: any) {
      alert(e?.message || 'Kunde inte spara ändringar.')
    }
  }

  const remove = async (row: Row) => {
    if (!row?.id) return
    const ok = confirm('Ta bort annonsen? Detta går inte att ångra.')
    if (!ok) return
    try {
      const { error } = await supabase
        .from(LISTINGS_TABLE)
        .delete()
        .eq('id', row.id)
      if (error) throw error
      setRows((prev) => prev.filter((r) => r.id !== row.id))
    } catch (e: any) {
      alert(e?.message || 'Kunde inte ta bort annonsen.')
    }
  }
  // -----------------------------------

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

        {/* ------- NYTT: innehåll istället för placeholder ------- */}
        {loadingRows && <p className="text-slate-700">Hämtar dina annonser…</p>}

        {!loadingRows && error && (
          <p className="text-red-600">{error}</p>
        )}

        {!loadingRows && !error && rows.length === 0 && (
          <p className="text-slate-700">Du har inga publicerade annonser ännu.</p>
        )}

        {!loadingRows && !error && rows.length > 0 && (
          <ul className="mt-3 grid gap-3">
            {rows.map((row) => (
              <li key={row.id} className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-semibold text-slate-900">
                      {row.title || row.rubrik || `Annons #${row.id}`}
                    </div>
                    {row.description || row.beskrivning ? (
                      <div className="mt-1 text-sm text-slate-600">
                        {row.description || row.beskrivning}
                      </div>
                    ) : null}
                    {row.created_at ? (
                      <div className="mt-1 text-xs text-slate-500">
                        {new Date(row.created_at).toLocaleString()}
                      </div>
                    ) : null}
                  </div>

                  <div className="shrink-0 space-x-2">
                    <button
                      type="button"
                      onClick={() => startEdit(row)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Redigera
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(row)}
                      className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50"
                    >
                      Ta bort
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        {/* ------------------------------------------------------ */}
      </div>

      {/* ------- NYTT: enkel redigeringsmodal ------- */}
      {editing && (
        <div
          role="dialog"
          aria-modal
          className="fixed inset-0 z-[80] grid place-items-center bg-black/40 p-3"
          onClick={() => setEditing(null)}
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 text-[15px] font-semibold">Redigera annons</div>

            <div className="grid gap-3">
              {Object.keys(editDraft).map((k) => {
                const val = editDraft[k]
                const type =
                  typeof val === 'number'
                    ? 'number'
                    : typeof val === 'boolean'
                    ? 'checkbox'
                    : 'text'
                return (
                  <label key={k} className="grid gap-1 text-sm">
                    <span className="text-slate-600">{labelify(k)}</span>
                    {type === 'checkbox' ? (
                      <input
                        type="checkbox"
                        checked={Boolean(editDraft[k])}
                        onChange={(e) =>
                          setEditDraft((d) => ({ ...d, [k]: e.target.checked }))
                        }
                      />
                    ) : (
                      <input
                        className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-[14px] focus:border-[#1E3A8A] focus:outline-none"
                        type={type}
                        value={val ?? ''}
                        onChange={(e) =>
                          setEditDraft((d) => ({
                            ...d,
                            [k]:
                              type === 'number'
                                ? Number(e.target.value)
                                : e.target.value,
                          }))
                        }
                      />
                    )}
                  </label>
                )
              })}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Avbryt
              </button>
              <button
                type="button"
                onClick={saveEdit}
                className="rounded-lg bg-[#1E3A8A] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#1E40AF]"
              >
                Spara
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ------------------------------------------- */}
    </main>
  )
}

function labelify(key: string) {
  return key
    .replace(/_/g, ' ')
    .replace(/(^|\s)\S/g, (s) => s.toUpperCase())
}
