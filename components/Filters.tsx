'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import {
  LayoutGrid,
  Home,
  Building2,
  Trees,
  Square,
  Package
} from 'lucide-react'

/* ------------------------ Hjälpare ------------------------ */
const formatSEKShort = (v: number) => {
  if (v < 1_000_000) return `${v.toLocaleString('sv-SE')} kr`
  const milj = v / 1_000_000
  return `${milj.toLocaleString('sv-SE')} milj kr`
}

const ROOM_OPTIONS: Array<{ label: string; value: string | number }> = [
  { label: 'Alla', value: '' },
  { label: '1 rum', value: 1 },
  { label: '1,5 rum', value: 1.5 },
  { label: '2 rum', value: 2 },
  { label: '2,5 rum', value: 2.5 },
  { label: '3 rum', value: 3 },
  { label: '3,5 rum', value: 3.5 },
  { label: '4 rum', value: 4 },
  { label: '5 rum', value: 5 },
  { label: '6 rum', value: 6 },
  { label: '7 rum', value: 7 },
  { label: '8 rum', value: 8 },
  { label: '10 rum', value: 10 },
  { label: '15 rum', value: 15 },
]

const AREA_MIN_OPTIONS: Array<{ label: string; value: string | number }> = [
  { label: 'Alla', value: '' },
  { label: '20 m²', value: 20 },
  { label: '25 m²', value: 25 },
  { label: '30 m²', value: 30 },
  { label: '35 m²', value: 35 },
  { label: '40 m²', value: 40 },
  { label: '45 m²', value: 45 },
  { label: '50 m²', value: 50 },
  { label: '55 m²', value: 55 },
  { label: '60 m²', value: 60 },
  { label: '65 m²', value: 65 },
  { label: '70 m²', value: 70 },
  { label: '75 m²', value: 75 },
  { label: '80 m²', value: 80 },
  { label: '85 m²', value: 85 },
  { label: '90 m²', value: 90 },
  { label: '95 m²', value: 95 },
  { label: '100 m²', value: 100 },
  { label: '105 m²', value: 105 },
  { label: '110 m²', value: 110 },
  { label: '115 m²', value: 115 },
  { label: '120 m²', value: 120 },
  { label: '125 m²', value: 125 },
  { label: '130 m²', value: 130 },
  { label: '135 m²', value: 135 },
  { label: '140 m²', value: 140 },
  { label: '145 m²', value: 145 },
  { label: '150 m²', value: 150 },
  { label: '155 m²', value: 155 },
  { label: '160 m²', value: 160 },
  { label: '170 m²', value: 170 },
  { label: '180 m²', value: 180 },
  { label: '200 m²', value: 200 },
  { label: '250 m²', value: 250 },
]

const PRICE_MAX_VALUES: number[] = [
  100_000, 200_000, 300_000, 400_000, 500_000, 750_000,
  1_000_000, 1_250_000, 1_500_000, 1_750_000,
  2_000_000, 2_250_000, 2_500_000, 2_750_000,
  3_000_000, 3_500_000, 4_000_000, 4_500_000,
  5_000_000, 5_500_000, 6_000_000,
  7_000_000, 8_000_000, 9_000_000,
  10_000_000, 11_000_000, 12_000_000, 13_000_000,
  15_000_000, 20_000_000,
]
const PRICE_MAX_OPTIONS: Array<{ label: string; value: string | number }> = [
  { label: 'Inget', value: '' },
  ...PRICE_MAX_VALUES.map(v => ({ label: formatSEKShort(v), value: v })),
]

// UI chip → DB-objekt
const UI_TO_API_OBJ: Record<string, string> = {
  'Alla typer': '',
  'Villor': 'Villa',
  'Par/Kedje/Radhus': 'Par/Kedjehus/Radhus',
  'Lägenheter': 'Lägenhet',
  'Fritidshus': 'Fritidshus',
  'Tomter': 'Tomt',
  'Gårdar/Skogar': 'Gård/Skog',
  'Övriga': 'Övrigt',
}

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/å/gi, 'a')
    .replace(/ä/gi, 'a')
    .replace(/ö/gi, 'o')
    .toLowerCase()

