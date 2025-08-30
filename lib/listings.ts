import { supabase } from '@/lib/supabaseClient';

/* ---------------------------- Type helpers ---------------------------- */

export type YesNo = 'JA' | 'NEJ' | '';
export type IncludeOption = 'INGAR' | 'INGAR_EJ' | '';

export const yesNoToBool = (v: YesNo | null | undefined): boolean | null =>
  v === 'JA' ? true : v === 'NEJ' ? false : null;

export const includeToBool = (v: IncludeOption | null | undefined): boolean | null =>
  v === 'INGAR' ? true : v === 'INGAR_EJ' ? false : null;

export const emptyToNull = (s: string | null | undefined) => {
  if (s == null) return null;
  const t = String(s).trim();
  return t === '' ? null : t;
};

export const intOrNull = (s: string | null | undefined) => {
  if (s == null) return null;
  const t = String(s).replace(/\s+/g, '');
  if (!t) return null;
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
};

export const floatOrNull = (s: string | null | undefined) => {
  if (s == null) return null;
  const t = String(s).replace(',', '.');
  if (!t) return null;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
};

/**
 * Ta bara bort värden som inte betyder något:
 *  - undefined, tom sträng, NaN
 * Behåll: false, 0, null, true
 */
const sanitize = <T extends Record<string, any>>(obj: T): T => {
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    if (typeof v === 'number' && Number.isNaN(v)) continue;
    out[k] = v;
  }
  return out;
};

/* ------------------------------ Storage ------------------------------ */

const uid = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export async function uploadListingImages(userId: string, files: File[]): Promise<string[]> {
  if (!files?.length) return [];
  const bucket = 'listing-images';
  const urls: string[] = [];

  let i = 0;
  for (const f of files) {
    const ext = (f.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${userId}/${uid()}-${i}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, f, {
      upsert: false,
      cacheControl: '3600',
    });
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    urls.push(data.publicUrl);
    i++;
  }
  return urls;
}

/* ---------------------------- DB operations --------------------------- */

type InsertPayload = Record<string, any>;

/** Infogar i 'listings' utan att tappa bort false/0. */
export async function insertListing(payload: InsertPayload): Promise<string> {
  const body = sanitize(payload);
  const { data, error } = await supabase
    .from('listings')
    .insert(body)
    .select('id')
    .single();

  if (error) throw error;
  return data!.id as string;
}
