'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Gallery from '@/components/Gallery';

type Listing = {
  id: string;
  kind: 'SALE' | 'RENT';
  objekt: string;
  upplatelseform: string | null;
  title: string;
  street: string | null;
  zip: string | null;
  city: string | null;

  room_count: number | null;
  living_area_m2: number | null;
  plot_area_m2: number | null;

  // Lägenhet
  balcony: boolean | null;
  floor: number | null;
  elevator: boolean | null;

  // Hus/mark
  patio: boolean | null;
  va_connection: boolean | null;

  // Ekonomi
  price: number | null;
  rent_per_month: number | null;
  rental_period: string | null;
  fee_per_month: number | null;
  energy_class: string | null;

  // Drift
  includes_electricity: boolean | null;
  includes_heating: boolean | null;
  includes_water: boolean | null;
  includes_internet: boolean | null;

  description: string;
  image_urls: string[];
  created_at: string;

  // Kontakt
  contact_first_name: string | null;
  contact_last_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
};

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', minimumFractionDigits: 0 }).format(n);
const fmtNum = (n: number) => new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 0 }).format(n);

const jaNej = (v: boolean | null | undefined) =>
  v === true ? 'Ja' : v === false ? 'Nej' : '–';
const ingar = (v: boolean | null | undefined) =>
  v === true ? 'Ingår' : v === false ? 'Ingår ej' : '–';

