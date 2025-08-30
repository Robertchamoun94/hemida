'use client';

import { useCallback, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  uploadListingImages,
  insertListing,
  yesNoToBool,
  includeToBool,
  emptyToNull,
  intOrNull,
  floatOrNull,
} from '@/lib/listings';

type IncludeOption = 'INGAR' | 'INGAR_EJ';
type YesNo = 'JA' | 'NEJ';
type Objekt =
  | 'Villa'
  | 'Par/Kedjehus/Radhus'
  | 'Lägenhet'
  | 'Fritidshus'
  | 'Tomt'
  | 'Gård/Skog'
  | 'Övrigt'
  | '';

type FormState = {
  title: string;
  street: string;
  zip: string;
  city: string;

  objekt: Objekt;
  upplåtelseform: 'Bostadsrätt' | 'Hyresrätt' | 'Äganderätt' | '';
  pris: string;

  rum?: string;
  boarea?: string;
  balkong: YesNo | '';
  vaning?: string;
  hiss: YesNo | '';

  tomtarea?: string;
  uteplats: YesNo | '';
  vaAnslutning: YesNo | '';
  byggratt?: string;

  forening?: string;
  energiklass?: 'A'|'B'|'C'|'D'|'E'|'F'|'G'|'Ej specificerat';
  avgiftPerManad?: string;
  prisPerKvm?: string;

  // Drift (ska vara obligatoriskt utom för Tomt)
  el: IncludeOption | '';
  varme: IncludeOption | '';
  vatten: IncludeOption | '';
  internet: IncludeOption | '';

  contactFirstName: string;
  contactLastName: string;
  contactPhone: string;
  contactEmail: string;

  description: string;
  images: File[];
};

const defaultState: FormState = {
  title: '',
  street: '',
  zip: '',
  city: '',

  objekt: '',
  upplåtelseform: '',
  pris: '',

  rum: '',
  boarea: '',
  balkong: '',
  vaning: '',
  hiss: '',

  tomtarea: '',
  uteplats: '',
  vaAnslutning: '',
  byggratt: '',

  forening: '',
  energiklass: 'Ej specificerat',
  avgiftPerManad: '',
  prisPerKvm: '',

  el: '',
  varme: '',
  vatten: '',
  internet: '',

  contactFirstName: '',
  contactLastName: '',
  contactPhone: '',
  contactEmail: '',

  description: '',
  images: [],
};

