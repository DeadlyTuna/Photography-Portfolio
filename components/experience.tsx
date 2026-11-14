"use client"

import * as React from "react"
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion"
import { ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CircularGallery, type GalleryItem } from "@/components/ui/circular-gallery"
import { TopoField } from "@/components/ui/topo-field"
import { Lightbox } from "@/components/lightbox"
import { SketchfabCamera, CALIBRATION } from "@/components/sketchfab-camera"
import { Shutter, Flash } from "@/components/shutter"
import { setScrollLocked } from "@/components/smooth-scroll"
import { CAMERAS, type CameraId } from "@/lib/photos"
import { SITE } from "@/lib/site"

const EASE = [0.2, 0.7, 0.2, 1] as const
const IDS: CameraId[] = ["sony", "nikon"]
const UIDS: Record<CameraId, string> = {
  sony: "aa7ecf6efe144d1d9898a0ae294e0722",
  nikon: "7793688671a64b5fbeac5a57543fad3d",
}
const INDEX: Record<CameraId, string> = { sony: "Body 01", nikon: "Body 02" }

type Phase = "loading" | "idle" | "focusing" | "gallery" | "returning"

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

/** Letters rise out of a mask one by one. */
function Rise({ text, show, delay = 0, className }: { text: string; show: boolean; delay?: number; className?: string }) {
  return (
    <span className={"inline-flex overflow-hidden " + (className ?? "")} aria-label={text}>
      {Array.from(text).map((ch, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="inline-block"
          initial={{ y: "110%" }}
          animate={show ? { y: "0%" } : { y: "110%" }}
          transition={{ delay: delay + i * 0.035, duration: 0.9, ease: [0.7, 0, 0.1, 1] }}
        >
          {ch === " " ? " " : ch}
        </motion.span>
      ))}
    </span>
  )
}

// ------------------------------------------------------------------ one camera frame

