'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
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
type ObjektUthyres = 'Villa' | 'Par/Kedjehus/Radhus' | 'Lägenhet' | 'Fritidshus' | '';
type HyresperiodOption =
  | ''
  | 'Tillsvidare'
  | '1–3 månader'
  | '4–6 månader'
  | '7–12 månader'
  | '1–2 år'
  | '2+ år'
  | 'ANNAN';

type FormState = {
  title: string;
  street: string;
  zip: string;
  city: string;

  objekt: ObjektUthyres;
  upplåtelseform: 'Bostadsrätt' | 'Hyresrätt' | 'Äganderätt' | '';
  hyra: string; // kr/mån

  hyresperiod: HyresperiodOption;
  hyresperiodCustom: string;

  rum?: string;
  boarea?: string;
  balkong: YesNo | '';
  vaning?: string;
  hiss: YesNo | '';

  tomtarea?: string;
  uteplats: YesNo | '';

  forening?: string;
  energiklass?: 'A'|'B'|'C'|'D'|'E'|'F'|'G'|'Ej specificerat';

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
  hyra: '',

  hyresperiod: '',
  hyresperiodCustom: '',

  rum: '',
  boarea: '',
  balkong: '',
  vaning: '',
  hiss: '',

  tomtarea: '',
  uteplats: '',

  forening: '',
  energiklass: 'Ej specificerat',

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

export default function HyraUtPage() {
  const search = useSearchParams();
  const editId = search.get('edit');
  const isEdit = !!editId;

  const [form, setForm] = useState<FormState>(defaultState);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isApartment = form.objekt === 'Lägenhet';
  const isHouseType =
    form.objekt === 'Villa' ||
    form.objekt === 'Par/Kedjehus/Radhus' ||
    form.objekt === 'Fritidshus';

  const boolToYesNo = (b: boolean | null): YesNo | '' => (b === true ? 'JA' : b === false ? 'NEJ' : '');
  const boolToInclude = (b: boolean | null): IncludeOption | '' => (b === true ? 'INGAR' : b === false ? 'INGAR_EJ' : '');
  const toStr = (n: number | null) => (n === null || n === undefined ? '' : String(n));

  // Prefill om ?edit= finns
  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    (async () => {
      const { data: { user }, error: uerr } = await supabase.auth.getUser();
      if (uerr || !user) return;
      const { data, error } = await supabase.from('listings').select('*').eq('id', editId).single();
      if (error || !data) return;
      if (data.user_id !== user.id) return;

      setExistingImages(Array.isArray(data.image_urls) ? data.image_urls : []);

      // Hyresperiod
      let hyresperiod: HyresperiodOption = '';
      let hyresperiodCustom = '';
      const rp: string | null = data.rental_period;
      if (rp) {
        const upper = rp.trim();
        const opts: HyresperiodOption[] = ['Tillsvidare','1–3 månader','4–6 månader','7–12 månader','1–2 år','2+ år'];
        if (opts.includes(upper as any)) {
          hyresperiod = upper as HyresperiodOption;
        } else if (/^Annan:/i.test(upper)) {
          hyresperiod = 'ANNAN';
          hyresperiodCustom = upper.replace(/^Annan:\s*/i, '');
        } else {
          hyresperiod = 'ANNAN';
          hyresperiodCustom = upper;
        }
      }

      setForm({
        title: data.title ?? '',
        street: data.street ?? '',
        zip: data.zip ?? '',
        city: data.city ?? '',

        objekt: (data.objekt ?? '') as any,
        upplåtelseform: (data.upplatelseform ?? '') as any,
        hyra: toStr(data.rent_per_month),

        hyresperiod,
        hyresperiodCustom,

        rum: toStr(data.room_count),
        boarea: toStr(data.living_area_m2),
        balkong: boolToYesNo(data.balcony),
        vaning: toStr(data.floor),
        hiss: boolToYesNo(data.elevator),

        tomtarea: toStr(data.plot_area_m2),
        uteplats: boolToYesNo(data.patio),

        forening: data.association ?? '',
        energiklass: (data.energy_class ?? 'Ej specificerat') as any,

        el: boolToInclude(data.includes_electricity),
        varme: boolToInclude(data.includes_heating),
        vatten: boolToInclude(data.includes_water),
        internet: boolToInclude(data.includes_internet),

        contactFirstName: data.contact_first_name ?? '',
        contactLastName: data.contact_last_name ?? '',
        contactPhone: data.contact_phone ?? '',
        contactEmail: data.contact_email ?? '',

        description: data.description ?? '',
        images: [],
      });
    })();
    return () => { cancelled = true; };
  }, [isEdit, editId]);

  // Vilka fält som MÅSTE vara ifyllda
  const requiredLabels = useMemo(() => {
    const base: Record<string, string> = {
      title: 'Annonsrubrik krävs',
      street: 'Gatuadress krävs',
      zip: 'Postnummer krävs',
      city: 'Stad krävs',
      objekt: 'Välj objekt',
      upplåtelseform: 'Välj upplåtelseform',
      hyra: 'Hyra krävs',
      hyresperiod: 'Välj uthyrningsperiod',

      el: 'Ange om el ingår',
      varme: 'Ange om värme ingår',
      vatten: 'Ange om vatten ingår',
      internet: 'Ange om internet ingår',

      contactFirstName: 'Förnamn krävs',
      contactLastName: 'Efternamn krävs',
      contactPhone: 'Telefonnummer krävs',
      contactEmail: 'E-post krävs',
    };

    if (isApartment) {
      base.rum = 'Antal rum krävs';
      base.boarea = 'Boarea krävs';
      base.vaning = 'Våning krävs';
      base.balkong = 'Ange om balkong finns';
      base.hiss = 'Ange om hiss finns';
    } else if (isHouseType) {
      base.rum = 'Antal rum krävs';
      base.boarea = 'Boarea krävs';
      base.tomtarea = 'Tomtarea krävs';
    }

    return base;
  }, [isApartment, isHouseType]);

  const validate = useCallback((state: FormState) => {
    const e: Record<string, string> = {};

    const keys = Object.keys(requiredLabels) as (keyof FormState)[];
    for (const k of keys) {
      const val = String(state[k] ?? '').trim();
      if (val === '') e[k as string] = requiredLabels[k as keyof typeof requiredLabels];
    }

    if (state.hyresperiod === 'ANNAN' && state.hyresperiodCustom.trim() === '') {
      e.hyresperiodCustom = 'Ange önskad uthyrningsperiod.';
    }

    if (state.zip && !/^(\d{5}|\d{3}\s?\d{2})$/.test(state.zip)) {
      e.zip = 'Ogiltigt postnummer (ex 12345 eller 123 45)';
    }

    if (state.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.contactEmail)) {
      e.contactEmail = 'Ogiltig e-postadress';
    }

    const wc = state.description.trim().split(/\s+/).filter(Boolean).length;
    if (wc < 50) e.description = `Beskrivningen måste vara minst 50 ord (nu ${wc}).`;

    const hasAnyImages = (state.images?.length ?? 0) > 0 || existingImages.length > 0;
    if (!hasAnyImages) e.images = 'Ladda upp minst 1 bild.';

    return e;
  }, [requiredLabels, existingImages.length]);

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

  // Publicera
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

      let image_urls = [...existingImages];
      if (form.images?.length) {
        const uploaded = await uploadListingImages(user.id, form.images);
        image_urls = [...image_urls, ...uploaded];
      }

      const rental_period =
        form.hyresperiod === 'ANNAN'
          ? `Annan: ${form.hyresperiodCustom.trim()}`
          : form.hyresperiod;

      const payload = {
        user_id: user.id,
        kind: 'RENT' as const,
        objekt: form.objekt,
        upplatelseform: form.upplåtelseform,

        price: null,
        rent_per_month: intOrNull(form.hyra),
        rental_period,

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

        association: emptyToNull(form.forening),
        energy_class: form.energiklass && form.energiklass !== 'Ej specificerat' ? form.energiklass : null,

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

      if (isEdit) {
        const { data: sess } = await supabase.auth.getSession();
        const token = sess.session?.access_token;
        const res = await fetch('/api/listings/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ id: editId, payload }),
        });
        if (!res.ok) throw new Error((await res.text()) || 'Kunde inte uppdatera annonsen.');
        setSuccess('Annons uppdaterad!');
        window.location.href = `/annons/${editId}`;
      } else {
        const id = await insertListing(payload);
        setSuccess('Annons publicerad! (ID: ' + id + ')');
        window.location.href = `/annons/${id}`;
      }
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
        {/* Header + Form markup oförändrat – din befintliga layout */}
        {/* Resten av din komponent kan lämnas exakt som den är */}
      </div>
    </div>
  );
}

/* UI-komponenterna (TextField/SelectField/SegmentedYesNo/SegmentedInclude/FieldError)
   lämnar du som i din nuvarande fil – inga ändringar behövs. */
