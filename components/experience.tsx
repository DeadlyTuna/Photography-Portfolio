"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { AnimatePresence, motion, useInView, useMotionValueEvent, useScroll, useTransform } from "framer-motion"
import { ArrowDown, ArrowLeft, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CircularGallery, type GalleryItem } from "@/components/ui/circular-gallery"
import { Lightbox } from "@/components/lightbox"
import { CAMERAS, type CameraId } from "@/lib/photos"
import { SITE } from "@/lib/site"
import type { Phase } from "@/components/scene/camera-stage"

const CameraStage = dynamic(() => import("@/components/scene/camera-stage"), { ssr: false })

const EASE = [0.2, 0.7, 0.2, 1] as const

// ------------------------------------------------------------------ intro pieces

/** An aperture that opens on load: black frame, octagonal hole growing and twisting. */
function Iris() {
  const stops = ["f/22", "f/16", "f/11", "f/8", "f/5.6", "f/4", "f/2.8", "f/1.4"]
  const [k, setK] = React.useState(0)
  React.useEffect(() => {
    const id = window.setInterval(() => setK((v) => Math.min(v + 1, stops.length - 1)), 140)
    return () => window.clearInterval(id)
  }, [stops.length])
  const oct = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8
    return `${(Math.cos(a) * 10).toFixed(2)},${(Math.sin(a) * 10).toFixed(2)}`
  }).join(" ")
  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-[80]"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ delay: 1.9, duration: 0.5 }}
    >
      <svg className="h-full w-full" viewBox="-50 -50 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <defs>
          <mask id="iris-mask">
            <rect x="-100" y="-100" width="200" height="200" fill="white" />
            <motion.polygon
              points={oct}
              fill="black"
              initial={{ scale: 0, rotate: -40 }}
              animate={{ scale: 9, rotate: 30 }}
              transition={{ delay: 0.55, duration: 1.5, ease: [0.7, 0, 0.2, 1] }}
            />
          </mask>
        </defs>
        <rect x="-100" y="-100" width="200" height="200" fill="#070707" mask="url(#iris-mask)" />
        <motion.polygon
          points={oct}
          fill="none"
          stroke="rgba(255,255,255,.25)"
          strokeWidth={0.15}
          initial={{ scale: 0, rotate: -40 }}
          animate={{ scale: 9, rotate: 30 }}
          transition={{ delay: 0.55, duration: 1.5, ease: [0.7, 0, 0.2, 1] }}
        />
      </svg>
      <motion.p
        className="absolute bottom-10 left-1/2 -translate-x-1/2 font-mono text-xs tracking-[0.4em] text-white/70"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ delay: 1.3, duration: 0.4 }}
      >
        {stops[k]}
      </motion.p>
    </motion.div>
  )
}