function CameraFrame({
  id,
  layout,
  phase,
  selected,
  choosing,
  scrollP,
  focus,
  introAt,
  onReady,
  onPick,
}: {
  id: CameraId
  layout: Record<string, string>
  phase: Phase
  selected: CameraId | null
  choosing: boolean
  scrollP: MotionValue<number>
  focus: MotionValue<number>
  introAt: number | null
  onReady: () => void
  onPick: (id: CameraId) => void
}) {
  const c = CAMERAS[id]
  const isSel = selected === id
  const isOther = selected !== null && !isSel
  const full = isSel && (phase === "focusing" || phase === "gallery")
  const target = full ? { left: "0%", top: "0%", width: "100%", height: "100%" } : layout
  const canPick = phase === "idle" && choosing
  const visible = introAt !== null

  return (
    <motion.div
      className="absolute"
      style={{ zIndex: full ? 40 : 5 }}
      initial={false}
      animate={{ ...target, opacity: isOther ? 0 : visible ? 1 : 0 }}
      transition={{ duration: full || isOther ? 1.1 : 0.9, ease: [0.7, 0, 0.2, 1] }}
    >
      <SketchfabCamera
        uid={UIDS[id]}
        title={`${c.name}, 3D model`}
        calib={CALIBRATION[id]}
        progress={scrollP}
        focus={focus}
        introAt={introAt}
        onReady={onReady}
      />

      {/* viewfinder corners, always faintly there; they snap in when choosable */}
      {!full ? (
        <div className="pointer-events-none absolute inset-3">
          {(["left-0 top-0 border-l border-t", "right-0 top-0 border-r border-t", "left-0 bottom-0 border-l border-b", "right-0 bottom-0 border-r border-b"] as const).map((k) => (
            <span
              key={k}
              className={
                "absolute size-5 transition-all duration-500 " +
                (canPick ? "border-signal/70 " : "border-paper/15 ") +
                k
              }
            />
          ))}
          <span className="label absolute left-3 top-2 text-[9px] text-paper/40">
            {INDEX[id]} · {c.short}
          </span>
        </div>
      ) : null}

      <AnimatePresence>
        {canPick ? (
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
          >
            <button
              type="button"
              aria-label={`Look through the ${c.name}`}
              data-cursor="Enter"
              onClick={() => onPick(id)}
              className="group absolute inset-0 cursor-pointer outline-none"
            >
              <span className="absolute inset-3 border border-signal/0 transition duration-500 group-hover:border-signal/40 group-focus-visible:border-signal" />
            </button>
            <div className="pointer-events-none absolute inset-x-0 bottom-[5%] flex flex-col items-center text-center">
              <p className="label text-signal">{INDEX[id]}</p>
              <h3 className="font-display mt-2 text-[clamp(2.4rem,4.6vw,4.4rem)] text-paper">{c.name}</h3>
              <p className="label mt-2 hidden text-paper/45 sm:block">{c.specs.join("  /  ")}</p>
              <Button
                size="sm"
                onClick={() => onPick(id)}
                className="label pointer-events-auto mt-4 h-9 rounded-none bg-signal px-5 text-ink hover:bg-paper"
              >
                Look through it <ArrowUpRight />
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  )
}

// ------------------------------------------------------------------ inside the screen

function Gallery({ id, onBack }: { id: CameraId; onBack: () => void }) {
  const c = CAMERAS[id]
  const [lb, setLb] = React.useState<number | null>(null)
  const [frontIdx, setFrontIdx] = React.useState(0)
  const [step, setStep] = React.useState({ n: 0, d: 0 })
  const [titled, setTitled] = React.useState(false)
  const items = React.useMemo<GalleryItem[]>(
    () => c.photos.map((p) => ({ common: p.title, binomial: p.exif ?? "", photo: { url: p.thumb, text: p.title, by: c.name } })),
    [c],
  )
  const front = c.photos[frontIdx]

  React.useEffect(() => {
    const t = window.setTimeout(() => setTitled(true), 1900)
    return () => window.clearTimeout(t)
  }, [])

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && lb === null) onBack()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [lb, onBack])

  const nudge = (d: number) => setStep((s) => ({ n: s.n + 1, d }))

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-ink text-paper" data-lenis-prevent>
      <TopoField opacity={0.1} highlight={-1} annotations={false} speed={0.6} seed={id === "sony" ? 3 : 11} />

      <div className="relative z-10 flex h-16 items-center justify-between border-b border-hair px-4 sm:px-8">
        <button
          type="button"
          onClick={onBack}
          data-cursor="Back"
          className="label group flex cursor-pointer items-center gap-3 text-paper/70 transition hover:text-signal"
        >
          <ArrowLeft className="size-4 transition group-hover:-translate-x-1" /> Back to bodies
        </button>
        <p className="label hidden text-paper/40 md:block">
          {INDEX[id]} — {c.name} — Playback
        </p>
        <p className="label tabular-nums text-paper/70">
          <span className="text-signal">{String(frontIdx + 1).padStart(2, "0")}</span> / {String(c.photos.length).padStart(2, "0")}
        </p>
      </div>

      <motion.div
        className="relative z-10 min-h-0 flex-1"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: titled ? 1 : 0, scale: titled ? 1 : 0.92 }}
        transition={{ duration: 1.1, ease: EASE }}
      >
        <CircularGallery items={items} accent="#c6ff3d" onItemClick={setLb} onFrontChange={setFrontIdx} step={step} />
      </motion.div>

      <AnimatePresence>
        {!titled ? (
          <motion.div
            className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.6 }}
          >
            <p className="label text-signal">{INDEX[id]} — {c.photos.length} frames</p>
            <h2 className="font-display mt-4 text-[clamp(4rem,16vw,15rem)]">
              <Rise text={c.short} show delay={0.1} />
            </h2>
            <p className="label mt-4 text-paper/50">{c.specs.join("  /  ")}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="relative z-10 grid grid-cols-[auto_1fr_auto] items-stretch border-t border-hair">
        <button type="button" aria-label="Previous frame" onClick={() => nudge(-1)} className="cursor-pointer border-r border-hair px-5 text-paper/60 transition hover:bg-signal hover:text-ink sm:px-8">
          <ArrowLeft className="size-5" />
        </button>
        <button type="button" onClick={() => setLb(frontIdx)} data-cursor="Open" className="group min-w-0 cursor-zoom-in px-5 py-4 text-left sm:px-8">
          <p className="font-display truncate text-[clamp(1.6rem,3.6vw,3rem)]">{front?.title}</p>
          <p className="label mt-2 flex flex-wrap gap-x-5 text-paper/45">
            <span>{front?.exif ?? "exif stripped"}</span>
            <span className="text-signal group-hover:underline">Open full frame ↗</span>
            <span className="hidden md:inline">Drag · scroll · ← → to rotate</span>
          </p>
        </button>
        <button type="button" aria-label="Next frame" onClick={() => nudge(1)} className="cursor-pointer border-l border-hair px-5 text-paper/60 transition hover:bg-signal hover:text-ink sm:px-8">
          <ArrowRight className="size-5" />
        </button>
      </div>

      <Lightbox photos={c.photos} index={lb} onIndex={setLb} label={`${INDEX[id]} — ${c.name}`} />
    </div>
  )
}

