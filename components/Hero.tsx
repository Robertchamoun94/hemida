export default function Hero({ children }: { children?: React.ReactNode }) {
  return (
    <section className="relative">
      {/* Hero-bild + overlay */}
      <div
        className="h-[240px] md:h-[380px] w-full bg-center bg-cover"
        style={{
          backgroundImage:
            // byt gärna till egen bild/URL
            "url('https://images.unsplash.com/photo-1505691723518-36a5ac3b2b8f?q=80&w=1600&auto=format&fit=crop')",
        }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.35)_0%,rgba(0,0,0,0.15)_60%,transparent_100%)]" />

      {/* Slot för filterkortet */}
      <div className="absolute inset-x-0 -bottom-10 md:-bottom-14">{children}</div>
    </section>
  );
}
