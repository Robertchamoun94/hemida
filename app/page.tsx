// app/page.tsx
import Filters from '@/components/Filters'

export default function Page() {
  return (
    <>
      {/* Liten toppmarginal under headern */}
      <div className="pt-4 md:pt-6" />

      <Filters />

      <section className="mx-auto my-10 max-w-6xl px-4">
        <p className="text-sm text-slate-700">
          (Här kommer sökresultaten att listas i nästa steg.)
        </p>
      </section>
    </>
  )
}