// ------------------------------------------------------------------ opening act

export function Experience() {
  const section = React.useRef<HTMLElement>(null)
  const narrow = useIsNarrow()
  const [phase, setPhase] = React.useState<Phase>("loading")
  const [selected, setSelected] = React.useState<CameraId | null>(null)
  const [shutterOpen, setShutterOpen] = React.useState(false)
  const [flash, setFlash] = React.useState(0)
  const [revealedAt, setRevealedAt] = React.useState<number | null>(null)
  const [ready, setReady] = React.useState<Record<CameraId, number | null>>({ sony: null, nikon: null })
  const [choosing, setChoosing] = React.useState(false)
  const [count, setCount] = React.useState(0)
  const focus = useMotionValue(0)
  const afterClose = React.useRef<null | (() => void)>(null)

  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] })
  const scrollP = useTransform(scrollYProgress, [0.08, 0.5], [0, 1], { clamp: true })
  const nameY = useTransform(scrollYProgress, [0.02, 0.3], ["0%", "60%"])
  const nameOpacity = useTransform(scrollYProgress, [0.08, 0.28], [1, 0])
  const topOpacity = useTransform(scrollYProgress, [0.02, 0.16], [1, 0])
  const frameScale = useTransform(scrollYProgress, [0.08, 0.5], [1, 1.08])
  const frameY = useTransform(scrollYProgress, [0.08, 0.5], ["0%", "6%"])
  const pickOpacity = useTransform(scrollYProgress, [0.38, 0.5], [0, 1])
  useMotionValueEvent(scrollYProgress, "change", (v) => setChoosing(v > 0.4))

  // Preloader counter (honest: tracks the two models, eases toward the next milestone).
  const loaded = (ready.sony ? 1 : 0) + (ready.nikon ? 1 : 0)
  React.useEffect(() => {
    if (phase !== "loading") return
    const cap = loaded === 2 ? 100 : loaded === 1 ? 82 : 64
    const id = window.setInterval(() => setCount((c) => (c < cap ? c + Math.max(1, Math.round((cap - c) / 12)) : c)), 60)
    return () => window.clearInterval(id)
  }, [phase, loaded])

  const markReady = React.useCallback((id: CameraId) => setReady((r) => (r[id] ? r : { ...r, [id]: performance.now() })), [])
  React.useEffect(() => {
    if (phase !== "loading") return
    const both = ready.sony !== null && ready.nikon !== null
    const t = window.setTimeout(
      () => {
        setCount(100)
        setFlash((f) => f + 1)
        setShutterOpen(true)
        setRevealedAt(performance.now())
        setPhase("idle")
      },
      both ? 900 : 7000,
    )
    return () => window.clearTimeout(t)
  }, [phase, ready])

  const introAt = (id: CameraId) => {
    const r = ready[id]
    if (revealedAt === null || r === null) return null
    return Math.max(revealedAt + 700 + (id === "nikon" ? 250 : 0), r + 200)
  }

  React.useEffect(() => {
    setScrollLocked(!(phase === "idle" || phase === "loading"))
  }, [phase])
  React.useEffect(() => () => setScrollLocked(false), [])

  const pick = React.useCallback(
    (id: CameraId) => {
      if (phase !== "idle") return
      setSelected(id)
      setPhase("focusing")
      animate(focus, 1, { duration: 3.2, ease: "linear", delay: 0.35 }).then(() => {
        afterClose.current = () => setPhase("gallery")
        setShutterOpen(false)
      })
    },
    [phase, focus],
  )

  const back = React.useCallback(() => {
    afterClose.current = () => {
      setPhase("returning")
      animate(focus, 0, { duration: 2.6, ease: "linear", delay: 0.5 }).then(() => {
        setPhase("idle")
        setSelected(null)
      })
    }
    setShutterOpen(false)
  }, [focus])

  const onShutter = (open: boolean) => {
    if (open) return
    const next = afterClose.current
    afterClose.current = null
    next?.()
    window.setTimeout(() => {
      setFlash((f) => f + 1)
      setShutterOpen(true)
    }, 160)
  }

  const layouts: Record<CameraId, Record<string, string>> = narrow
    ? {
        sony: { left: "0%", top: "14%", width: "100%", height: "33%" },
        nikon: { left: "0%", top: "47%", width: "100%", height: "33%" },
      }
    : {
        sony: { left: "1.5%", top: "13%", width: "47.5%", height: "64%" },
        nikon: { left: "51%", top: "13%", width: "47.5%", height: "64%" },
      }

  const shown = revealedAt !== null

  return (
    <section ref={section} id="cameras" className="relative h-[270vh]">
      <div className="sticky top-0 h-svh w-full overflow-hidden bg-ink">
        <TopoField className="opacity-90" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_45%,transparent_40%,rgba(6,6,7,.85))]" />

        <motion.div className="absolute inset-0" style={{ scale: frameScale, y: frameY }}>
          {IDS.map((id) => (
            <CameraFrame
              key={id}
              id={id}
              layout={layouts[id]}
              phase={phase}
              selected={selected}
              choosing={choosing}
              scrollP={scrollP}
              focus={focus}
              introAt={introAt(id)}
              onReady={() => markReady(id)}
              onPick={pick}
            />
          ))}
        </motion.div>

        {/* top meta row, under the nav */}
        <motion.div
          className="pointer-events-none absolute inset-x-0 top-[72px] z-20 hidden justify-between px-4 sm:flex sm:px-8"
          style={{ opacity: topOpacity }}
        >
          <motion.p
            className="max-w-xs text-sm leading-relaxed text-paper/60"
            initial={{ opacity: 0, y: 10 }}
            animate={shown ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 1.4, duration: 0.9 }}
          >
            {SITE.intro}
          </motion.p>
          <motion.div
            className="label text-right text-paper/45"
            initial={{ opacity: 0 }}
            animate={shown ? { opacity: 1 } : {}}
            transition={{ delay: 1.6, duration: 0.9 }}
          >
            <p>{SITE.roles.join(" / ")}</p>
            <p className="mt-2">
              Est. {SITE.since} — <span className="text-signal">{SITE.year - SITE.since} yrs</span>
            </p>
          </motion.div>
        </motion.div>

        {/* the giant name */}
        <motion.div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-3 pb-4 sm:px-6"
          style={{ y: nameY, opacity: nameOpacity }}
        >
          <div className="label mb-2 flex items-end justify-between text-paper/45">
            <motion.span initial={{ opacity: 0 }} animate={shown ? { opacity: 1 } : {}} transition={{ delay: 1.2 }}>
              Field notes — {SITE.since}/{SITE.year}
            </motion.span>
            <motion.span
              className="flex items-center gap-2"
              initial={{ opacity: 0 }}
              animate={shown ? { opacity: 1 } : {}}
              transition={{ delay: 2 }}
            >
              Scroll — pick a body <ArrowDownRight className="size-3.5 text-signal" />
            </motion.span>
          </div>
          <h1 className="font-display flex items-end justify-between gap-4 text-paper">
            <Rise text={SITE.first} show={shown} delay={0.1} className="text-[clamp(3.4rem,15.2vw,17rem)] leading-[0.8]" />
          </h1>
          <div className="mt-1 flex items-start justify-between">
            <Rise text={SITE.last} show={shown} delay={0.5} className="font-display text-stroke text-[clamp(1.8rem,6vw,6.5rem)] leading-[0.85]" />
            <motion.p
              className="label hidden max-w-[16rem] text-right text-paper/40 md:block"
              initial={{ opacity: 0 }}
              animate={shown ? { opacity: 1 } : {}}
              transition={{ delay: 1.8 }}
            >
              Real camera models — Sony α7R III &amp; Nikon D3100. Move your cursor to raise the terrain.
            </motion.p>
          </div>
        </motion.div>

        {/* chooser headline */}
        <motion.div className="pointer-events-none absolute inset-x-0 bottom-[6%] z-20 px-6 text-center" style={{ opacity: pickOpacity }}>
          <AnimatePresence>
            {phase === "idle" && choosing ? (
              <motion.p className="label text-paper/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                Two bodies — <span className="text-signal">choose one</span> — it turns around and takes you inside
              </motion.p>
            ) : null}
          </AnimatePresence>
        </motion.div>
      </div>

      {phase === "gallery" && selected ? <Gallery id={selected} onBack={back} /> : null}

      <Shutter open={shutterOpen} onDone={onShutter}>
        {phase === "loading" ? (
          <div className="flex w-full max-w-5xl items-end justify-between px-6">
            <div className="label text-paper/40">
              <p>Loading terrain</p>
              <p className="mt-1">{loaded}/2 bodies</p>
            </div>
            <p className="font-display text-[clamp(5rem,16vw,14rem)] tabular-nums text-paper">
              {String(count).padStart(3, "0")}
            </p>
          </div>
        ) : null}
      </Shutter>
      <Flash fire={flash} />
    </section>
  )
}
