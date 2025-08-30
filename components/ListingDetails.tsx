'use client';

import { Mail, Phone } from 'lucide-react';

type Listing = {
  title?: string | null;
  street?: string | null;
  city?: string | null;

  price?: number | null;

  living_area_m2?: number | null;  // boarea
  rooms?: number | null;           // antal rum
  lot_area_m2?: number | null;     // tomtarea

  description?: string | null;

  object_type?: string | null;     // t.ex. "Par/Kedjehus/Radhus"
  tenure?: string | null;          // "Äganderätt" / "Bostadsrätt" etc.

  contact_first_name?: string | null;
  contact_last_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
};

function formatPrice(n?: number | null) {
  if (n == null) return '–';
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(n);
}

function InfoChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-black/10 bg-white/70 px-3 py-1 text-sm text-gray-700">
      {children}
    </span>
  );
}

export default function ListingDetails({ listing }: { listing: Listing }) {
  const fullAddress = [listing.street, listing.city].filter(Boolean).join(', ');

  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
      {/* HUVUDBOXEN */}
      <div className="rounded-2xl bg-white/95 shadow-xl ring-1 ring-black/5 backdrop-blur divide-y divide-gray-200">
        {/* PRIS – överst direkt under bilden */}
        <section className="p-6 sm:p-8">
          <p className="text-sm font-medium text-gray-500">Pris</p>
          <p className="mt-1 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {formatPrice(listing.price)}
          </p>

          {/* Adress + chipsrad */}
          {fullAddress && (
            <p className="mt-4 text-gray-700">{fullAddress}</p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {listing.living_area_m2 ? <InfoChip>{listing.living_area_m2} m²</InfoChip> : null}
            {listing.rooms ? <InfoChip>{listing.rooms} rum</InfoChip> : null}
            {listing.lot_area_m2 ? <InfoChip>{listing.lot_area_m2} m² tomt</InfoChip> : null}
          </div>
        </section>

        {/* BESKRIVNING */}
        <section className="p-6 sm:p-8">
          <h3 className="text-base font-semibold text-gray-900">Beskrivning</h3>
          <p className="mt-3 leading-relaxed text-gray-800">
            {listing.description || 'Ingen beskrivning angiven.'}
          </p>
        </section>

        {/* KONTAKT */}
        <section className="p-6 sm:p-8">
          <h3 className="text-base font-semibold text-gray-900">Kontakt</h3>

          {listing.contact_first_name || listing.contact_last_name || listing.contact_phone || listing.contact_email ? (
            <div className="mt-4 space-y-2 text-gray-800">
              {(listing.contact_first_name || listing.contact_last_name) && (
                <p className="font-medium">
                  {[listing.contact_first_name, listing.contact_last_name].filter(Boolean).join(' ')}
                </p>
              )}

              {listing.contact_phone && (
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  <a className="underline underline-offset-2" href={`tel:${listing.contact_phone}`}>
                    {listing.contact_phone}
                  </a>
                </p>
              )}

              {listing.contact_email && (
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  <a className="underline underline-offset-2" href={`mailto:${listing.contact_email}`}>
                    {listing.contact_email}
                  </a>
                </p>
              )}
            </div>
          ) : (
            <p className="mt-3 text-gray-700">Kontaktuppgifter saknas.</p>
          )}
        </section>

        {/* FAKTA */}
        <section className="p-6 sm:p-8">
          <h3 className="text-base font-semibold text-gray-900">Fakta</h3>
          <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-gray-500">Objekt</dt>
              <dd className="text-gray-900">{listing.object_type || '–'}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Upplåtelseform</dt>
              <dd className="text-gray-900">{listing.tenure || '–'}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Boarea</dt>
              <dd className="text-gray-900">{listing.living_area_m2 ? `${listing.living_area_m2} m²` : '–'}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Antal rum</dt>
              <dd className="text-gray-900">{listing.rooms ?? '–'}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Tomtarea</dt>
              <dd className="text-gray-900">{listing.lot_area_m2 ? `${listing.lot_area_m2} m²` : '–'}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
