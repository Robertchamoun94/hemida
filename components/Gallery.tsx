'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  images: string[];
  aspect?: '16/9' | '4/3';
  showThumbs?: boolean;
  className?: string;
  /** Sätt false när galleriet ligger i ett kort på /annonser, så att piltangenter inte fångas globalt */
  enableGlobalKeys?: boolean;
  alt?: string;
};

export default function Gallery({
  images,
  aspect = '16/9',
  showThumbs = false,
  className = '',
  enableGlobalKeys = true,
  alt = 'Bild',
}: Props) {
  const [idx, setIdx] = useState(0);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const moved = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasImages = images && images.length > 0;
  const total = hasImages ? images.length : 0;

  const prev = () => setIdx((i) => (i - 1 + total) % total);
  const next = () => setIdx((i) => (i + 1) % total);

  // Piltangenter (globalt för detaljsidan, lokalt för kort)
  useEffect(() => {
    if (!enableGlobalKeys) return;
    const onKey = (e: KeyboardEvent) => {
      if (!total) return;
      if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enableGlobalKeys, total]);

  const aspectClass = aspect === '4/3' ? 'aspect-[4/3]' : 'aspect-[16/9]';

  // Pek-/mus-gest för swipe (pointer events)
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    startX.current = e.clientX;
    startY.current = e.clientY;
    moved.current = false;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (startX.current == null || startY.current == null) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    // Om man draggar mer i X-led än Y-led och över en liten threshold betraktar vi det som swipe
    if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
      moved.current = true;
      // Förhindra att ett eventuellt <a> triggar navigering vid drag
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (startX.current == null || startY.current == null) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;

    // Reset
    startX.current = null;
    startY.current = null;

    // Endast om horisontell rörelse dominerar och över tröskel
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) next();
      else prev();
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Undvik klick-navigering efter drag när galleriet ligger inuti en <a>
  const onClick = (e: React.MouseEvent) => {
    if (moved.current) {
      e.preventDefault();
      e.stopPropagation();
      moved.current = false;
    }
  };

  return (
    <div className={className}>
      <div
        ref={containerRef}
        className={`relative w-full overflow-hidden ${aspectClass}`}
        role="region"
        aria-label="Bildgalleri"
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={onClick}
        onKeyDown={(e) => {
          if (!enableGlobalKeys) {
            if (e.key === 'ArrowLeft') prev();
            else if (e.key === 'ArrowRight') next();
          }
        }}
      >
        {hasImages ? (
          <>
            <img src={images[idx]} alt={alt} className="h-full w-full object-cover" />
            {total > 1 && (
              <>
                {/* Vänster/Höger knappar */}
                <button
                  type="button"
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow hover:bg-white"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    prev();
                  }}
                  aria-label="Föregående bild"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow hover:bg-white"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    next();
                  }}
                  aria-label="Nästa bild"
                >
                  ›
                </button>
                <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/40 px-2 py-0.5 text-xs text-white">
                  {idx + 1} / {total}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="grid h-full w-full place-items-center text-slate-400">Ingen bild</div>
        )}
      </div>

      {showThumbs && total > 1 && (
        <div className="grid grid-cols-4 gap-1 border-t border-slate-200 p-1 md:grid-cols-8">
          {images.map((u, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIdx(i);
              }}
              className={`overflow-hidden rounded-lg border ${i === idx ? 'border-[#1E3A8A]' : 'border-slate-200'}`}
              aria-label={`Välj bild ${i + 1}`}
            >
              <img src={u} alt="" className="aspect-[4/3] w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
