"use client"

import * as React from "react"
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion"
import { ArrowDownRight } from "lucide-react"
import { Shutter, Flash } from "@/components/shutter"
import { CAMERAS, OTHER_PHOTOS, type Photo } from "@/lib/photos"
import { SITE } from "@/lib/site"

const all = [...CAMERAS.sony.photos, ...CAMERAS.nikon.photos, ...OTHER_PHOTOS]
const pick = (slug: string) => all.find((p) => p.slug === slug) as Photo
/** Wide landscapes that read well full-bleed behind the name. */
const REEL: { photo: Photo; body: string }[] = [
  { photo: pick("dsc01677"), body: "Sony α7R III" },
  { photo: pick("20220523-185158"), body: "Galaxy S21 Ultra" },
  { photo: pick("dsc05033"), body: "Sony α7R III" },
  { photo: pick("wa-19-40-43-1"), body: "Nikon D3100" },
  { photo: pick("dsc00855"), body: "Sony α7R III" },
  { photo: pick("img-3018"), body: "iPhone 6s" },
]
const SLIDE_MS = 5200

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

export function Hero() {
  const ref = React.useRef<HTMLElement>(null)
  const [open, setOpen] = React.useState(false)
  const [flash, setFlash] = React.useState(0)
  const [i, setI] = React.useState(0)
  const [paused, setPaused] = React.useState(false)

  // Intro: wait for the first frame to decode (max 1.8s), then fire the shutter.
  React.useEffect(() => {
    let done = false
    const go = () => {
      if (done) return
      done = true
      setFlash(1)
      setOpen(true)
    }
    const img = new Image()
    img.src = REEL[0].photo.src
    const min = new Promise((r) => setTimeout(r, 700))
    Promise.all([img.decode().catch(() => {}), min]).then(go)
    const cap = window.setTimeout(go, 1800)
    // Warm the rest of the reel quietly.
    REEL.slice(1).forEach((s) => {
      const im = new Image()
      im.src = s.photo.src
    })
    return () => window.clearTimeout(cap)
  }, [])

  // Advance the slideshow (pauses while hovered or scrolled away).
  const inView = React.useRef(true)
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => (inView.current = e.isIntersecting))
    io.observe(el)
    return () => io.disconnect()
  }, [])
  React.useEffect(() => {
    if (!open || paused) return
    const id = window.setInterval(() => {
      if (inView.current && !document.hidden) setI((v) => (v + 1) % REEL.length)
    }, SLIDE_MS)
    return () => window.clearInterval(id)
  }, [open, paused])

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] })
  const imgY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"])
  const nameY = useTransform(scrollYProgress, [0, 1], ["0%", "45%"])
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0])
  // Scroll-linked styles only after mount: the first scroll reading in the browser can differ
  // from the server's (always top-of-page), which caused a hydration mismatch.
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  const fadeStyle = mounted ? { opacity: fade } : undefined

  const s = REEL[i]

  return (
    <section ref={ref} id="top" className="relative h-svh min-h-[560px] overflow-hidden bg-ink">
      {/* full-bleed reel */}
      <motion.div className="absolute inset-0" style={mounted ? { y: imgY } : undefined}>
        <AnimatePresence initial={false}>
          <motion.img
            key={s.photo.src}
            src={s.photo.src}
            alt={s.photo.title}
            className="absolute inset-0 h-full w-full object-cover"
            initial={{ opacity: 0, scale: 1.12 }}
            animate={{ opacity: 1, scale: 1.02 }}
            exit={{ opacity: 0 }}
            transition={{ opacity: { duration: 1.4, ease: "easeInOut" }, scale: { duration: SLIDE_MS / 1000 + 1.4, ease: "linear" } }}
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-ink/45" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,6,7,.75)_0%,transparent_28%,transparent_45%,rgba(6,6,7,.92)_100%)]" />
      </motion.div>

      {/* viewfinder corners */}
      <div className="pointer-events-none absolute inset-x-4 bottom-4 top-20 sm:inset-x-8">
        {(["left-0 top-0 border-l border-t", "right-0 top-0 border-r border-t", "left-0 bottom-0 border-l border-b", "right-0 bottom-0 border-r border-b"] as const).map((k) => (
          <span key={k} className={"absolute size-5 border-paper/30 " + k} />
        ))}
      </div>

      {/* top meta */}
      <motion.div className="absolute inset-x-0 top-[84px] z-10 flex justify-between gap-6 px-6 sm:px-12" style={fadeStyle}>
        <motion.p
          className="hidden max-w-xs text-sm leading-relaxed text-paper/75 sm:block"
          initial={{ opacity: 0, y: 10 }}
          animate={open ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 1.1, duration: 0.9 }}
        >
          {SITE.intro}
        </motion.p>
        <motion.div
          className="label ml-auto text-right text-paper/55"
          initial={{ opacity: 0 }}
          animate={open ? { opacity: 1 } : {}}
          transition={{ delay: 1.3, duration: 0.9 }}
        >
          <p>{SITE.roles.join(" / ")}</p>
          <p className="mt-2">
            Est. {SITE.since} — <span className="text-signal">{SITE.year - SITE.since} yrs</span>
          </p>
        </motion.div>
      </motion.div>

      {/* now showing */}
      <motion.div
        className="absolute right-6 top-1/2 z-10 hidden w-60 -translate-y-1/2 sm:right-12 md:block"
        style={fadeStyle}
        initial={{ opacity: 0 }}
        animate={open ? { opacity: 1 } : {}}
        transition={{ delay: 1.6 }}
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={() => setPaused(false)}
      >
        <p className="label text-paper/45">
          Now showing <span className="text-signal">{String(i + 1).padStart(2, "0")}</span>/{String(REEL.length).padStart(2, "0")}
        </p>
        <AnimatePresence mode="wait">
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4 }}>
            <p className="font-display mt-2 text-2xl text-paper">{s.photo.title}</p>
            <p className="label mt-1 text-paper/45">{s.body}</p>
            <p className="label mt-1 text-paper/35">{s.photo.exif ?? "—"}</p>
          </motion.div>
        </AnimatePresence>
        <div className="mt-4 flex gap-1.5">
          {REEL.map((_, k) => (
            <button
              key={k}
              type="button"
              aria-label={`Show frame ${k + 1}`}
              onClick={() => setI(k)}
              className="relative h-6 flex-1 cursor-pointer focus-visible:outline-none"
            >
              <span className="absolute inset-x-0 top-1/2 h-px bg-paper/20" />
              {k === i ? (
                <motion.span
                  key={`${i}-${paused}`}
                  className="absolute inset-x-0 top-1/2 h-px origin-left bg-signal"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: paused ? 0.5 : 1 }}
                  transition={{ duration: paused ? 0.3 : SLIDE_MS / 1000, ease: "linear" }}
                />
              ) : k < i ? (
                <span className="absolute inset-x-0 top-1/2 h-px bg-paper/60" />
              ) : null}
            </button>
          ))}
        </div>
      </motion.div>

      {/* the giant name */}
      <motion.div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-3 pb-6 sm:px-6" style={mounted ? { y: nameY, opacity: fade } : undefined}>
        <div className="label mb-2 flex items-end justify-between px-3 text-paper/55 sm:px-6">
          <motion.span initial={{ opacity: 0 }} animate={open ? { opacity: 1 } : {}} transition={{ delay: 1 }}>
            Field notes — {SITE.since}/{SITE.year}
          </motion.span>
          <motion.span className="flex items-center gap-2" initial={{ opacity: 0 }} animate={open ? { opacity: 1 } : {}} transition={{ delay: 1.8 }}>
            Scroll <ArrowDownRight className="size-3.5 text-signal" />
          </motion.span>
        </div>
        <h1 className="font-display text-paper">
          <Rise text={SITE.first} show={open} delay={0.1} className="text-[clamp(3.4rem,min(15.2vw,27svh),17rem)] leading-[0.8]" />
        </h1>
        <div className="mt-1 flex items-start justify-between">
          <Rise text={SITE.last} show={open} delay={0.45} className="font-display text-stroke text-[clamp(1.8rem,min(6vw,11svh),6.5rem)] leading-[0.85]" />
          <motion.p
            className="label hidden max-w-[16rem] text-right text-paper/45 md:block"
            initial={{ opacity: 0 }}
            animate={open ? { opacity: 1 } : {}}
            transition={{ delay: 1.6 }}
          >
            Scroll down to the selected works.
          </motion.p>
        </div>
      </motion.div>

      <Shutter open={open} />
      <Flash fire={flash} />
    </section>
  )
}
