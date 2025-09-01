'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Filters from '@/components/Filters';

type Listing = {
  id: string;
  kind: 'SALE' | 'RENT';
  objekt: string;
  upplatelseform: string;
  title: string;
  street: string;
  zip: string;
  city: string;
  room_count: number | null;
  living_area_m2: number | null;
  plot_area_m2: number | null;
  price: number | null;
  rent_per_month: number | null;
  description: string;
  image_urls: string[];
  created_at: string;
  status?: string | null;
};

type KindTab = 'SALE' | 'RENT';

const PAGE_SIZE = 12;

/* ---- helpers ---- */
const formatCurrency = (n: number) =>
  new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', minimumFractionDigits: 0 }).format(n);
const formatNumber = (n: number) =>
  new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 0 }).format(n);
const daysSince = (iso: string) => {
  const d = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24)));
  if (d === 0) return 'i dag';
  if (d === 1) return '1 dag';
  return `${d} dagar`;
};

// --- robust normalisering (matchar DB) ---
function deAccent(s: string) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/å/gi, 'a')
    .replace(/ä/gi, 'a')
    .replace(/ö/gi, 'o');
}
function normalizeKind(input: string | null | undefined): KindTab {
  if (!input) return 'SALE';
  const t = deAccent(String(input).trim().toLowerCase());
  if (['rent', 'uthyres', 'hyra', 'hyraut', 'uthyrning', 'u'].includes(t)) return 'RENT';
  if (['sale', 'tillsalu', 'salj', 'saljes', 's'].includes(t)) return 'SALE';
  if (String(input).toUpperCase() === 'RENT') return 'RENT';
  return 'SALE';
}
function normalizeObjekt(input: string | null | undefined): string {
  if (!input) return 'Alla';
  const t = deAccent(String(input).trim()).toLowerCase();
  const map: Record<string, string> = {
    villa: 'Villa',
    villor: 'Villa',
    'par/kedjehus/radhus': 'Par/Kedjehus/Radhus',
    'par/kedje/radhus': 'Par/Kedjehus/Radhus',
    parhus: 'Par/Kedjehus/Radhus',
    radhus: 'Par/Kedjehus/Radhus',
    kedjehus: 'Par/Kedjehus/Radhus',
    lagenhet: 'Lägenhet',
    lagenheter: 'Lägenhet',
    lägenhet: 'Lägenhet',
    lägenheter: 'Lägenhet',
    fritidshus: 'Fritidshus',
    tomt: 'Tomt',
    tomter: 'Tomt',
    'gard/skog': 'Gård/Skog',
    gard: 'Gård/Skog',
    skog: 'Gård/Skog',
    ovrigt: 'Övrigt',
    'övrigt': 'Övrigt',
    alla: 'Alla',
    'alla typer': 'Alla',
  };
  if (map[t]) return map[t];
  if (t.includes('par') && (t.includes('kedje') || t.includes('kedjehus')) && t.includes('radhus'))
    return 'Par/Kedjehus/Radhus';
  if (t.includes('lagen')) return 'Lägenhet';
  if (t.includes('villa')) return 'Villa';
  if (t.includes('fritid')) return 'Fritidshus';
  if (t.includes('tomt')) return 'Tomt';
  if (t.includes('gard') || t.includes('skog')) return 'Gård/Skog';
  if (t.includes('ovrig') || t.includes('övrig')) return 'Övrigt';
  return 'Alla';
}

