import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  // TODO: Add real search; this is a stub
  const url = new URL(req.url)
  const q = url.searchParams.get('q') || ''

  const mock = [
    { id: '1', title: 'Lägenhet • 2 rum • 58 m²', city: 'Uppsala', price: 8500, period: 'kr/mån' },
    { id: '2', title: 'Villa • 5 rum • 150 m²', city: 'Västerås', price: 4200000, period: 'kr' }
  ]
  const data = mock.filter(x => x.title.toLowerCase().includes(q.toLowerCase()))
  return NextResponse.json({ items: data })
}
