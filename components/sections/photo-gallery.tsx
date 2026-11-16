"use client"

import InfiniteGallery from "@/components/ui/3d-gallery-photography"
import { OTHER_PHOTOS } from "@/lib/photos"

// Thumbnails are plenty sharp for the planes and keep the texture download small.
const IMAGES = OTHER_PHOTOS.map((p) => ({ src: p.thumb, alt: p.title }))

/** Replaces the old marquee phone roll: the same frames, drifting through 3D space. */
export function PhotoGallery() {
  return (
    <section id="phone-roll" className="relative h-svh min-h-[560px] overflow-hidden border-t border-hair bg-ink">
      <InfiniteGallery images={IMAGES} speed={1.2} visibleCount={12} className="absolute inset-0 h-full w-full" />

      <div className="pointer-events-none absolute inset-x-0 top-[76px] z-10 flex items-start justify-between gap-6 px-4 sm:px-8">
        <div>
          <p className="label text-paper/50">
            <span className="text-signal">05</span> — Phone roll
          </p>
          <h2 className="font-display mt-3 text-[clamp(2.4rem,6vw,5.5rem)] text-paper">
            Off the <span className="text-stroke">clock</span>
          </h2>
        </div>
        <p className="hidden max-w-xs text-right text-sm leading-relaxed text-paper/60 md:block">
          Phones, borrowed bodies, a window seat. {OTHER_PHOTOS.length} frames that came from neither camera but still
          made the cut.
        </p>
      </div>

      <div className="label pointer-events-none absolute inset-x-0 bottom-6 z-10 text-center text-paper/45">
        <p>Scroll or use the arrow keys to drift · click a frame to zoom in</p>
        <p className="mt-1 text-paper/30">Click it again (or press Esc) to step back</p>
      </div>
    </section>
  )
}
