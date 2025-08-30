'use client'

import { useState } from 'react'

export default function NewListingPage() {
  const [saving, setSaving] = useState(false)

  return (
    <main className="min-h-screen bg-gray-50 text-slate-900">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="mb-6 text-2xl font-semibold">Skapa annons</h1>

        <form className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-semibold">Titel</label>
            <input className="w-full rounded-xl border border-slate-300 px-3 py-2" placeholder="Ex. 3 rok på Kungsholmen" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold">Adress</label>
              <input className="w-full rounded-xl border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Stad</label>
              <input className="w-full rounded-xl border border-slate-300 px-3 py-2" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-semibold">Rum</label>
              <input type="number" className="w-full rounded-xl border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Boarea (m²)</label>
              <input type="number" className="w-full rounded-xl border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Pris</label>
              <input type="number" className="w-full rounded-xl border border-slate-300 px-3 py-2" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">Beskrivning</label>
            <textarea rows={6} className="w-full rounded-xl border border-slate-300 px-3 py-2" />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">Bilder</label>
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">Dra & släpp bilder här eller klicka för att välja (implementeras)</div>
          </div>

          <button disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
            {saving ? 'Sparar…' : 'Publicera annons'}
          </button>
        </form>
      </div>
    </main>
  )
}
