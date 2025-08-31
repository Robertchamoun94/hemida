// app/page.tsx
import Filters from '@/components/Filters'

export default function Page() {
  return (
    <>
      {/* Liten toppmarginal under headern */}
      <div className="pt-4 md:pt-6" />

      <Filters />
    </>
  )
}
