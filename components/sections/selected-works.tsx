"use client"

import * as React from "react"
import { motion, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "framer-motion"
import { ArrowRight } from "lucide-react"
import { Lightbox } from "@/components/lightbox"
import { SELECTED } from "@/lib/places"

const EASE = [0.7, 0, 0.1, 1] as const
const PHOTOS = SELECTED.map((s) => s.photo)
const N = String(SELECTED.length).padStart(2, "0")

function useIsNarrow() {
  const [narrow, setNarrow] = React.useState(false)
  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)")
    const on = () => setNarrow(mq.matches)
    on()
    mq.addEventListener("change", on)
    return () => mq.removeEventListener("change", on)
  }, [])
  return narrow
}

function Card({ i, progress, onOpen, compact }: { i: number; progress?: MotionValue<number>; onOpen: (i: number) => void; compact?: boolean }) {
  const s = SELECTED[i]
  const reduce = useReducedMotion()
  const zero = useMotionValue(0)
  const shift = useTransform(progress ?? zero, [0, 1], reduce ? ["0%", "0%"] : ["6%", "-6%"])
  const ratio = s.photo.w / s.photo.h
  return (
    <figure className="group relative shrink-0 snap-center" style={{ height: compact ? "52svh" : "62svh", aspectRatio: String(ratio) }}>
      <button
        type="button"
        onClick={() => onOpen(i)}
        data-cursor="View"
        aria-label={`Open ${s.photo.title}`}
        className="relative block h-full w-full overflow-hidden border border-hair bg-black focus-visible:border-signal focus-visible:outline-none"
      >
        <motion.img
          src={s.photo.src}
          alt={s.photo.title}
          loading="lazy"
          draggable={false}
          style={{ x: compact ? 0 : shift, scale: 1.14 }}
          className="h-full w-full object-cover transition-[filter] duration-700 group-hover:brightness-110"
        />
        <span className="label absolute left-0 top-0 bg-ink px-2 py-1 text-signal">
          {String(i + 1).padStart(2, "0")}/{N}
        </span>
      </button>
      <figcaption className="mt-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-display truncate text-2xl text-paper sm:text-3xl">{s.photo.title}</p>
          <p className="mt-1 text-sm text-paper/55">{s.note}</p>
        </div>
        <div className="label shrink-0 text-right text-paper/40">
          <p className="text-paper/70">{s.body}</p>
          <p className="mt-1">{s.photo.exif ?? "—"}</p>
        </div>
      </figcaption>
    </figure>
  )
}

function Header() {
  return (
    <div className="flex w-[min(86vw,30rem)] shrink-0 flex-col justify-between self-stretch py-2 pr-6">
      <div>
        <p className="label text-paper/50">
          <span className="text-signal">02</span> — Selected works
        </p>
        <h2 className="font-display mt-6 text-[clamp(4rem,9vw,9rem)] text-paper">
          {["Selected", "frames"].map((w, i) => (
            <span key={w} className="block overflow-hidden">
              <motion.span
                className={"block " + (i === 1 ? "text-stroke" : "")}
                initial={{ y: "110%" }}
                whileInView={{ y: "0%" }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, delay: i * 0.08, ease: EASE }}
              >
                {w}
              </motion.span>
            </span>
          ))}
        </h2>
        <p className="mt-6 max-w-xs text-sm leading-relaxed text-paper/60">
          Eight frames from both bodies: cliffs, stages, temples and one tiger. Picked for the light, not the
          location.
        </p>
      </div>
      <div className="mt-10 flex items-end justify-between">
        <p className="font-display text-[clamp(4rem,8vw,7rem)] leading-none text-signal">{N}</p>
        <p className="label flex items-center gap-2 pb-2 text-paper/50">
          Scroll <ArrowRight className="size-3.5" />
        </p>
      </div>
    </div>
  )
}

export function SelectedWorks() {
  const section = React.useRef<HTMLElement>(null)
  const track = React.useRef<HTMLDivElement>(null)
  const narrow = useIsNarrow()
  const [lb, setLb] = React.useState<number | null>(null)
  const [dist, setDist] = React.useState(0)

  React.useEffect(() => {
    const el = track.current
    if (!el) return
    const measure = () => setDist(Math.max(0, el.scrollWidth - window.innerWidth))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener("resize", measure)
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [narrow])

  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] })
  const smooth = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 })
  const x = useTransform(smooth, [0, 1], [0, -dist])
  const [pct, setPct] = React.useState(0)
  useMotionValueEvent(smooth, "change", (v) => setPct(Math.round(v * 100)))

  if (narrow) {
    return (
      <section id="selected" className="relative border-t border-hair py-20">
        <div className="px-4">
          <Header />
        </div>
        <div className="no-scrollbar mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4" data-lenis-prevent>
          {SELECTED.map((_, i) => (
            <Card key={i} i={i} onOpen={setLb} compact />
          ))}
        </div>
        <Lightbox photos={PHOTOS} index={lb} onIndex={setLb} label="Selected works" />
      </section>
    )
  }

  return (
    <section ref={section} id="selected" className="relative h-[440vh] border-t border-hair">
      <div className="sticky top-0 flex h-svh flex-col justify-center overflow-hidden">
        <motion.div ref={track} className="flex items-center gap-10 pl-8 pr-[8vw] pt-10" style={{ x }}>
          <Header />
          {SELECTED.map((_, i) => (
            <Card key={i} i={i} progress={smooth} onOpen={setLb} />
          ))}
        </motion.div>

        <div className="absolute inset-x-8 bottom-6 flex items-center gap-6">
          <span className="label tabular-nums text-paper/50">{String(pct).padStart(3, "0")}%</span>
          <div className="relative h-px flex-1 bg-hair">
            <motion.div className="absolute inset-y-0 left-0 w-full origin-left bg-signal" style={{ scaleX: smooth }} />
          </div>
          <span className="label text-paper/50">Keep scrolling to roll the reel</span>
        </div>
      </div>
      <Lightbox photos={PHOTOS} index={lb} onIndex={setLb} label="Selected works" />
    </section>
  )
}
