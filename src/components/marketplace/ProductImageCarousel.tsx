import { useState, useRef, TouchEvent } from "react";

interface ProductImageCarouselProps {
  images: string[];
  alt: string;
}

export const ProductImageCarousel = ({ images, alt }: ProductImageCarouselProps) => {
  const [current, setCurrent] = useState(0);
  const touchStart = useRef<number | null>(null);
  const touchEnd = useRef<number | null>(null);

  const filtered = images.filter(Boolean);
  if (filtered.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-muted-foreground text-sm">
        {alt}
      </div>
    );
  }

  const handleTouchStart = (e: TouchEvent) => {
    touchStart.current = e.targetTouches[0].clientX;
    touchEnd.current = null;
  };

  const handleTouchMove = (e: TouchEvent) => {
    touchEnd.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStart.current === null || touchEnd.current === null) return;
    const diff = touchStart.current - touchEnd.current;
    const minSwipe = 50;
    if (diff > minSwipe && current < filtered.length - 1) {
      setCurrent((p) => p + 1);
    } else if (diff < -minSwipe && current > 0) {
      setCurrent((p) => p - 1);
    }
    touchStart.current = null;
    touchEnd.current = null;
  };

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="flex h-full transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {filtered.map((url, i) => (
          <img
            key={i}
            src={url}
            alt={`${alt} ${i + 1}`}
            className="h-full w-full flex-shrink-0 object-cover"
            loading="lazy"
          />
        ))}
      </div>
      {filtered.length > 1 && (
        <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
          {filtered.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i === current ? "bg-primary" : "bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