/* ------------------------ Sverige-data ------------------------ */
const SWEDISH_COUNTIES = [
  'Stockholms län','Uppsala län','Södermanlands län','Östergötlands län','Jönköpings län',
  'Kronobergs län','Kalmar län','Gotlands län','Blekinge län','Skåne län','Hallands län',
  'Västra Götalands län','Värmlands län','Örebro län','Västmanlands län','Dalarnas län',
  'Gävleborgs län','Västernorrlands län','Jämtlands län','Västerbottens län','Norrbottens län'
]

const SWEDISH_MUNICIPALITIES = [
  'Botkyrka','Danderyd','Ekerö','Haninge','Huddinge','Järfälla','Lidingö','Nacka','Norrtälje','Nykvarn',
  'Nynäshamn','Salem','Sigtuna','Sollentuna','Solna','Stockholm','Sundbyberg','Södertälje','Täby','Tyresö',
  'Upplands-Bro','Upplands Väsby','Vallentuna','Vaxholm','Värmdö','Österåker',
  'Enköping','Heby','Håbo','Knivsta','Tierp','Uppsala','Älvkarleby','Östhammar',
  'Eskilstuna','Flen','Gnesta','Katrineholm','Nyköping','Oxelösund','Strängnäs','Trosa','Vingåker',
  'Boxholm','Finspång','Kinda','Linköping','Mjölby','Motala','Norrköping','Söderköping','Vadstena','Valdemarsvik',
  'Ydre','Åtvidaberg','Ödeshög',
  'Aneby','Eksjö','Gislaved','Gnosjö','Habo','Jönköping','Mullsjö','Nässjö','Sävsjö','Tranås','Vaggeryd','Vetlanda','Värnamo',
  'Alvesta','Lessebo','Ljungby','Markaryd','Tingsryd','Uppvidinge','Växjö','Älmhult',
  'Borgholm','Emmaboda','Hultsfred','Högsby','Kalmar','Mönsterås','Mörbylånga','Nybro','Oskarshamn','Torsås','Vimmerby','Västervik',
  'Gotland',
  'Karlshamn','Karlskrona','Olofström','Ronneby','Sölvesborg',
  'Bjuv','Bromölla','Burlöv','Båstad','Eslöv','Helsingborg','Hässleholm','Hörby','Höör','Klippan','Kristianstad',
  'Kävlinge','Landskrona','Lomma','Lund','Malmö','Osby','Perstorp','Simrishamn','Sjöbo','Skurup','Staffanstorp',
  'Svalöv','Svedala','Tomelilla','Trelleborg','Vellinge','Ystad','Åstorp','Ängelholm','Örkelljunga','Östra Göinge','Höganäs',
  'Falkenberg','Halmstad','Hylte','Kungsbacka','Laholm','Varberg',
  'Ale','Alingsås','Bengtsfors','Bollebygd','Borås','Dals-Ed','Essunga','Falköping','Färgelanda','Grästorp','Gullspång',
  'Götene','Göteborg','Herrljunga','Hjo','Härryda','Karlsborg','Kungälv','Lerum','Lidköping','Lilla Edet','Lysekil',
  'Mariestad','Mark','Mellerud','Munkedal','Mölndal','Orust','Partille','Skara','Skövde','Sotenäs','Stenungsund',
  'Strömstad','Svenljunga','Tanum','Tibro','Tidaholm','Tjörn','Tranemo','Trollhättan','Töreboda','Uddevalla',
  'Ulricehamn','Vara','Vårgårda','Vänersborg','Åmål','Öckerö',
  'Arvika','Eda','Filipstad','Forshaga','Grums','Hagfors','Hammarö','Karlstad','Kil','Kristinehamn','Munkfors',
  'Storfors','Sunne','Säffle','Torsby','Årjäng',
  'Askersund','Degerfors','Hallsberg','Hällefors','Karlskoga','Kumla','Laxå','Lekeberg','Lindesberg','Ljusnarsberg','Nora','Örebro',
  'Arboga','Fagersta','Hallstahammar','Kungsör','Köping','Norberg','Sala','Skinnskatteberg','Surahammar','Västerås',
  'Avesta','Borlänge','Falun','Gagnef','Hedemora','Leksand','Ludvika','Malung-Sälen','Mora','Orsa','Rättvik','Smedjebacken','Säter','Vansbro','Älvdalen',
  'Bollnäs','Gävle','Hofors','Hudiksvall','Ljusdal','Nordanstig','Ockelbo','Ovanåker','Sandviken','Söderhamn',
  'Härnösand','Kramfors','Sollefteå','Sundsvall','Timrå','Ånge','Örnsköldsvik',
  'Berg','Bräcke','Härjedalen','Krokom','Ragunda','Strömsund','Åre','Östersund',
  'Bjurholm','Dorotea','Lycksele','Malå','Nordmaling','Norsjö','Robertsfors','Skellefteå','Sorsele','Storuman',
  'Umeå','Vilhelmina','Vindeln','Vännäs','Åsele',
  'Arjeplog','Arvidsjaur','Boden','Gällivare','Haparanda','Jokkmokk','Kalix','Kiruna','Luleå','Pajala','Piteå','Älvsbyn','Överkalix','Övertorneå'
]

