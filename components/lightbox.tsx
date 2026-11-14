"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronLeft, ChevronRight, X, Aperture } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Photo } from "@/lib/photos"
import { cn } from "@/lib/utils"

type Props = {
  photos: Photo[]
  index: number | null
  onIndex: (i: number | null) => void
  accent?: string
  label?: string
}

export function Lightbox({ photos, index, onIndex, accent = "#f4f2ee", label }: Props) {
  const open = index !== null
  const [dir, setDir] = React.useState(0)
  const n = photos.length
  const thumbs = React.useRef<HTMLDivElement>(null)

  const go = React.useCallback(
    (d: number) => {
      if (index === null) return
      setDir(d)
      onIndex((index + d + n) % n)
    },
    [index, n, onIndex],
  )

  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation()
        onIndex(null)
      } else if (e.key === "ArrowRight") go(1)
      else if (e.key === "ArrowLeft") go(-1)
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [open, go, onIndex])

  React.useEffect(() => {
    if (index === null) return
    const el = thumbs.current?.children[index] as HTMLElement | undefined
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })
  }, [index])

  const photo = index !== null ? photos[index] : null

  return (
    <AnimatePresence>
      {open && photo ? (
        <motion.div
          key="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={photo.title}
          className="fixed inset-0 z-[70] flex flex-col bg-black text-[#f4f2ee]"
          style={{ "--accent": accent } as React.CSSProperties}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* top bar */}
          <div className="flex items-center justify-between gap-4 border-b border-white/15 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em] text-white/60">
              <Aperture className="size-4" style={{ color: accent }} />
              <span>{label}</span>
              <span className="text-white/90">
                {String((index ?? 0) + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label="Close fullscreen view"
              className="rounded-none border border-white/30 text-white hover:bg-white hover:text-black"
              onClick={() => onIndex(null)}
            >
              <X className="size-6" />
            </Button>
          </div>

          {/* image */}
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-20">
            <AnimatePresence initial={false} custom={dir} mode="popLayout">
              <motion.img
                key={photo.src}
                src={photo.src}
                alt={photo.title}
                custom={dir}
                variants={{
                  enter: (d: number) => ({ opacity: 0, x: d * 80, scale: 0.97 }),
                  center: { opacity: 1, x: 0, scale: 1 },
                  exit: (d: number) => ({ opacity: 0, x: d * -80, scale: 0.97 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.6}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -70) go(1)
                  else if (info.offset.x > 70) go(-1)
                }}
                className="max-h-full max-w-full cursor-grab border border-white/15 object-contain shadow-2xl active:cursor-grabbing"
                draggable={false}
              />
            </AnimatePresence>
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-none border border-white/30 bg-black text-white hover:bg-white hover:text-black sm:inline-flex"
              onClick={() => go(-1)}
            >
              <ChevronLeft className="size-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label="Next photo"
              className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-none border border-white/30 bg-black text-white hover:bg-white hover:text-black sm:inline-flex"
              onClick={() => go(1)}
            >
              <ChevronRight className="size-6" />
            </Button>
          </div>

          {/* caption + thumbnails */}
          <div className="border-t border-white/15 px-4 pb-4 pt-3 sm:px-6">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <p className="font-display text-2xl sm:text-4xl">{photo.title}</p>
              {photo.exif ? (
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/55">{photo.exif}</p>
              ) : null}
            </div>
            <div ref={thumbs} className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
              {photos.map((p, i) => (
                <button
                  key={p.src}
                  type="button"
                  aria-label={`Show ${p.title}`}
                  onClick={() => {
                    setDir(i > (index ?? 0) ? 1 : -1)
                    onIndex(i)
                  }}
                  className={cn(
                    "relative h-14 w-20 shrink-0 cursor-pointer overflow-hidden opacity-45 ring-offset-2 ring-offset-black transition hover:opacity-90",
                    i === index && "opacity-100 ring-2 ring-[var(--accent)]",
                  )}
                >
                  <img src={p.thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
