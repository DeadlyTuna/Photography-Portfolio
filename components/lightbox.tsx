"use client"

import * as React from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { ArrowLeft, ArrowRight, X } from "lucide-react"
import type { Photo } from "@/lib/photos"
import { cn } from "@/lib/utils"

type Props = {
  photos: Photo[]
  index: number | null
  onIndex: (i: number | null) => void
  label?: string
}

const EASE = [0.7, 0, 0.1, 1] as const
const pad = (v: number) => String(v).padStart(2, "0")

/** Square hairline control that floods lime on hover / focus. */
const square =
  "inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-none border border-hair text-paper/80 transition-colors duration-200 hover:border-signal hover:bg-signal hover:text-ink focus-visible:border-signal focus-visible:bg-signal focus-visible:text-ink focus-visible:outline-none sm:size-12"

/** Fullscreen viewer: hairline chrome, contact-sheet strip, swipe / arrows / Esc. */
export function Lightbox({ photos, index, onIndex, label }: Props) {
  const open = index !== null
  const reduce = useReducedMotion()
  const [dir, setDir] = React.useState(0)
  const n = photos.length
  const thumbs = React.useRef<HTMLDivElement>(null)
  const closeRef = React.useRef<HTMLButtonElement>(null)

  const go = React.useCallback(
    (d: number) => {
      if (index === null || n === 0) return
      setDir(d)
      onIndex((index + d + n) % n)
    },
    [index, n, onIndex],
  )

  // Keyboard: Esc closes, arrows browse. Capture phase so the page behind never sees them.
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation()
        onIndex(null)
      } else if (e.key === "ArrowRight") {
        e.stopPropagation()
        go(1)
      } else if (e.key === "ArrowLeft") {
        e.stopPropagation()
        go(-1)
      }
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [open, go, onIndex])

  // Move focus into the dialog on open, give it back on close.
  React.useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const t = window.setTimeout(() => closeRef.current?.focus({ preventScroll: true }), 30)
    return () => {
      window.clearTimeout(t)
      prev?.focus?.({ preventScroll: true })
    }
  }, [open])

  // Keep the active thumbnail centred in the strip.
  React.useEffect(() => {
    if (index === null) return
    const el = thumbs.current?.children[index] as HTMLElement | undefined
    el?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", inline: "center", block: "nearest" })
  }, [index, reduce])

  const photo = index !== null ? photos[index] : null
  const shift = reduce ? 0 : 80

  return (
    <AnimatePresence>
      {open && photo ? (
        <motion.div
          key="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={label ? `${label}: ${photo.title}` : photo.title}
          data-lenis-prevent
          className="fixed inset-0 z-[70] flex flex-col bg-ink text-paper"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0.15 : 0.4, ease: EASE }}
        >
          {/* ── top bar ─────────────────────────────────────────── */}
          <header className="relative flex h-14 shrink-0 items-center justify-between gap-4 border-b border-hair pl-4 sm:h-16 sm:pl-8">
            <p className="label flex min-w-0 items-center gap-3 text-paper/50">
              <span className="truncate">{label ?? "Viewer"}</span>
              <span aria-hidden className="hidden h-px w-8 bg-hair sm:block" />
              <span className="shrink-0 tabular-nums text-signal">
                {pad((index ?? 0) + 1)}/{pad(n)}
              </span>
            </p>
            <p aria-hidden className="label hidden text-paper/30 lg:block">
              Esc — close &nbsp;/&nbsp; ← → — browse &nbsp;/&nbsp; drag — swipe
            </p>
            <button
              ref={closeRef}
              type="button"
              aria-label="Close fullscreen view"
              data-cursor="Close"
              onClick={() => onIndex(null)}
              className={cn(square, "size-14 border-y-0 border-r-0 sm:size-16")}
            >
              <X className="size-5" strokeWidth={1.5} />
            </button>
            {/* progress hairline */}
            <motion.span
              aria-hidden
              className="absolute bottom-[-1px] left-0 h-px w-full origin-left bg-signal"
              initial={false}
              animate={{ scaleX: ((index ?? 0) + 1) / Math.max(1, n) }}
              transition={{ duration: reduce ? 0 : 0.6, ease: EASE }}
            />
          </header>

          {/* ── picture ─────────────────────────────────────────── */}
          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 py-4 sm:px-16 sm:py-8">
            {/* crop marks */}
            <span aria-hidden className="pointer-events-none absolute left-3 top-3 size-3 border-l border-t border-paper/30 sm:left-6 sm:top-6" />
            <span aria-hidden className="pointer-events-none absolute right-3 top-3 size-3 border-r border-t border-paper/30 sm:right-6 sm:top-6" />
            <span aria-hidden className="pointer-events-none absolute bottom-3 left-3 size-3 border-b border-l border-paper/30 sm:bottom-6 sm:left-6" />
            <span aria-hidden className="pointer-events-none absolute bottom-3 right-3 size-3 border-b border-r border-paper/30 sm:bottom-6 sm:right-6" />

            <AnimatePresence initial={false} custom={dir} mode="popLayout">
              <motion.img
                key={photo.src}
                src={photo.src}
                alt={photo.title}
                custom={dir}
                variants={{
                  enter: (d: number) => ({ opacity: 0, x: d * shift, scale: reduce ? 1 : 0.985 }),
                  center: { opacity: 1, x: 0, scale: 1 },
                  exit: (d: number) => ({ opacity: 0, x: d * -shift, scale: reduce ? 1 : 0.985 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: reduce ? 0.15 : 0.55, ease: EASE }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.5}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -70) go(1)
                  else if (info.offset.x > 70) go(-1)
                }}
                data-cursor="Drag"
                className="max-h-full max-w-full cursor-grab rounded-none object-contain active:cursor-grabbing"
                draggable={false}
              />
            </AnimatePresence>
          </div>

          {/* ── caption + controls ──────────────────────────────── */}
          <div className="grid shrink-0 grid-cols-[1fr_auto] items-end gap-4 border-t border-hair px-4 py-4 sm:grid-cols-[auto_1fr_auto] sm:gap-8 sm:px-8 sm:py-5">
            <p aria-hidden className="font-display hidden text-5xl tabular-nums text-signal sm:block">
              {pad((index ?? 0) + 1)}
            </p>
            <div className="min-w-0">
              <div className="overflow-hidden pb-[0.08em]">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.h2
                    key={photo.slug}
                    className="font-display truncate text-3xl text-paper sm:text-5xl"
                    initial={{ y: reduce ? "0%" : "110%", opacity: reduce ? 0 : 1 }}
                    animate={{ y: "0%", opacity: 1 }}
                    exit={{ y: reduce ? "0%" : "-110%", opacity: reduce ? 0 : 1 }}
                    transition={{ duration: reduce ? 0.12 : 0.45, ease: EASE }}
                  >
                    {photo.title}
                  </motion.h2>
                </AnimatePresence>
              </div>
              <p className="label mt-2 truncate text-paper/50">
                <span className="text-paper/30">Exif&nbsp;&nbsp;</span>
                {photo.exif ?? "Not recorded"}
                <span className="text-paper/30">&nbsp;&nbsp;/&nbsp;&nbsp;{photo.w}×{photo.h}</span>
              </p>
            </div>
            <div className="flex gap-px">
              <button type="button" aria-label="Previous photo" data-cursor="Prev" onClick={() => go(-1)} className={square}>
                <ArrowLeft className="size-4" strokeWidth={1.5} />
              </button>
              <button type="button" aria-label="Next photo" data-cursor="Next" onClick={() => go(1)} className={square}>
                <ArrowRight className="size-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* ── contact strip ───────────────────────────────────── */}
          <div className="shrink-0 border-t border-hair px-4 py-3 sm:px-8">
            <div
              ref={thumbs}
              role="list"
              aria-label="All photos"
              className="no-scrollbar flex justify-start gap-1.5 overflow-x-auto px-1 py-1 sm:justify-center"
            >
              {photos.map((p, i) => (
                <button
                  key={p.src}
                  type="button"
                  role="listitem"
                  aria-label={`Show ${p.title}`}
                  aria-current={i === index ? "true" : undefined}
                  onClick={() => {
                    setDir(i > (index ?? 0) ? 1 : -1)
                    onIndex(i)
                  }}
                  className={cn(
                    "relative h-10 w-14 shrink-0 cursor-pointer overflow-hidden rounded-none opacity-35 grayscale transition duration-300 hover:opacity-90 hover:grayscale-0 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-paper sm:h-12 sm:w-[4.5rem]",
                    i === index && "opacity-100 grayscale-0 outline outline-1 outline-offset-2 outline-signal",
                  )}
                >
                  <img src={p.thumb} alt="" className="h-full w-full object-cover" loading="lazy" draggable={false} />
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
