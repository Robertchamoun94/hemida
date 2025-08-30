// components/ListingCard.tsx
'use client';

import Gallery from '@/components/Gallery';

export type ListingCardData = {
  id: string;
  kind: 'SALE' | 'RENT';
  title: string;
  street?: string | null;
  city?: string | null;
  image_urls: string[];
  price?: number | null;
  rent_per_month?: number | null;
  rental_period?: string | null;
  living_area_m2?: number | null;
  room_count?: number | null;
  plot_area_m2?: number | null;
};

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    minimumFractionDigits: 0,
  }).format(n);

const fmtNum = (n: number) =>
  new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 0 }).format(n);

export default function ListingCard({ listing }: { listing: ListingCardData }) {
  const priceLabel =
    listing.kind === 'SALE'
      ? listing.price != null
        ? fmtCurrency(listing.price)
        : 'Pris ej angett'
      : listing.rent_per_month != null
        ? `${fmtCurrency(listing.rent_per_month)} / mån`
        : 'Hyra ej angett';

  const facts: string[] = [];
  if (listing.living_area_m2) facts.push(`${fmtNum(listing.living_area_m2)} m²`);
  if (listing.room_count) facts.push(`${fmtNum(Number(listing.room_count))} rum`);
  if (listing.plot_area_m2) facts.push(`${fmtNum(listing.plot_area_m2)} m² tomt`);

  return (
    <a
      href={`/annons/${listing.id}`}
      className="group block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
    >
      {/* Bildgalleri med swipe/drag – piltangenter är avstängda i listan */}
      <Gallery
        images={listing.image_urls ?? []}
        aspect="4/3"
        showThumbs={false}
        enableGlobalKeys={false}
        alt={listing.title}
      />

      <div className="flex items-start justify-between gap-3 p-3">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold text-slate-900">
            {listing.title}
          </h3>
          <p className="truncate text-sm text-slate-600">
            {listing.street ? `${listing.street}, ` : ''}{listing.city || ''}
          </p>

          {/* Chipsrad */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {facts.map((f, i) => (
              <span
                key={i}
                className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700"
              >
                {f}
              </span>
            ))}
            {listing.kind === 'RENT' && listing.rental_period ? (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700">
                {listing.rental_period}
              </span>
            ) : null}
          </div>
        </div>

        {/* Pris/Hyra */}
        <div className="shrink-0 text-right">
          <div className="text-xs text-slate-500">
            {listing.kind === 'SALE' ? 'Pris' : 'Hyra'}
          </div>
          <div className="text-sm font-bold text-slate-900">{priceLabel}</div>
        </div>
      </div>
    </a>
  );
}