type Suggestion = { type: 'county' | 'municipality'; name: string }

/* ------------------------ Komponent ------------------------ */
export default function Filters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const [open, setOpen] = useState(true)

  // === NEW: read initial tab from URL on first render to avoid flicker ===
  const initialTab: 'till_salu' | 'uthyres' = (() => {
    const k = (searchParams.get('kind') || searchParams.get('tab') || searchParams.get('mode') || '').toUpperCase()
    return k === 'RENT' ? 'uthyres' : 'till_salu'
  })()
  const [tab, setTab] = useState<'till_salu' | 'uthyres'>(initialTab)

  // Keep syncing if URL changes later
  useEffect(() => {
    const k = (searchParams.get('kind') || searchParams.get('tab') || searchParams.get('mode') || '').toUpperCase()
    const want: 'till_salu' | 'uthyres' = k === 'RENT' ? 'uthyres' : 'till_salu'
    if (want !== tab) setTab(want)
  }, [searchParams, tab])

  // Byta flik (på /annonser uppdaterar vi även URL:en)
  const switchTab = (next: 'till_salu' | 'uthyres') => {
    setTab(next)
    if (pathname === '/annonser') {
      const sp = new URLSearchParams(searchParams.toString())
      sp.set('kind', next === 'till_salu' ? 'SALE' : 'RENT')
      router.replace(`/annonser?${sp.toString()}`)
    }
  }

  // STATE
  const [query, setQuery] = useState('')
  const [radiusKm, setRadiusKm] = useState('0')
  const [selectedChip, setSelectedChip] = useState<string>('Alla typer')
  const [minRum, setMinRum] = useState<string>('')
  const [minBoarea, setMinBoarea] = useState<string>('')
  const [maxPris, setMaxPris] = useState<string>('')

  // Autocomplete (rullgardin)
  const [showSug, setShowSug] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current) return
      if (!wrapRef.current.contains(e.target as Node)) setShowSug(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const foldedQ = fold(query.trim())
  const matches = useMemo(() => {
    if (!foldedQ) return { counties: [] as Suggestion[], municipalities: [] as Suggestion[] }
    const starts = (s: string) => fold(s).startsWith(foldedQ)

    const counties = SWEDISH_COUNTIES
      .filter(starts)
      .slice(0, 8)
      .map<Suggestion>((name) => ({ type: 'county', name }))

    const municipalities = SWEDISH_MUNICIPALITIES
      .filter(starts)
      .slice(0, 20)
      .map<Suggestion>((name) => ({ type: 'municipality', name }))

    return { counties, municipalities }
  }, [foldedQ])

  const flat = useMemo(
    () => [...matches.counties, ...matches.municipalities],
    [matches]
  )

  const cta = useMemo(
    () => (tab === 'till_salu' ? 'Hitta bostäder till salu' : 'Hitta bostäder att hyra'),
    [tab]
  )

  const choose = (s: Suggestion) => {
    setQuery(s.name)
    setShowSug(false)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSug && ['ArrowDown', 'ArrowUp'].includes(e.key)) setShowSug(true)
    if (!flat.length) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => (i + 1) % flat.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => (i - 1 + flat.length) % flat.length)
    } else if (e.key === 'Enter') {
      if (activeIdx >= 0 && activeIdx < flat.length) {
        e.preventDefault()
        choose(flat[activeIdx])
      } else {
        setShowSug(false)
      }
    } else if (e.key === 'Escape') {
      setShowSug(false)
    }
  }

  // Navigera till /annonser
  const goSearch = () => {
    const sp = new URLSearchParams()
    sp.set('kind', tab === 'till_salu' ? 'SALE' : 'RENT')
    if (query.trim()) sp.set('q', query.trim())
    if (radiusKm !== '0') sp.set('radiusKm', radiusKm)

    const objekt = UI_TO_API_OBJ[selectedChip] || ''
    if (objekt) sp.set('objekt', objekt)

    if (minRum) sp.set('minRum', String(minRum))
    if (minBoarea) sp.set('minBoarea', String(minBoarea))
    if (maxPris) sp.set('maxPris', String(maxPris))

    router.push(`/annonser?${sp.toString()}`)
  }

  return (
    <div className="relative px-3 mt-6 md:mt-12">
      <div
        className={[
          'mx-auto md:ml-28 max-w-[560px]',
          'bg-white/95 backdrop-blur shadow-2xl ring-1 ring-black/5',
          'border border-slate-300 rounded-3xl overflow-hidden'
        ].join(' ')}
      >
        {/* Flikar */}
        <div className="flex gap-1 border-b border-slate-300">
          <button
            onClick={() => switchTab('till_salu')}
            className={[
              'flex-1 px-3 py-2 text-[13px] md:text-sm font-semibold rounded-t-3xl transition',
              tab === 'till_salu'
                ? 'bg-[#1E3A8A] text-white shadow-inner'
                : 'bg-white text-black hover:bg-slate-100'
            ].join(' ')}
          >
            Till salu
          </button>
          <button
            onClick={() => switchTab('uthyres')}
            className={[
              'flex-1 px-3 py-2 text-[13px] md:text-sm font-semibold rounded-t-3xl transition',
              tab === 'uthyres'
                ? 'bg-[#1E3A8A] text-white shadow-inner'
                : 'bg-white text-black hover:bg-slate-100'
            ].join(' ')}
          >
            Uthyres
          </button>
        </div>

        {/* Innehåll */}
        <div className="p-3 md:p-4">
          {/* Område */}
          <div className="mb-2" ref={wrapRef}>
            <label className="field-label">Område</label>
            <div className="search-row max-w-full md:max-w-[60%] relative">
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              <input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setShowSug(true); setActiveIdx(-1) }}
                onFocus={() => setShowSug(true)}
                onKeyDown={onKeyDown}
                placeholder="Skriv område eller adress"
                className="flex-1 text-[14px] leading-tight focus:outline-none"
                aria-autocomplete="list"
                aria-expanded={showSug}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
              />
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500">▾</span>
            </div>

            {/* RULLGARDIN */}
            {showSug && foldedQ && (matches.counties.length || matches.municipalities.length) ? (
              <div
                className="mt-2 max-w-full md:max-w-[60%] rounded-xl border border-slate-300 bg-white shadow-sm max-h-64 overflow-auto"
                role="listbox"
              >
                {matches.counties.length > 0 && (
                  <div className="py-1">
                    <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase text-slate-500">Län</div>
                    {matches.counties.map((s, i) => {
                      const idx = i
                      const active = activeIdx === idx
                      return (
                        <button
                          key={s.name}
                          type="button"
                          role="option"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => choose(s)}
                          className={`block w-full text-left px-3 py-2 text-sm ${active ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
                        >
                          {s.name}
                        </button>
                      )
                    })}
                  </div>
                )}

                {matches.municipalities.length > 0 && (
                  <div className="py-1 border-t border-slate-200">
                    <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase text-slate-500">Kommuner</div>
                    {matches.municipalities.map((s, i) => {
                      const idx = matches.counties.length + i
                      const active = activeIdx === idx
                      return (
                        <button
                          key={s.name}
                          type="button"
                          role="option"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => choose(s)}
                          className={`block w-full text-left px-3 py-2 text-sm ${active ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
                        >
                          {s.name}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Utöka område */}
          <div className="mb-2">
            <label className="field-label">Utöka område med</label>
            <div className="relative w-full md:max-w-[40%]">
              <select
                value={radiusKm}
                onChange={(e) => setRadiusKm(e.target.value)}
                className="w-full h-9 rounded-lg border border-slate-300 bg-white pl-2.5 pr-8 text-[14px] focus:border-[#1E3A8A]"
              >
                {[0, 2, 5, 10, 20, 50].map((km) => (
                  <option key={km} value={String(km)}>+ {km} km</option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                ▾
              </span>
            </div>
          </div>

          {/* Snabbval */}
          <div className="mb-2 space-y-2">
            <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center md:gap-2">
              {[
                { label: 'Alla typer', Icon: LayoutGrid },
                { label: 'Villor', Icon: Home },
                { label: 'Par/Kedje/Radhus', Icon: Building2 },
                { label: 'Lägenheter', Icon: Building2 },
              ].map(({ label, Icon }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setSelectedChip(label)}
                  className={`chip w-full md:w-auto !px-2.5 !py-1.5 text-[13px] md:text-sm ${selectedChip === label ? 'chip--active' : ''}`}
                >
                  <span aria-hidden className="text-slate-700">
                    <Icon size={16} strokeWidth={2} />
                  </span>
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>

            <div className="mt-1 grid grid-cols-2 gap-2 md:mt-0 md:flex md:flex-wrap md:items-center md:gap-2">
              {[
                { label: 'Fritidshus', Icon: Home },
                { label: 'Tomter', Icon: Square },
                { label: 'Gårdar/Skogar', Icon: Trees },
                { label: 'Övriga', Icon: Package },
              ].map(({ label, Icon }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setSelectedChip(label)}
                  className={`chip w-full md:w-auto !px-2.5 !py-1.5 text-[13px] md:text-sm ${selectedChip === label ? 'chip--active' : ''}`}
                >
                  <span aria-hidden className="text-slate-700">
                    <Icon size={16} strokeWidth={2} />
                  </span>
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Visa/Dölj sökfilter */}
          <div className="mb-1 md:mb-2">
            <button
              onClick={() => setOpen((v) => !v)}
              className="inline-flex items-center gap-2 text-[13px] md:text-sm font-semibold text-slate-900 hover:text-[#1E3A8A]"
            >
              <span>{open ? 'Dölj sökfilter' : 'Visa sökfilter'}</span>
              <span className={`transition ${open ? 'rotate-180' : ''}`}>▾</span>
            </button>
          </div>

          {/* Filter */}
          {open && (
            <div className="mb-1">
              <div className="grid grid-cols-3 gap-2 md:flex md:flex-wrap md:items-end md:gap-x-3 md:gap-y-2">
                <div className="flex flex-col gap-1">
                  <label className="field-label">Minst antal rum</label>
                  <select
                    value={minRum}
                    onChange={(e) => setMinRum(e.target.value)}
                    className="w-full md:w-[140px] h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-[14px] focus:border-[#1E3A8A]"
                  >
                    {ROOM_OPTIONS.map(opt => (
                      <option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="field-label">Minsta boarea</label>
                  <select
                    value={minBoarea}
                    onChange={(e) => setMinBoarea(e.target.value)}
                    className="w-full md:w-[140px] h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-[14px] focus:border-[#1E3A8A]"
                  >
                    {AREA_MIN_OPTIONS.map(opt => (
                      <option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="field-label">Högsta pris</label>
                  <select
                    value={maxPris}
                    onChange={(e) => setMaxPris(e.target.value)}
                    className="w-full md:w-[140px] h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-[14px] focus:border-[#1E3A8A]"
                  >
                    {PRICE_MAX_OPTIONS.map(opt => (
                      <option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="mt-3">
            <button
              onClick={goSearch}
              className="
                w-full rounded-xl px-4 py-2.5 text-[13px] md:text-sm font-semibold
                bg-[#1E3A8A] text-white
                shadow hover:bg-[#1E40AF] transition
              "
            >
              {cta}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
