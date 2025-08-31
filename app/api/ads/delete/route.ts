// app/api/ads/delete/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string

// Minimal JWT-dekodare för att hämta userId/email ur "sb-access-token"
function decodeJwt(token: string): any | null {
  try {
    const [, payloadB64] = token.split('.')
    const b64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/')
    const json = Buffer.from(b64, 'base64').toString('utf8')
    return JSON.parse(json)
  } catch {
    return null
  }
}

// Samla alla publika Storage-URL:er från en rad (rekursivt)
function collectImageUrls(row: any): string[] {
  const urls = new Set<string>()
  const visit = (v: any) => {
    if (!v) return
    if (typeof v === 'string') {
      // Matchar: /storage/v1/object/public/<bucket>/<path>
      if (/\/storage\/v1\/object\/public\/[^/]+\/.+/.test(v)) urls.add(v)
      return
    }
    if (Array.isArray(v)) {
      for (const x of v) visit(x)
      return
    }
    if (typeof v === 'object') {
      for (const x of Object.values(v)) visit(x)
    }
  }
  // Vanliga fält först – fall tillbaka till att söka igenom hela raden
  visit(row?.image_urls ?? row?.images ?? row?.photos ?? row)
  return Array.from(urls)
}

// Typa admin som any för att undvika TS-mismatch mellan olika SupabaseClient-generics
async function removeImages(admin: any, imageUrls: string[]) {
  const byBucket = new Map<string, string[]>()

  for (const u of imageUrls) {
    const m = u.match(/\/object\/public\/([^/]+)\/(.+)$/)
    if (!m) continue
    const bucket = m[1]
    const path = decodeURIComponent(m[2])
    if (!byBucket.has(bucket)) byBucket.set(bucket, [])
    byBucket.get(bucket)!.push(path)
  }

  for (const [bucket, paths] of byBucket.entries()) {
    for (let i = 0; i < paths.length; i += 100) {
      const chunk = paths.slice(i, i + 100)
      const { error } = await admin.storage.from(bucket).remove(chunk)
      if (error) throw error
    }
  }
}

export async function POST(req: Request) {
  try {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return new NextResponse('Saknar SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY i miljön.', { status: 500 })
    }

    const { id, table } = await req.json().catch(() => ({}))
    const allowed = ['annonser', 'uthyrning', 'listings']
    if (!id || !table || !allowed.includes(table)) {
      return new NextResponse('Felaktig request (id/table).', { status: 400 })
    }

    // Läs användare ur cookie (sb-access-token)
    const token = cookies().get('sb-access-token')?.value ?? null
    const jwt = token ? decodeJwt(token) : null
    const userId: string | null = jwt?.sub ?? null
    const email: string | null = (jwt?.email ?? jwt?.user_metadata?.email) ?? null
    if (!userId && !email) {
      return new NextResponse('Inte inloggad.', { status: 401 })
    }

    // Admin-klient (service role) för att läsa/radera oavsett RLS
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })

    // Läs raden
    const { data: row, error: readErr } = await admin.from(table).select('*').eq('id', id).single()
    if (readErr || !row) return new NextResponse('Annons hittades inte.', { status: 404 })

    // Ägarskapskontroll per tabell
    let emailOk = false
    let idOk = false

    if (table === 'listings') {
      // listings har (enligt ditt schema) user_id, ev. inga kontakt-emailfält
      idOk = !!(userId && (row.user_id === userId || row.created_by === userId || row.owner_id === userId))
      emailOk = !!(email && (row.contact_email === email || row.email === email))
    } else {
      // annonser/uthyrning: tillåt både id- och email-match om fälten finns
      idOk =
        !!(userId &&
          (row.created_by === userId || row.owner_id === userId || row.user_id === userId))
      emailOk = !!(email && (row.contact_email === email || row.email === email))
    }

    if (!emailOk && !idOk) {
      return new NextResponse('Du äger inte denna annons.', { status: 403 })
    }

    // Bild-cleanup (om URL:er hittas)
    const imageUrls = collectImageUrls(row)
    if (imageUrls.length > 0) {
      await removeImages(admin, imageUrls)
    }

    // Radera DB-raden
    const { error: delErr } = await admin.from(table).delete().eq('id', id)
    if (delErr) {
      return new NextResponse(`Kunde inte ta bort annons: ${delErr.message}`, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return new NextResponse(e?.message ?? 'Internt fel.', { status: 500 })
  }
}