function Timecode() {
  const ref = React.useRef<HTMLSpanElement>(null)
  React.useEffect(() => {
    const t0 = performance.now()
    let raf = 0
    const tick = () => {
      const s = (performance.now() - t0) / 1000
      const ff = Math.floor((s % 1) * 24)
      const ss = Math.floor(s) % 60
      const mm = Math.floor(s / 60) % 60
      if (ref.current)
        ref.current.textContent = `00:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}:${String(ff).padStart(2, "0")}`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return <span ref={ref}>00:00:00:00</span>
}

function Corner({ className }: { className: string }) {
  return <span className={"absolute size-7 border-white/50 sm:size-10 " + className} />
}

/** Viewfinder overlay: corner brackets, REC, exposure readouts and a light meter. */
function Hud({ caption }: { caption: string }) {
  return (
    <motion.div
      className="pointer-events-none absolute inset-3 z-20 font-mono text-[10px] uppercase tracking-[0.2em] text-white/70 sm:inset-6 sm:text-[11px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.2, duration: 0.8 }}
    >
      <Corner className="left-0 top-0 border-l-2 border-t-2" />
      <Corner className="right-0 top-0 border-r-2 border-t-2" />
      <Corner className="bottom-0 left-0 border-b-2 border-l-2" />
      <Corner className="bottom-0 right-0 border-b-2 border-r-2" />
      <div className="absolute left-5 top-4 flex items-center gap-2 sm:left-8 sm:top-6">
        <span className="size-2 animate-pulse rounded-full bg-red-500 shadow-[0_0_10px_#ef4444]" />
        <span className="text-white">REC</span>
        <span className="hidden sm:inline">
          <Timecode />
        </span>
      </div>
      <div className="absolute right-5 top-4 flex items-center gap-3 sm:right-8 sm:top-6">
        <span className="hidden sm:inline">RAW+JPG</span>
        <span className="flex items-center gap-1">
          <span className="relative inline-block h-2.5 w-5 rounded-[2px] border border-white/70 after:absolute after:-right-[3px] after:top-[2px] after:h-1 after:w-[2px] after:bg-white/70">
            <span className="absolute inset-[1px] w-[70%] bg-white/80" />
          </span>
          <span>[{SITE.shots}]</span>
        </span>
      </div>
      <div className="absolute bottom-4 left-5 flex gap-3 sm:bottom-6 sm:left-8 sm:gap-5">
        <span className="text-white">1/250</span>
        <span>F2.8</span>
        <span>ISO 100</span>
        <span className="hidden sm:inline">AF-C</span>
      </div>
      <div className="absolute bottom-4 right-5 hidden items-center gap-1 sm:bottom-6 sm:right-8 sm:flex">
        <span>-2</span>
        <span className="relative mx-1 flex h-3 items-end gap-[5px]">
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} className={"w-px bg-white/60 " + (i % 2 ? "h-1.5" : "h-3")} />
          ))}
          <motion.span
            className="absolute -top-2 h-0 w-0 border-x-[4px] border-t-[5px] border-x-transparent border-t-amber-400"
            animate={{ left: ["10%", "62%", "44%", "50%"] }}
            transition={{ delay: 1.6, duration: 2.4, ease: "easeInOut" }}
          />
        </span>
        <span>+2</span>
      </div>
      <div className="absolute left-1/2 top-4 -translate-x-1/2 text-white/60 sm:top-6">{caption}</div>
    </motion.div>
  )
}

function SplitName({ text, delay, className }: { text: string; delay: number; className?: string }) {
  return (
    <span className={"inline-flex overflow-hidden pb-[0.08em] " + (className ?? "")} aria-label={text}>
      {Array.from(text).map((ch, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="inline-block"
          initial={{ y: "105%", opacity: 0, filter: "blur(14px)" }}
          animate={{ y: "0%", opacity: 1, filter: "blur(0px)" }}
          transition={{ delay: delay + i * 0.045, duration: 0.95, ease: EASE }}
        >
          {ch === " " ? " " : ch}
        </motion.span>
      ))}
    </span>
  )
}

// ------------------------------------------------------------------ chooser labels

function CameraLabel({
  id,
  visible,
  onPick,
}: {
  id: CameraId
  visible: boolean
  onPick: (id: CameraId) => void
}) {
  const c = CAMERAS[id]
  return (
    <motion.div
      className="w-[min(78vw,280px)] text-center"
      animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 16 }}
      transition={{ duration: 0.5, ease: EASE }}
      style={{ pointerEvents: visible ? "auto" : "none" }}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: c.accent }}>
        {id === "sony" ? "Body 01 · now" : "Body 02 · since 2011"}
      </p>
      <h3 className="font-display mt-1 text-3xl leading-none text-white sm:text-4xl">{c.name}</h3>
      <p className="mt-2 hidden font-mono text-[10px] uppercase tracking-[0.16em] text-white/55 sm:block">{c.tagline}</p>
      <Button
        size="sm"
        className="mt-3 rounded-none px-4 font-mono font-bold text-[11px] uppercase tracking-[0.18em] text-black hover:brightness-110"
        style={{ background: c.accent }}
        onClick={() => onPick(id)}
      >
        Look through it <ArrowRight />
      </Button>
    </motion.div>
  )
}

// ------------------------------------------------------------------ the gallery "inside" the screen

