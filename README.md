# Hemida

Hemida är ett Next.js 14 + Tailwind-projekt som efterliknar Hemnet-layouten (utan att kopiera varumärken) och innehåller:
- Topbar med meny, logga och Logga in.
- Flikar: Till salu, Slutpriser, Sök mäklare (kan ändras till Hyra bostad).
- Sökpanel med Område och Utöka område.
- Utfällbara sökfilter (Typ av bostad, Rum, Boarea, Pris, Nyckelord).

## Kom igång
```bash
pnpm i   # eller npm i / yarn
pnpm dev # eller npm run dev
```
Öppna http://localhost:3000

## Struktur
- `app/page.tsx` – startsidan (UI klar)
- `app/annons/ny/page.tsx` – formulär för ny annons (stub)
- `app/api/listings/route.ts` – sök-API (stub)
- `lib/supabaseClient.ts` – klient (om du ansluter Supabase)
- `components/*` – UI-komponenter