export default function SkapaAnnonsSaljesPage() {
  const [form, setForm] = useState<FormState>(defaultState);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isApartment = form.objekt === 'Lägenhet';
  const isHouseType =
    form.objekt === 'Villa' ||
    form.objekt === 'Par/Kedjehus/Radhus' ||
    form.objekt === 'Fritidshus';
  const isPlot = form.objekt === 'Tomt';
  const isFarm = form.objekt === 'Gård/Skog';

  const requiredLabels = useMemo(() => {
    const base: Record<string, string> = {
      title: 'Annonsrubrik krävs',
      street: 'Gatuadress krävs',
      zip: 'Postnummer krävs',
      city: 'Stad krävs',
      objekt: 'Välj objekt',
      upplåtelseform: 'Välj upplåtelseform',
      pris: 'Pris krävs',

      // Kontakt
      contactFirstName: 'Förnamn krävs',
      contactLastName: 'Efternamn krävs',
      contactPhone: 'Telefonnummer krävs',
      contactEmail: 'E-post krävs',
    };

    if (isApartment) {
      base.rum = 'Antal rum krävs';
      base.boarea = 'Boarea krävs';
      base.vaning = 'Våning krävs';
      base.avgiftPerManad = 'Avgift per månad krävs';
      base.balkong = 'Ange om balkong finns';
      base.hiss = 'Ange om hiss finns';
    } else if (isHouseType) {
      base.rum = 'Antal rum krävs';
      base.boarea = 'Boarea krävs';
      base.tomtarea = 'Tomtarea krävs';
      base.uteplats = 'Ange om uteplats finns';
    } else if (isPlot) {
      base.tomtarea = 'Tomtarea krävs';
      base.vaAnslutning = 'Ange om VA-anslutning finns';
    } else if (isFarm) {
      base.tomtarea = 'Tomtarea krävs';
    }

    // Drift obligatoriskt om det inte är tomt
    if (!isPlot) {
      base.el = 'Ange om el ingår';
      base.varme = 'Ange om värme ingår';
      base.vatten = 'Ange om vatten ingår';
      base.internet = 'Ange om internet ingår';
    }

    return base;
  }, [isApartment, isHouseType, isPlot, isFarm]);

  const validate = useCallback(
    (state: FormState) => {
      const e: Record<string, string> = {};

      const keys = Object.keys(requiredLabels) as (keyof FormState)[];
      for (const k of keys) {
        const val = String(state[k] ?? '').trim();
        if (val === '') e[k as string] = requiredLabels[k as keyof typeof requiredLabels];
      }

      if (state.zip && !/^(\d{5}|\d{3}\s?\d{2})$/.test(state.zip)) {
        e.zip = 'Ogiltigt postnummer (ex 12345 eller 123 45)';
      }

      if (state.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.contactEmail)) {
        e.contactEmail = 'Ogiltig e-postadress';
      }

      const wc = state.description.trim().split(/\s+/).filter(Boolean).length;
      if (wc < 50) e.description = `Beskrivningen måste vara minst 50 ord (nu ${wc}).`;

      if (!state.images || state.images.length < 1) e.images = 'Ladda upp minst 1 bild.';

      return e;
    },
    [requiredLabels]
  );

  const onChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((s) => ({ ...s, [key]: value }));
    setErrors((e) => ({ ...e, [key as string]: '' }));
  };

  const onFilesSelected = (files: FileList | null) => {
    if (!files) return;
    const list = Array.from(files);
    setForm((s) => {
      const next = [...s.images, ...list].slice(0, 15);
      return { ...s, images: next };
    });
    setErrors((e) => ({ ...e, images: '' }));
  };

  const onDrop = (ev: React.DragEvent) => {
    ev.preventDefault();
    onFilesSelected(ev.dataTransfer.files);
  };

  const removeImage = (idx: number) => {
    setForm((s) => {
      const next = [...s.images];
      next.splice(idx, 1);
      return { ...s, images: next };
    });
  };

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSuccess(null);
    setErrors({});

    const e = validate(form);
    setErrors(e);
    if (Object.keys(e).length) return;

    setSubmitting(true);
    try {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) throw new Error('Du måste vara inloggad.');

      const image_urls = await uploadListingImages(user.id, form.images);

      const payload = {
        user_id: user.id,
        kind: 'SALE' as const,
        objekt: form.objekt,
        upplatelseform: form.upplåtelseform,

        price: intOrNull(form.pris),
        rent_per_month: null,
        rental_period: null,

        title: form.title.trim(),
        street: form.street.trim(),
        zip: form.zip.replace(/\s+/g, ''),
        city: form.city.trim(),

        room_count: floatOrNull(form.rum),
        living_area_m2: floatOrNull(form.boarea),
        balcony: yesNoToBool(form.balkong),
        floor: intOrNull(form.vaning),
        elevator: yesNoToBool(form.hiss),

        plot_area_m2: floatOrNull(form.tomtarea),
        patio: yesNoToBool(form.uteplats),
        va_connection: yesNoToBool(form.vaAnslutning),
        building_rights: emptyToNull(form.byggratt),

        association: emptyToNull(form.forening),
        energy_class: form.energiklass && form.energiklass !== 'Ej specificerat' ? form.energiklass : null,
        fee_per_month: intOrNull(form.avgiftPerManad),
        price_per_m2: intOrNull(form.prisPerKvm),

        includes_electricity: includeToBool(form.el),
        includes_heating: includeToBool(form.varme),
        includes_water: includeToBool(form.vatten),
        includes_internet: includeToBool(form.internet),

        contact_first_name: form.contactFirstName.trim(),
        contact_last_name:  form.contactLastName.trim(),
        contact_phone:      form.contactPhone.trim(),
        contact_email:      form.contactEmail.trim(),

        description: form.description.trim(),
        image_urls,
        status: 'published',
      };

      const id = await insertListing(payload);
      setSuccess('Annons publicerad! (ID: ' + id + ')');
      window.location.href = `/annons/${id}`;
    } catch (err: any) {
      setErrors({ _global: err.message || 'Ett fel inträffade.' });
    } finally {
      setSubmitting(false);
    }
  };

  const descWordCount = form.description.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="mx-auto w-full max-w-4xl px-3 py-6 md:px-4 md:py-8 lg:py-10">
      <div className="rounded-2xl bg-white/85 shadow-lg ring-1 ring-black/5 backdrop-blur p-4 md:p-6 lg:p-8">
        <header className="mb-5 md:mb-6">
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-900">
            Skapa annons, <span className="text-slate-700">säljes</span>
          </h1>
          <p className="text-sm md:text-[15px] text-slate-600 mt-1">
            Fyll i uppgifterna nedan. Fält markerade med <span className="text-rose-600">*</span> är obligatoriska.
          </p>
          {errors._global && (
            <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800 text-sm">
              {errors._global}
            </div>
          )}
          {success && (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800 text-sm">
              {success}
            </div>
          )}
        </header>

        <form onSubmit={onSubmit} className="space-y-6">
          {/* Grundinfo */}
          <section>
            <h2 className="text-sm font-medium text-slate-700 mb-3">Grunduppgifter</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <TextField
                label="Annonsrubrik"
                required
                value={form.title}
                onChange={(v) => onChange('title', v)}
                placeholder="Ex. Nyrenoverad 3:a i centrum"
                error={errors.title}
              />
              <SelectField
                label="Objekt"
                required
                value={form.objekt}
                onChange={(v) => onChange('objekt', v as Objekt)}
                options={[
                  '',
                  'Villa',
                  'Par/Kedjehus/Radhus',
                  'Lägenhet',
                  'Fritidshus',
                  'Tomt',
                  'Gård/Skog',
                  'Övrigt',
                ]}
                error={errors.objekt}
              />
              <SelectField
                label="Upplåtelseform"
                required
                value={form.upplåtelseform}
                onChange={(v) => onChange('upplåtelseform', v as FormState['upplåtelseform'])}
                options={['', 'Bostadsrätt', 'Hyresrätt', 'Äganderätt']}
                error={errors.upplåtelseform}
              />
              <TextField
                label="Pris (kr)"
                required
                value={form.pris}
                onChange={(v) => onChange('pris', v)}
                placeholder="Ex. 3 495 000"
                inputMode="numeric"
                error={errors.pris}
              />
            </div>
          </section>

          {/* Adress */}
          <section>
            <h2 className="text-sm font-medium text-slate-700 mb-3">Adress</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <TextField
                label="Gatuadress"
                required
                value={form.street}
                onChange={(v) => onChange('street', v)}
                placeholder="Ex. Högbergsgatan 12"
                error={errors.street}
              />
              <TextField
                label="Postnummer"
                required
                value={form.zip}
                onChange={(v) => onChange('zip', v)}
                placeholder="123 45"
                error={errors.zip}
              />
              <TextField
                label="Stad"
                required
                value={form.city}
                onChange={(v) => onChange('city', v)}
                placeholder="Stockholm"
                error={errors.city}
              />
            </div>
          </section>

          {/* Bostadsfakta – dynamisk */}
          <section>
            <h2 className="text-sm font-medium text-slate-700 mb-3">Bostadsfakta</h2>

            {!isPlot && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <TextField
                  label="Antal rum"
                  required={isApartment || isHouseType}
                  value={form.rum ?? ''}
                  onChange={(v) => onChange('rum', v)}
                  placeholder="Ex. 3 eller 3.5"
                  inputMode="decimal"
                  error={errors.rum}
                />
                <TextField
                  label="Boarea (m²)"
                  required={isApartment || isHouseType}
                  value={form.boarea ?? ''}
                  onChange={(v) => onChange('boarea', v)}
                  placeholder="Ex. 78"
                  inputMode="decimal"
                  error={errors.boarea}
                />

                {isApartment && (
                  <>
                    <SegmentedYesNo
                      label="Balkong"
                      value={form.balkong}
                      onChange={(v) => onChange('balkong', v)}
                    />
                    <TextField
                      label="Våning"
                      required
                      value={form.vaning ?? ''}
                      onChange={(v) => onChange('vaning', v)}
                      placeholder="Ex. 3"
                      inputMode="numeric"
                      error={errors.vaning}
                    />
                    <SegmentedYesNo
                      label="Hiss"
                      value={form.hiss}
                      onChange={(v) => onChange('hiss', v)}
                    />
                    <TextField
                      label="Förening"
                      value={form.forening ?? ''}
                      onChange={(v) => onChange('forening', v)}
                      placeholder="(Valfritt)"
                      optional
                    />
                    <TextField
                      label="Avgift / månad (kr)"
                      required
                      value={form.avgiftPerManad ?? ''}
                      onChange={(v) => onChange('avgiftPerManad', v)}
                      placeholder="Ex. 3 450"
                      inputMode="numeric"
                      error={errors.avgiftPerManad}
                    />
                    <TextField
                      label="Pris / m² (kr)"
                      value={form.prisPerKvm ?? ''}
                      onChange={(v) => onChange('prisPerKvm', v)}
                      placeholder="(Valfritt)"
                      inputMode="numeric"
                      optional
                    />
                  </>
                )}

                {isHouseType && (
                  <>
                    <TextField
                      label="Tomtarea (m²)"
                      required
                      value={form.tomtarea ?? ''}
                      onChange={(v) => onChange('tomtarea', v)}
                      placeholder="Ex. 540"
                      inputMode="decimal"
                      error={errors.tomtarea}
                    />
                    <SegmentedYesNo
                      label="Uteplats"
                      value={form.uteplats}
                      onChange={(v) => onChange('uteplats', v)}
                    />
                  </>
                )}

                <SelectField
                  label="Energiklass"
                  value={form.energiklass ?? 'Ej specificerat'}
                  onChange={(v) => onChange('energiklass', v as NonNullable<FormState['energiklass']>)}
                  options={['Ej specificerat', 'A', 'B', 'C', 'D', 'E', 'F', 'G']}
                  optional
                />
              </div>
            )}

            {isPlot && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <TextField
                  label="Tomtarea (m²)"
                  required
                  value={form.tomtarea ?? ''}
                  onChange={(v) => onChange('tomtarea', v)}
                  placeholder="Ex. 1 250"
                  inputMode="decimal"
                  error={errors.tomtarea}
                />
                <SegmentedYesNo
                  label="VA-anslutning"
                  value={form.vaAnslutning}
                  onChange={(v) => onChange('vaAnslutning', v)}
                />
                <TextField
                  label="Byggrätt / planbestämmelser"
                  value={form.byggratt ?? ''}
                  onChange={(v) => onChange('byggratt', v)}
                  placeholder="(Valfritt)"
                  optional
                />
              </div>
            )}
          </section>

          {/* Drift & ingår – OBLIGATORISKT om inte Tomt */}
          {!isPlot && (
            <section>
              <h2 className="text-sm font-medium text-slate-700 mb-3">Drift & ingår</h2>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <SegmentedInclude label="El" value={form.el} onChange={(v) => onChange('el', v)} required />
                <SegmentedInclude label="Värme" value={form.varme} onChange={(v) => onChange('varme', v)} required />
                <SegmentedInclude label="Vatten" value={form.vatten} onChange={(v) => onChange('vatten', v)} required />
                <SegmentedInclude label="Internet" value={form.internet} onChange={(v) => onChange('internet', v)} required />
                <FieldError message={errors.el} />
                <FieldError message={errors.varme} />
                <FieldError message={errors.vatten} />
                <FieldError message={errors.internet} />
              </div>
            </section>
          )}

          {/* Kontaktuppgifter */}
          <section>
            <h2 className="text-sm font-medium text-slate-700 mb-3">Kontaktuppgifter</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <TextField
                label="Förnamn"
                required
                value={form.contactFirstName}
                onChange={(v) => onChange('contactFirstName', v)}
                placeholder="Anna"
                error={errors.contactFirstName}
              />
              <TextField
                label="Efternamn"
                required
                value={form.contactLastName}
                onChange={(v) => onChange('contactLastName', v)}
                placeholder="Svensson"
                error={errors.contactLastName}
              />
              <TextField
                label="Telefonnummer"
                required
                value={form.contactPhone}
                onChange={(v) => onChange('contactPhone', v)}
                placeholder="+46 70 123 45 67"
                error={errors.contactPhone}
              />
              <TextField
                label="E-post"
                required
                value={form.contactEmail}
                onChange={(v) => onChange('contactEmail', v)}
                placeholder="anna@example.se"
                error={errors.contactEmail}
              />
            </div>
          </section>

          {/* Beskrivning */}
          <section>
            <h2 className="text-sm font-medium text-slate-700 mb-3">Beskrivning</h2>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700" htmlFor="desc">
                Annonsbeskrivning <span className="text-rose-600">*</span>
              </label>
              <textarea
                id="desc"
                className={`min-h[120px] w-full rounded-xl border px-3 py-2 text-[15px] outline-none ring-0 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:shadow-sm ${
                  errors.description ? 'border-rose-300 bg-rose-50' : 'border-slate-300 bg-white/70'
                }`}
                value={form.description}
                onChange={(e) => onChange('description', e.target.value)}
                placeholder="Skriv en tydlig och säljande text… (minst 50 ord)"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">Minst 50 ord.</p>
                <p className="text-xs text-slate-500">{descWordCount} ord</p>
              </div>
              {errors.description && <p className="text-xs text-rose-600">{errors.description}</p>}
            </div>
          </section>

          {/* Bilder */}
          <section>
            <h2 className="text-sm font-medium text-slate-700 mb-3">Bilder (minst 1, max 15)</h2>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              className="
                flex flex-col items-center justify-center
                rounded-2xl border-2 border-dashed border-slate-300 bg-white/60
                px-4 py-8 text-center hover:border-slate-400
              "
            >
              <p className="text-sm text-slate-600">Dra & släpp bilder här, eller</p>
              <label className="mt-2 inline-flex cursor-pointer items-center rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800">
                Välj filer
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => onFilesSelected(e.target.files)}
                />
              </label>
              <p className="mt-2 text-xs text-slate-500">Upp till 15 bilder. PNG/JPG/WebP rekommenderas.</p>
              {errors.images && <p className="mt-2 text-xs text-rose-600">{errors.images}</p>}
            </div>

            {form.images.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-5">
                {form.images.map((f, idx) => {
                  const url = URL.createObjectURL(f);
                  return (
                    <div
                      key={idx}
                      className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                    >
                      <img src={url} alt={f.name} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute right-1.5 top-1.5 hidden rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 group-hover:block"
                        aria-label="Ta bort bild"
                      >
                        Ta bort
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Publicera */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="text-xs text-slate-500">
              Publiceringen skapar din annons och skickar dig direkt till annons-sidan.
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="
                inline-flex items-center justify-center
                rounded-xl bg-emerald-600 px-4 py-2 text-[15px] font-semibold text-white
                shadow-sm hover:bg-emerald-700 disabled:opacity-60
              "
            >
              {submitting ? 'Publicerar…' : 'Publicera'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* --------------------------------- UI Bits -------------------------------- */

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-rose-600">{message}</p>;
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
  required,
  optional,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: 'text' | 'numeric' | 'decimal';
  required?: boolean;
  optional?: boolean;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-rose-600">*</span>}
        {optional && !required && <span className="text-slate-400"> (valfritt)</span>}
      </label>
      <input
        className={`
          w-full rounded-xl border px-3 py-2 text-[15px] outline-none
          ${error ? 'border-rose-300 bg-rose-50' : 'border-slate-300 bg-white/70'}
          focus:border-slate-400 focus:bg-white focus:shadow-sm
        `}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}

function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  required,
  optional,
  error,
}: {
  label: string;
  value: T | '';
  onChange: (v: T | '') => void;
  options: (T | '')[];
  required?: boolean;
  optional?: boolean;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-rose-600">*</span>}
        {optional && !required && <span className="text-slate-400"> (valfritt)</span>}
      </label>
      <select
        className={`
          w-full rounded-xl border px-3 py-2 text-[15px] outline-none
          ${error ? 'border-rose-300 bg-rose-50' : 'border-slate-300 bg-white/70'}
          focus:border-slate-400 focus:bg-white focus:shadow-sm
        `}
        value={value}
        onChange={(e) => onChange(e.target.value as T | '')}
      >
        {options.map((op, i) => (
          <option key={i} value={op}>
            {op === '' ? 'Välj…' : op}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}

function SegmentedYesNo({
  label,
  value,
  onChange,
}: {
  label: string;
  value: YesNo | '';
  onChange: (v: YesNo) => void;
}) {
  return (
    <div className="space-y-1.5">
      <span className="block text-sm font-medium text-slate-700">{label} <span className="text-rose-600">*</span></span>
      <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-slate-300 bg-white/70 p-0.5">
        {(['JA', 'NEJ'] as YesNo[]).map((op) => {
          const active = value === op;
          return (
            <button
              type="button"
              key={op}
              onClick={() => onChange(op)}
              className={`
                rounded-lg px-3 py-2 text-sm font-medium
                ${active ? 'bg-slate-900 text-white shadow' : 'text-slate-700 hover:bg-slate-100'}
              `}
            >
              {op}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SegmentedInclude({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: IncludeOption | '';
  onChange: (v: IncludeOption) => void;
  required?: boolean;
}) {
  const options: { key: IncludeOption; label: string }[] = [
    { key: 'INGAR', label: 'Ingår' },
    { key: 'INGAR_EJ', label: 'Ingår ej' },
  ];
  return (
    <div className="space-y-1.5">
      <span className="block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-rose-600">*</span>}
      </span>
      <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-slate-300 bg-white/70 p-0.5">
        {options.map((op) => {
          const active = value === op.key;
          return (
            <button
              type="button"
              key={op.key}
              onClick={() => onChange(op.key)}
              className={`
                rounded-lg px-3 py-2 text-sm font-medium
                ${active ? 'bg-slate-900 text-white shadow' : 'text-slate-700 hover:bg-slate-100'}
              `}
            >
              {op.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