function Gallery({ id, onBack }: { id: CameraId; onBack: () => void }) {
  const c = CAMERAS[id]
  const [lb, setLb] = React.useState<number | null>(null)
  const [frontIdx, setFrontIdx] = React.useState(0)
  const [step, setStep] = React.useState({ n: 0, d: 0 })
  const items = React.useMemo<GalleryItem[]>(
    () =>
      c.photos.map((p) => ({
        common: p.title,
        binomial: p.exif ?? "",
        photo: { url: p.thumb, text: p.title, by: c.name },
      })),
    [c],
  )
  const front = c.photos[frontIdx]

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && lb === null) onBack()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [lb, onBack])

  const nudge = (d: number) => setStep((s) => ({ n: s.n + 1, d }))

  return (
    <motion.div
      key={id}
      className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-black text-white"
      style={{ "--acc": c.accent } as React.CSSProperties}
      initial={{ clipPath: "inset(18% 22% 18% 22%)", opacity: 0 }}
      animate={{ clipPath: "inset(0% 0% 0% 0%)", opacity: 1 }}
      exit={{ clipPath: "inset(18% 22% 18% 22%)", opacity: 0 }}
      transition={{ duration: 0.75, ease: [0.7, 0, 0.2, 1] }}
    >
      {/* raw grid */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.05)_1px,transparent_1px)] bg-[size:80px_80px]" />
      {/* giant body name behind the ring */}
      <motion.p
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 select-none whitespace-nowrap text-center text-[22vw] font-black uppercase leading-none tracking-[-0.06em] text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,.14)]"
        initial={{ x: "8%", opacity: 0 }}
        animate={{ x: "0%", opacity: 1 }}
        transition={{ delay: 0.3, duration: 1.2, ease: EASE }}
      >
        {c.short}
      </motion.p>

      {/* top bar */}
      <div className="relative z-10 flex items-stretch border-b border-white/20">
        <button
          type="button"
          onClick={onBack}
          className="flex cursor-pointer items-center gap-3 px-5 py-4 font-mono text-xs font-bold uppercase tracking-[0.2em] text-black transition-[filter] hover:brightness-110 sm:px-7"
          style={{ background: c.accent }}
        >
          <ArrowLeft className="size-4" /> Back <span className="hidden opacity-60 sm:inline">/ Esc</span>
        </button>
        <div className="flex flex-1 items-center justify-between gap-4 px-5 font-mono text-[10px] uppercase tracking-[0.25em] text-white/60 sm:px-7">
          <span className="hidden sm:inline">Playback // {c.name}</span>
          <span className="sm:hidden">{c.short}</span>
          <span className="text-white">
            {String(frontIdx + 1).padStart(2, "0")} / {String(c.photos.length).padStart(2, "0")}
          </span>
        </div>
      </div>

      {/* ring */}
      <div className="relative z-10 min-h-0 flex-1">
        <CircularGallery items={items} accent={c.accent} onItemClick={setLb} onFrontChange={setFrontIdx} step={step} autoFocus />
      </div>

      {/* bottom bar */}
      <div className="relative z-10 grid grid-cols-[auto_1fr_auto] items-stretch border-t border-white/20">
        <button type="button" aria-label="Previous photo" onClick={() => nudge(-1)} className="cursor-pointer border-r border-white/20 px-5 transition hover:bg-white hover:text-black sm:px-7">
          <ArrowLeft className="size-5" />
        </button>
        <button type="button" onClick={() => setLb(frontIdx)} className="group min-w-0 cursor-zoom-in px-5 py-4 text-left sm:px-7">
          <p className="truncate text-[clamp(1.4rem,4vw,3rem)] font-black uppercase leading-none tracking-[-0.04em]">{front?.title}</p>
          <p className="mt-2 flex flex-wrap gap-x-4 font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">
            <span>{front?.exif ?? "exif stripped"}</span>
            <span className="text-[var(--acc)] group-hover:underline">Click to open fullscreen ↗</span>
            <span className="hidden md:inline">Drag / scroll / ← → to rotate</span>
          </p>
        </button>
        <button type="button" aria-label="Next photo" onClick={() => nudge(1)} className="cursor-pointer border-l border-white/20 px-5 transition hover:bg-white hover:text-black sm:px-7">
          <ArrowRight className="size-5" />
        </button>
      </div>

      <Lightbox photos={c.photos} index={lb} onIndex={setLb} accent={c.accent} label={c.name} />
    </motion.div>
  )
}

