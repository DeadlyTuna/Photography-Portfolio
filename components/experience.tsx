"use client"

import * as React from "react"
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useInView,
  useTransform,
  type MotionValue,
} from "framer-motion"
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react"
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
      animate={{
        ...target,
        opacity: isOther ? 0 : 1,
        // fully hidden (not just transparent) once faded, so its WebGL view stops costing anything
        ...(isOther ? { transitionEnd: { visibility: "hidden" } } : { visibility: "visible" }),
      }}
      transition={{ duration: full || isOther ? 1.1 : 0.9, ease: [0.7, 0, 0.2, 1] }}
    >
      <motion.div className="absolute inset-0" initial={false} animate={{ opacity: visible ? 1 : 0 }} transition={{ duration: 0.8 }}>
        <SketchfabCamera
          uid={UIDS[id]}
          title={`${c.name}, 3D model`}
          calib={CALIBRATION[id]}
          progress={scrollP}
          focus={focus}
          introAt={introAt}
          onReady={onReady}
        />
      </motion.div>

      {/* while the model streams in: a quiet "developing" marker instead of an empty hole */}
      <AnimatePresence>
        {!visible && phase !== "loading" ? (
          <motion.div
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <span className="relative flex size-10 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full border border-signal/40" />
              <span className="size-1.5 rounded-full bg-signal" />
            </span>
            <span className="label text-paper/40">Developing {c.short}…</span>
          </motion.div>
        ) : null}
      </AnimatePresence>

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

// ------------------------------------------------------------------ the cameras section

/**
 * Sits after Places, so the two Sketchfab models (which start loading the moment the page
 * opens) have had the whole first half of the visit to stream in. They spiral in when the
 * section comes into view, or as soon as they finish loading if the visitor got here first.
 */
export function Experience() {
  const section = React.useRef<HTMLElement>(null)
  const sticky = React.useRef<HTMLDivElement>(null)
  const narrow = useIsNarrow()
  const [phase, setPhase] = React.useState<Phase>("idle")
  const [selected, setSelected] = React.useState<CameraId | null>(null)
  const [shutterOpen, setShutterOpen] = React.useState(true)
  const [flash, setFlash] = React.useState(0)
  const [ready, setReady] = React.useState<Record<CameraId, number | null>>({ sony: null, nikon: null })
  const [enteredAt, setEnteredAt] = React.useState<number | null>(null)
  const [choosing, setChoosing] = React.useState(false)
  const focus = useMotionValue(0)
  const afterClose = React.useRef<null | (() => void)>(null)

  const inView = useInView(sticky, { amount: 0.4 })
  React.useEffect(() => {
    if (inView && enteredAt === null) setEnteredAt(performance.now())
  }, [inView, enteredAt])

  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] })
  const scrollP = useTransform(scrollYProgress, [0, 0.7], [0, 1], { clamp: true })
  const frameScale = useTransform(scrollYProgress, [0, 0.7], [0.96, 1.04])
  const headY = useTransform(scrollYProgress, [0, 1], ["0%", "-30%"])
  useMotionValueEvent(scrollYProgress, "change", (v) => setChoosing(v > 0.02 && v < 0.995))

  const markReady = React.useCallback((id: CameraId) => setReady((r) => (r[id] ? r : { ...r, [id]: performance.now() })), [])

  const introAt = (id: CameraId) => {
    const r = ready[id]
    if (enteredAt === null || r === null) return null
    return Math.max(enteredAt + 200 + (id === "nikon" ? 250 : 0), r + 300)
  }

  React.useEffect(() => {
    setScrollLocked(phase !== "idle")
  }, [phase])
  React.useEffect(() => () => setScrollLocked(false), [])

  const pick = React.useCallback(
    (id: CameraId) => {
      if (phase !== "idle" || introAt(id) === null) return
      setSelected(id)
      setPhase("focusing")
      animate(focus, 1, { duration: 3.2, ease: "linear", delay: 0.35 }).then(() => {
        afterClose.current = () => setPhase("gallery")
        setShutterOpen(false)
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [phase, focus, ready, enteredAt],
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
        sony: { left: "0%", top: "16%", width: "100%", height: "32%" },
        nikon: { left: "0%", top: "49%", width: "100%", height: "32%" },
      }
    : {
        sony: { left: "1.5%", top: "17%", width: "47.5%", height: "62%" },
        nikon: { left: "51%", top: "17%", width: "47.5%", height: "62%" },
      }

  return (
    <section ref={section} id="cameras" className="relative h-[200vh] border-t border-hair">
      <div ref={sticky} className="sticky top-0 h-svh w-full overflow-hidden bg-ink">
        {phase !== "gallery" ? <TopoField className="opacity-90" seed={5} /> : null}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_45%,transparent_40%,rgba(6,6,7,.85))]" />

        {/* header */}
        <motion.div className="pointer-events-none absolute inset-x-0 top-[76px] z-20 flex items-start justify-between px-4 sm:px-8" style={{ y: headY }}>
          <div>
            <p className="label text-paper/50">
              <span className="text-signal">03</span> — Two bodies
            </p>
            <h2 className="font-display mt-3 text-[clamp(2.4rem,6vw,5.5rem)] text-paper">
              Pick a <span className="text-stroke">camera</span>
            </h2>
          </div>
          <p className="label hidden max-w-[17rem] text-right text-paper/45 md:block">
            Real 3D models. Pick one — it turns around and takes you inside its screen.
          </p>
        </motion.div>

        <motion.div className="absolute inset-0" style={{ scale: frameScale }}>
          {IDS.map((id) => (
            <CameraFrame
              key={id}
              id={id}
              layout={layouts[id]}
              phase={phase}
              selected={selected}
              choosing={choosing && introAt(id) !== null}
              scrollP={scrollP}
              focus={focus}
              introAt={introAt(id)}
              onReady={() => markReady(id)}
              onPick={pick}
            />
          ))}
        </motion.div>

        <div className="pointer-events-none absolute inset-x-0 bottom-[5%] z-20 px-6 text-center">
          <AnimatePresence>
            {phase === "idle" ? (
              <motion.p className="label text-paper/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                Sony α7R III <span className="text-signal">/</span> Nikon D3100 — {SITE.year - SITE.since} years between them
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {phase === "gallery" && selected ? <Gallery id={selected} onBack={back} /> : null}

      <Shutter open={shutterOpen} onDone={onShutter} />
      <Flash fire={flash} />
    </section>
  )
}
