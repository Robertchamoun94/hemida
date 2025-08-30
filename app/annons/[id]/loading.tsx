export default function Loading() {
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
