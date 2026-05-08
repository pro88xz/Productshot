'use client';

import { useEffect, useState } from 'react';

export type FeaturedSlide = {
  url: string;
  alt: string;
  label: string;
};

type FeaturedSlideshowProps = {
  slides: FeaturedSlide[];
  intervalMs?: number;
};

export function FeaturedSlideshow({ slides, intervalMs = 5000 }: FeaturedSlideshowProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;

    const id = setInterval(() => {
      setActiveIndex((i) => (i + 1) % slides.length);
    }, intervalMs);

    return () => clearInterval(id);
  }, [slides.length, intervalMs]);

  if (slides.length === 0) return null;

  return (
    <div className="relative h-full w-full overflow-hidden">
      {slides.map((slide, i) => (
        <div
          key={`${slide.url}-${i}`}
          className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
          style={{ opacity: i === activeIndex ? 1 : 0 }}
          aria-hidden={i === activeIndex ? 'false' : 'true'}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slide.url}
            alt={slide.alt}
            className="h-full w-full object-cover"
            loading={i === 0 ? 'eager' : 'lazy'}
            fetchPriority={i === 0 ? 'high' : 'auto'}
          />
          {/* Scene label overlay */}
          <div className="absolute right-3 bottom-3 sm:right-4 sm:bottom-4">
            <span className="bg-background/85 text-foreground inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium backdrop-blur-sm sm:text-sm">
              {slide.label}
            </span>
          </div>
        </div>
      ))}

      {/* Slide indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 sm:bottom-4">
          {slides.map((_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all duration-500 ${
                i === activeIndex ? 'bg-foreground/80 w-6' : 'bg-foreground/30 w-1.5'
              }`}
              aria-hidden="true"
            />
          ))}
        </div>
      )}
    </div>
  );
}