/* ---- page ---- */
export default function ListingsPage() {
  const searchParams = useSearchParams();

  // filter-state (drivs av URL)
  const [tab, setTab] = useState<KindTab>('SALE');
  const [q, setQ] = useState('');
  const [objekt, setObjekt] = useState<string>('Alla');
  const [minPris, setMinPris] = useState('');
  const [maxPris, setMaxPris] = useState('');
  const [minRum, setMinRum] = useState('');
  const [minBoarea, setMinBoarea] = useState('');

  // data-state
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [initial, setInitial] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(0);

  // Läs URL-parametrar och ladda om när de ändras
  useEffect(() => {
    const sp = new URLSearchParams(searchParams?.toString());

    const kNorm = normalizeKind(sp.get('kind') || sp.get('tab') || sp.get('mode'));
    const qVal = sp.get('q') || '';
    const objNorm = normalizeObjekt(sp.get('objekt') || sp.get('type') || sp.get('kategori'));
    const minR = sp.get('minRum') || '';
    const minA = sp.get('minBoarea') || '';
    const minP = sp.get('minPris') || '';
    const maxP = sp.get('maxPris') || '';

    // uppdatera UI-state
    setTab(kNorm);
    setQ(qVal);
    setObjekt(objNorm);
    setMinRum(minR);
    setMinBoarea(minA);
    setMinPris(minP);
    setMaxPris(maxP);

    // Ladda sida 0 med OVERRIDES (så första query alltid får rätt filter)
    pageRef.current = 0;
    setItems([]);
    setHasMore(true);
    loadPage(0, true, {
      tab: kNorm,
      q: qVal,
      objekt: objNorm,
      minRum: minR,
      minBoarea: minA,
      minPris: minP,
      maxPris: maxP,
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams?.toString()]);

  // Håll URL:ens ?kind i synk med aktiv flik så Filters inte defaultar till SALE
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    const current = sp.get('kind');
    if (current !== tab) {
      sp.set('kind', tab);
      const newUrl = `${window.location.pathname}?${sp.toString()}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, [tab]);

  type Overrides = {
    tab?: KindTab;
    q?: string;
    objekt?: string;
    minPris?: string;
    maxPris?: string;
    minRum?: string;
    minBoarea?: string;
  };

  async function loadPage(page: number, replace = false, o: Overrides = {}) {
    if (loading || (!hasMore && !replace)) return;
    setLoading(true);

    // använd overrides om de finns (första laddningen), annars state
    const _tab = o.tab ?? tab;
    const _q = o.q ?? q;
    const _objekt = o.objekt ?? objekt;
    const _minPris = o.minPris ?? minPris;
    const _maxPris = o.maxPris ?? maxPris;
    const _minRum = o.minRum ?? minRum;
    const _minBoarea = o.minBoarea ?? minBoarea;

    try {
      let query = supabase
        .from('listings')
        .select(
          'id, kind, objekt, upplatelseform, title, street, zip, city, room_count, living_area_m2, plot_area_m2, price, rent_per_month, description, image_urls, created_at, status'
        )
        .eq('kind', _tab)              // <-- HÅRD AVGRÄNSNING: SALE/RENT
        .eq('status', 'published');    // <-- visa bara publicerade

      if (_q.trim()) {
        const s = `%${_q.trim()}%`;
        query = query.or(`city.ilike.${s},title.ilike.${s}`);
      }

      // Objektfilter (om inte "Alla")
      if (_objekt !== 'Alla') query = query.eq('objekt', _objekt);

      const toInt = (s: string) => {
        const t = s.replace(/\s+/g, '');
        if (!t) return null;
        const n = parseInt(t, 10);
        return Number.isFinite(n) ? n : null;
      };
      const toFloat = (s: string) => {
        const t = s.replace(',', '.');
        if (!t) return null;
        const n = parseFloat(t);
        return Number.isFinite(n) ? n : null;
      };

      const min = toInt(_minPris);
      const max = toInt(_maxPris);
      if (_tab === 'SALE') {
        if (min != null) query = query.gte('price', min);
        if (max != null) query = query.lte('price', max);
      } else {
        if (min != null) query = query.gte('rent_per_month', min);
        if (max != null) query = query.lte('rent_per_month', max);
      }

      const minR = toFloat(_minRum);
      if (minR != null) query = query.gte('room_count', minR);
      const minA = toFloat(_minBoarea);
      if (minA != null) query = query.gte('living_area_m2', minA);

      // sort: nyast först
      query = query.order('created_at', { ascending: false, nullsFirst: false });

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, error } = await query;
      if (error) throw error;

      const next = (data ?? []) as Listing[];
      setItems((prev) => (replace ? next : [...prev, ...next]));
      setHasMore(next.length === PAGE_SIZE);
      pageRef.current = page;
      setInitial(false);
    } catch (err) {
      console.error(err);
      setHasMore(false);
      setInitial(false);
    } finally {
      setLoading(false);
    }
  }

  const sentinelRef = useInfiniteScroll(() => {
    if (!loading && hasMore) loadPage(pageRef.current + 1);
  });

  const headerTitle = tab === 'SALE' ? 'Till salu' : 'Uthyres';

  return (
    <div className="mx-auto w-full max-w-6xl px-3 py-6 md:px-4 md:py-8">
      {/* Filterrutan – oförändrad layout */}
      <div className="mb-4 md:mb-6">
        <Filters />
      </div>

      {/* LISTNINGSCOLUMN */}
      <div className="w-full max-w-[840px] mx-auto md:mx-0 md:ml-28 md:pl-3">
        {/* Result header */}
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">{headerTitle}</h1>
          <span className="text-sm text-slate-600">{items.length} träffar</span>
        </div>

        {/* Cards */}
        <div className="space-y-3">
          {items.map((it) => (
            <ListingCard key={it.id} it={it} tab={tab} />
          ))}

          {initial && (
            <div className="rounded-xl border border-slate-200 bg-white/70 p-6 text-center text-slate-600 shadow-sm">
              Laddar annonser…
            </div>
          )}
          {!initial && items.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white/70 p-6 text-center text-slate-600 shadow-sm">
              Inga annonser matchar filtren.
            </div>
          )}

          <div ref={sentinelRef} />
          {loading && items.length > 0 && (
            <div className="py-3 text-center text-sm text-slate-500">Laddar fler…</div>
          )}
          {!hasMore && items.length > 0 && (
            <div className="py-3 text-center text-sm text-slate-500">Inga fler resultat.</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---- card ---- */
function ListingCard({ it, tab }: { it: Listing; tab: KindTab }) {
  const priceLabel =
    tab === 'SALE'
      ? it.price != null
        ? formatCurrency(it.price)
        : 'Pris ej angett'
      : it.rent_per_month != null
      ? `${formatCurrency(it.rent_per_month)} / mån`
      : 'Hyra ej angett';

  const subtitleBits = [
    it.city,
    it.living_area_m2 ? `${formatNumber(it.living_area_m2)} m²` : null,
    it.room_count ? `${formatNumber(Number(it.room_count))} rum` : null,
  ].filter(Boolean);

  const plotBit = it.plot_area_m2 ? `${formatNumber(it.plot_area_m2)} m² tomt` : null;

  // --- Bildnavigering på kortet (layout orörd) ---
  const images = Array.isArray(it.image_urls) ? it.image_urls : [];
  const total = images.length;
  const [idx, setIdx] = useState(0);
  const prevImg = () => setIdx((i) => (i - 1 + total) % total);
  const nextImg = () => setIdx((i) => (i + 1) % total);

  const since = daysSince(it.created_at);

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-sm backdrop-blur">
      <div className="grid gap-0 md:grid-cols-[280px,1fr]">
        <div className="relative">
          {total > 0 ? (
            <>
              <img src={images[idx]} alt={it.title} className="h-52 w-full object-cover md:h-full" />
              {total > 1 && (
                <>
                  <button
                    type="button"
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow hover:bg-white"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); prevImg(); }}
                    aria-label="Föregående bild"
                    title="Föregående"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow hover:bg-white"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); nextImg(); }}
                    aria-label="Nästa bild"
                    title="Nästa"
                  >
                    ›
                  </button>
                  <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/40 px-2 py-0.5 text-xs text-white">
                    {idx + 1} / {total}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="grid h-52 w-full place-items-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400 md:h-full">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 11l9-7 9 7" />
                <path d="M9 22V12h6v10" />
              </svg>
            </div>
          )}
          <span className="absolute left-2 top-2 rounded-md bg-white/90 px-2 py-1 text-xs font-medium text-slate-700 shadow">
            {since}
          </span>
        </div>

        <div className="flex flex-col gap-2 p-3 md:p-4">
          <div className="flex items-start justify-between gap-2">
            <h2 className="line-clamp-1 text-[15px] font-semibold text-slate-900 md:text-[17px]">{it.title}</h2>
            <a
              href={`/annons/${it.id}`}
              className="shrink-0 rounded-lg bg-[#1E3A8A] px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-[#183170] md:hidden"
            >
              Visa
            </a>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 text-sm text-slate-600">
            <span className="rounded-md bg-[#1E3A8A]/10 px-1.5 py-0.5 text-[12px] font-medium text-[#1E3A8A]">
              {it.objekt}
            </span>
            <span className="line-clamp-1">{subtitleBits.join(' · ')}</span>
            {plotBit && <span className="hidden md:inline">· {plotBit}</span>}
          </div>
          <div className="text-[15px] font-semibold text-slate-900 md:text-[16px]">{priceLabel}</div>
          <p className="line-clamp-2 text-[13px] text-slate-600 md:line-clamp-3 md:text-[14px]">{it.description}</p>
          <div className="mt-auto hidden items-center justify-end pt-1 md:flex">
            <a
              href={`/annons/${it.id}`}
              className="rounded-lg bg-[#1E3A8A] px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-[#183170]">
              Visa
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ---- hook ---- */
function useInfiniteScroll(onHit: () => void) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => { for (const e of entries) if (e.isIntersecting) onHit(); },
      { rootMargin: '600px 0px 600px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [onHit]);
  return ref;
}
