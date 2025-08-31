// app/api/listings/update/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string

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

export async function POST(req: Request) {
  try {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return new NextResponse('Saknar SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY i miljön.', { status: 500 })
    }

    const { id, payload } = await req.json().catch(() => ({}))
    if (!id || !payload || typeof payload !== 'object') {
      return new NextResponse('Felaktig request.', { status: 400 })
    }

    // Läs token från Authorization: Bearer <token>
    const authHeader = req.headers.get('authorization') || ''
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!bearer) return new NextResponse('Inte inloggad.', { status: 401 })

    const jwt = decodeJwt(bearer)
    const userId: string | null = jwt?.sub ?? null
    if (!userId) return new NextResponse('Inte inloggad.', { status: 401 })

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })

    // Läs raden och verifiera ägarskap
    const { data: row, error: readErr } = await admin.from('listings').select('id,user_id').eq('id', id).single()
    if (readErr || !row) return new NextResponse('Annons hittades inte.', { status: 404 })
    if (row.user_id !== userId) return new NextResponse('Du äger inte denna annons.', { status: 403 })

    // Tillåt endast kända kolumner
    const allowed = new Set([
      'kind','objekt','upplatelseform','price','rent_per_month','rental_period',
      'title','street','zip','city',
      'room_count','living_area_m2','balcony','floor','elevator',
      'plot_area_m2','patio','va_connection','building_rights',
      'association','energy_class','fee_per_month','price_per_m2',
      'includes_electricity','includes_heating','includes_water','includes_internet',
      'contact_first_name','contact_last_name','contact_phone','contact_email',
      'description','image_urls','status'
    ])
    const clean: Record<string, any> = {}
    for (const [k, v] of Object.entries(payload)) {
      if (allowed.has(k)) clean[k] = v
    }

    const { error: updErr } = await admin.from('listings').update(clean).eq('id', id)
    if (updErr) return new NextResponse(`Kunde inte uppdatera: ${updErr.message}`, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return new NextResponse(e?.message ?? 'Internt fel.', { status: 500 })
  }
}