// ------------------------------------------------------------------ the whole opening act

export function Experience() {
  const section = React.useRef<HTMLElement>(null)
  const sticky = React.useRef<HTMLDivElement>(null)
  const [startedAt] = React.useState(() => (typeof performance !== "undefined" ? performance.now() : 0))
  const [phase, setPhase] = React.useState<Phase>("idle")
  const [selected, setSelected] = React.useState<CameraId | null>(null)
  const [choosing, setChoosing] = React.useState(false)
  const labelRefs = React.useRef<Record<CameraId, HTMLDivElement | null>>({ sony: null, nikon: null })
  const inView = useInView(sticky, { margin: "0px 0px -5% 0px" })

  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] })
  const camP = useTransform(scrollYProgress, [0.1, 0.5], [0, 1], { clamp: true })
  const nameOpacity = useTransform(scrollYProgress, [0.04, 0.26], [1, 0])
  const nameY = useTransform(scrollYProgress, [0.04, 0.3], [0, -120])
  const nameBlur = useTransform(scrollYProgress, [0.04, 0.26], ["blur(0px)", "blur(12px)"])
  const pickOpacity = useTransform(scrollYProgress, [0.38, 0.52], [0, 1])
  const pickY = useTransform(scrollYProgress, [0.38, 0.52], [30, 0])
  const cueOpacity = useTransform(scrollYProgress, [0, 0.06], [1, 0])

  useMotionValueEvent(scrollYProgress, "change", (v) => setChoosing(v > 0.42))

  // Keep the page still while the camera turns and while you're "inside" it.
  React.useEffect(() => {
    const el = document.documentElement
    if (phase !== "idle") el.style.overflow = "hidden"
    else el.style.overflow = ""
    return () => {
      el.style.overflow = ""
    }
  }, [phase])

  const pick = React.useCallback(
    (id: CameraId) => {
      if (phase !== "idle") return
      setSelected(id)
      setPhase("focusing")
    },
    [phase],
  )
  const back = React.useCallback(() => setPhase("returning"), [])
  const onFocused = React.useCallback(() => setPhase("gallery"), [])
  const onReturned = React.useCallback(() => {
    setPhase("idle")
    setSelected(null)
  }, [])

  const labelsVisible = choosing && phase === "idle"
  const caption = phase === "idle" ? (choosing ? "SELECT BODY" : "STANDBY") : phase === "gallery" ? "PLAYBACK" : "FOCUSING"

  return (
    <section ref={section} id="top" className="relative h-[290vh]">
      <div ref={sticky} className="sticky top-0 h-svh w-full overflow-hidden">
        {/* backdrop: warm vignette + a soft glow behind each body */}
        <div className="absolute inset-0 bg-[radial-gradient(90%_70%_at_50%_45%,#1d1a17_0%,#0b0a09_60%,#050505_100%)]" />
        <div className="absolute left-[8%] top-[30%] size-[38vmax] -translate-x-1/2 rounded-full bg-[#f0782d]/10 blur-[110px]" />
        <div className="absolute right-[8%] top-[30%] size-[38vmax] translate-x-1/2 rounded-full bg-[#f5c518]/[0.07] blur-[110px]" />

        <CameraStage
          progress={camP}
          phase={phase}
          selected={selected}
          startedAt={startedAt}
          active={inView && phase !== "gallery"}
          onSelect={pick}
          onFocused={onFocused}
          onReturned={onReturned}
          labelRefs={labelRefs}
        />

        {(["sony", "nikon"] as const).map((id) => (
          <div
            key={id}
            ref={(el) => {
              labelRefs.current[id] = el
            }}
            className="pointer-events-none absolute left-0 top-0 z-30 will-change-transform"
          >
            <CameraLabel id={id} visible={labelsVisible} onPick={pick} />
          </div>
        ))}

        <Hud caption={caption} />

        {/* name + intro, in front of the cameras */}
        <motion.div
          className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center"
          style={{ opacity: nameOpacity, y: nameY, filter: nameBlur }}
        >
          <motion.div
            className="relative px-6 py-4 sm:px-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.15, duration: 0.3 }}
          >
            {/* AF box that hunts, then locks green */}
            <motion.div
              className="absolute inset-0"
              initial={{ scale: 1.35, opacity: 0 }}
              animate={{ scale: [1.35, 0.94, 1.03, 1], opacity: [0, 1, 1, 1] }}
              transition={{ delay: 1.2, duration: 1.2, times: [0, 0.5, 0.8, 1] }}
            >
              {["left-0 top-0 border-l border-t", "right-0 top-0 border-r border-t", "left-0 bottom-0 border-l border-b", "right-0 bottom-0 border-r border-b"].map((c) => (
                <motion.span
                  key={c}
                  className={"absolute size-5 " + c}
                  initial={{ borderColor: "rgba(255,255,255,.7)" }}
                  animate={{ borderColor: ["rgba(255,255,255,.7)", "rgba(74,222,128,1)", "rgba(74,222,128,0)"] }}
                  transition={{ delay: 2.2, duration: 2.2, times: [0, 0.15, 1] }}
                />
              ))}
            </motion.div>
            <motion.p
              className="mb-3 font-mono text-[10px] uppercase tracking-[0.5em] text-white/60 sm:text-xs"
              initial={{ opacity: 0, letterSpacing: "1.2em" }}
              animate={{ opacity: 1, letterSpacing: "0.5em" }}
              transition={{ delay: 1.3, duration: 1.2, ease: EASE }}
            >
              Portfolio · {SITE.since}—{SITE.year}
            </motion.p>
            <h1 className="font-display leading-[0.84] text-[#f4f2ee]">
              <SplitName text={SITE.first} delay={1.45} className="text-[clamp(2.6rem,10vw,8.5rem)]" />
              <br />
              <SplitName
                text={SITE.last}
                delay={1.75}
                className="text-outline text-[clamp(2.6rem,10vw,8.5rem)]"
              />
            </h1>
          </motion.div>
          <motion.p
            className="mt-4 font-mono text-[10px] uppercase tracking-[0.35em] text-white/70 sm:text-xs"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.7, duration: 0.8, ease: EASE }}
          >
            {SITE.roles.join("  ·  ")}
          </motion.p>
          <motion.p
            className="mt-5 max-w-xl text-balance text-sm leading-relaxed text-white/70 sm:text-base"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 3.1, duration: 0.9, ease: EASE }}
          >
            {SITE.intro}
          </motion.p>
        </motion.div>

        {/* scroll cue */}
        <motion.div
          className="pointer-events-none absolute bottom-16 left-1/2 z-10 -translate-x-1/2 text-center sm:bottom-20"
          style={{ opacity: cueOpacity }}
        >
          <motion.div
            className="flex flex-col items-center gap-2 font-mono text-[10px] uppercase tracking-[0.35em] text-white/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 3.8, duration: 0.8 }}
          >
            Scroll to pick a camera
            <motion.span animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.6 }}>
              <ArrowDown className="size-4" />
            </motion.span>
          </motion.div>
        </motion.div>

        {/* chooser headline */}
        <motion.div
          className="pointer-events-none absolute inset-x-0 top-[9%] z-10 px-6 text-center sm:top-[11%]"
          style={{ opacity: pickOpacity, y: pickY }}
        >
          <AnimatePresence>
            {phase === "idle" ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Badge variant="outline" className="rounded-none border-white/30 font-mono text-[10px] uppercase tracking-[0.3em] text-white/70">
                  Two bodies · one eye
                </Badge>
                <h2 className="font-display mt-3 text-[clamp(2.2rem,6vw,4.6rem)] leading-none text-white">
                  Pick a camera, <span className="text-outline">see what it saw.</span>
                </h2>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      </div>

      <Iris />

      <AnimatePresence>{phase === "gallery" && selected ? <Gallery key={selected} id={selected} onBack={back} /> : null}</AnimatePresence>
    </section>
  )
}