export default function ListingDetailPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.from('listings').select('*').eq('id', params.id).single();
      if (!mounted) return;
      if (error) setError(error.message);
      setData(data as Listing | null);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [params.id]);

  const images = data?.image_urls?.length ? data.image_urls : [];
  const priceLabel =
    data?.kind === 'SALE'
      ? data?.price != null
        ? fmtCurrency(data.price)
        : 'Pris ej angett'
      : data?.rent_per_month != null
      ? `${fmtCurrency(data.rent_per_month)} / mån`
      : 'Hyra ej angett';

  const chipFacts = useMemo(() => {
    if (!data) return [] as string[];
    const arr: string[] = [];
    if (data.living_area_m2) arr.push(`${fmtNum(data.living_area_m2)} m²`);
    if (data.room_count) arr.push(`${fmtNum(Number(data.room_count))} rum`);
    if (data.plot_area_m2) arr.push(`${fmtNum(data.plot_area_m2)} m² tomt`);
    if (data.kind === 'RENT' && data.rental_period) arr.push(data.rental_period);
    if (data.energy_class && data.energy_class !== 'Ej specificerat') arr.push(`Energiklass ${data.energy_class}`);
    if (data.fee_per_month && data.kind === 'SALE') arr.push(`Avgift ${fmtCurrency(data.fee_per_month)}/mån`);
    return arr;
  }, [data]);

  const fullAddress = data ? `${data.street ? `${data.street}, ` : ''}${data.city ?? ''}` : '';

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-3 py-6 md:px-4 md:py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-56 w-full rounded-2xl bg-slate-200 md:h-80" />
          <div className="h-5 w-2/3 rounded bg-slate-200" />
          <div className="h-4 w-1/3 rounded bg-slate-200" />
          <div className="h-28 w-full rounded-2xl bg-slate-200" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto w-full max-w-3xl px-3 py-10 text-center text-slate-700">
        {error ? `Fel: ${error}` : 'Annonsen kunde inte hittas.'}
        <div className="mt-4">
          <a href="/annonser" className="rounded-lg bg-[#1E3A8A] px-4 py-2 text-sm font-semibold text-white">
            Tillbaka till annonser
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-3 py-6 md:px-4 md:py-8">
      {/* top actions */}
      <div className="mb-3 flex items-center justify-between">
        <a
          href="/annonser"
          className="rounded-lg border border-slate-300 bg-white/80 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
        >
          ← Till annonser
        </a>
        <span className="rounded-md bg-[#1E3A8A]/10 px-2 py-1 text-xs font-medium text-[#1E3A8A]">
          {data.objekt}
        </span>
      </div>

      {/* Gallery */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-sm">
        <Gallery images={images} aspect="16/9" showThumbs enableGlobalKeys alt={data.title} />
      </div>

      {/* Content */}
      <div className="mt-4">
        <div className="divide-y divide-slate-200 rounded-2xl bg-white/95 shadow-xl ring-1 ring-black/5">
          {/* Header */}
          <section className="p-5 sm:p-8">
            <div className="text-sm text-slate-500">{data.kind === 'SALE' ? 'Pris' : 'Hyra'}</div>
            <div className="mt-1 text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl">
              {priceLabel}
            </div>

            <h1 className="mt-3 text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">
              {data.title}
            </h1>
            <div className="mt-1 text-slate-600">{fullAddress}</div>

            <div className="mt-4 flex flex-wrap gap-2">
              {chipFacts.map((f, i) => (
                <span
                  key={i}
                  className="inline-flex items-center rounded-full border border-black/10 bg-white/70 px-3 py-1 text-sm text-gray-700"
                >
                  {f}
                </span>
              ))}
            </div>
          </section>

          {/* Description */}
          <section className="p-5 sm:p-8">
            <h2 className="text-base font-semibold text-gray-900">Beskrivning</h2>
            <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-slate-800">
              {data.description}
            </p>
          </section>

          {/* Contact */}
          <section className="p-5 sm:p-8">
            <h3 className="text-base font-semibold text-gray-900">Kontakt</h3>
            {([data.contact_first_name, data.contact_last_name, data.contact_phone, data.contact_email].some(Boolean)) ? (
              <div className="mt-4">
                {([data.contact_first_name, data.contact_last_name].some(Boolean)) && (
                  <div className="text-[15px] font-semibold text-slate-900">
                    {[data.contact_first_name, data.contact_last_name].filter(Boolean).join(' ')}
                  </div>
                )}
                <div className="mt-1 space-y-1 text-sm text-slate-700">
                  {data.contact_phone && <div>Telefon: {data.contact_phone}</div>}
                  {data.contact_email && <div>E-post: {data.contact_email}</div>}
                </div>

                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  {data.contact_phone && (
                    <a
                      href={`tel:${data.contact_phone.replace(/\s+/g, '')}`}
                      className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                    >
                      Ring
                    </a>
                  )}
                  {data.contact_email && (
                    <a
                      href={`mailto:${encodeURIComponent(
                        data.contact_email
                      )}?subject=${encodeURIComponent(data.title)}`}
                      className="inline-flex flex-1 items-center justify-center rounded-xl bg-[#1E3A8A] px-3 py-2 text-sm font-semibold text-white hover:bg-[#183170]"
                    >
                      Maila
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-gray-700">Kontaktuppgifter saknas.</p>
            )}
          </section>

          {/* Facts */}
          <section className="p-5 sm:p-8">
            <h3 className="text-base font-semibold text-gray-900">Fakta</h3>
            <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-gray-500">Objekt</dt>
                <dd className="text-gray-900">{data.objekt || '–'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Upplåtelseform</dt>
                <dd className="text-gray-900">{data.upplatelseform || '–'}</dd>
              </div>

              <div>
                <dt className="text-sm text-gray-500">Boarea</dt>
                <dd className="text-gray-900">{data.living_area_m2 ? `${fmtNum(data.living_area_m2)} m²` : '–'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Antal rum</dt>
                <dd className="text-gray-900">{data.room_count ?? '–'}</dd>
              </div>

              <div>
                <dt className="text-sm text-gray-500">Våning</dt>
                <dd className="text-gray-900">{data.floor ?? '–'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Balkong</dt>
                <dd className="text-gray-900">{jaNej(data.balcony)}</dd>
              </div>

              <div>
                <dt className="text-sm text-gray-500">Hiss</dt>
                <dd className="text-gray-900">{jaNej(data.elevator)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Uteplats</dt>
                <dd className="text-gray-900">{jaNej(data.patio)}</dd>
              </div>

              <div>
                <dt className="text-sm text-gray-500">VA</dt>
                <dd className="text-gray-900">{jaNej(data.va_connection)}</dd>
              </div>
              {data.kind === 'RENT' && (
                <div>
                  <dt className="text-sm text-gray-500">Uthyrningsperiod</dt>
                  <dd className="text-gray-900">{data.rental_period || '–'}</dd>
                </div>
              )}

              <div>
                <dt className="text-sm text-gray-500">El ingår</dt>
                <dd className="text-gray-900">{ingar(data.includes_electricity)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Värme ingår</dt>
                <dd className="text-gray-900">{ingar(data.includes_heating)}</dd>
              </div>

              <div>
                <dt className="text-sm text-gray-500">Vatten ingår</dt>
                <dd className="text-gray-900">{ingar(data.includes_water)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Internet ingår</dt>
                <dd className="text-gray-900">{ingar(data.includes_internet)}</dd>
              </div>

              <div>
                <dt className="text-sm text-gray-500">Energiklass</dt>
                <dd className="text-gray-900">
                  {data.energy_class && data.energy_class !== 'Ej specificerat' ? data.energy_class : '–'}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}
