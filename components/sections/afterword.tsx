"use client"

import * as React from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { ArrowUp, Mail, Aperture } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Lightbox } from "@/components/lightbox"
import { CAMERAS, ME_PHOTO, OTHER_PHOTOS } from "@/lib/photos"
import { SITE } from "@/lib/site"

const EASE = [0.2, 0.7, 0.2, 1] as const

function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 40, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.9, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

// ------------------------------------------------------------------ about

function About() {
  const ref = React.useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] })
  const y = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"])

  const stats = [
    { k: String(SITE.since), v: "first shutter click, on a D3100" },
    { k: String(CAMERAS.sony.photos.length + CAMERAS.nikon.photos.length), v: "frames across the two journals" },
    { k: "24–70", v: "the lens that never leaves the Sony" },
    { k: "∞", v: "sunsets I still want to catch" },
  ]

  return (
    <section id="about" className="relative mx-auto grid max-w-6xl gap-12 px-6 py-28 md:grid-cols-[1.05fr_1fr] md:items-center md:py-40">
      <div ref={ref} className="relative mx-auto w-full max-w-md">
        <div className="relative">
          <div className="relative overflow-hidden border border-white/30 bg-black">
            <div className="aspect-[4/5] overflow-hidden">
              <motion.img
                src={ME_PHOTO.src}
                alt="Harsh photographing a misty valley at sunrise"
                style={{ y, scale: 1.18 }}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="flex justify-between border-t border-white/30 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/60">
              <span>Fig. 01 — The guy behind the lens</span>
              <span className="text-[#f0782d]">Self</span>
            </div>
          </div>
          <span className="absolute -left-3 -top-3 size-6 border-l-2 border-t-2 border-[#f0782d]" />
          <span className="absolute -bottom-3 -right-3 size-6 border-b-2 border-r-2 border-[#f0782d]" />
        </div>
      </div>

      <div>
        <Reveal>
          <Badge variant="outline" className="rounded-none border-white/30 font-mono text-[10px] uppercase tracking-[0.3em] text-white/60">
            Behind the lens
          </Badge>
        </Reveal>
        <Reveal delay={0.08}>
          <h2 className="font-display mt-5 text-[clamp(2.6rem,6vw,4.8rem)] leading-[0.95] text-white">
            I don&apos;t take pictures. <span className="text-outline">I wait for them.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="mt-6 max-w-lg leading-relaxed text-white/65">
            Most of these frames came from long waits: for the fog to lift off a temple, for the swell to hit the
            cliffs at the right second, for a singer to step into the only spotlight on stage. The D3100 taught me
            to see. The α7R III lets me keep every detail of what I saw.
          </p>
        </Reveal>
        <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8">
          {stats.map((s, i) => (
            <Reveal key={s.v} delay={0.2 + i * 0.07}>
              <p className="font-display text-5xl text-white">{s.k}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">{s.v}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

// ------------------------------------------------------------------ film strip marquee

function FilmRow({ items, reverse, onOpen }: { items: typeof OTHER_PHOTOS; reverse?: boolean; onOpen: (src: string) => void }) {
  const doubled = [...items, ...items]
  return (
    <div className="group relative overflow-hidden border-y border-white/10 bg-[#0d0c0b] py-6">
      {/* sprocket holes */}
      <div className="pointer-events-none absolute inset-x-0 top-1.5 h-3 bg-[repeating-linear-gradient(90deg,transparent_0_14px,rgba(255,255,255,.12)_14px_26px)] [mask:linear-gradient(#000,#000)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-1.5 h-3 bg-[repeating-linear-gradient(90deg,transparent_0_14px,rgba(255,255,255,.12)_14px_26px)]" />
      <div className={"flex w-max gap-4 px-2 group-hover:[animation-play-state:paused] " + (reverse ? "animate-marquee-rev" : "animate-marquee")}>
        {doubled.map((p, i) => (
          <button
            key={p.slug + i}
            type="button"
            onClick={() => onOpen(p.src)}
            aria-label={`Open ${p.title}`}
            className="relative h-44 shrink-0 cursor-zoom-in overflow-hidden grayscale transition duration-500 hover:grayscale-0 sm:h-56"
            style={{ aspectRatio: `${p.w} / ${p.h}` }}
          >
            <img src={p.thumb} alt={p.title} loading="lazy" className="h-full w-full object-cover transition duration-700 hover:scale-105" />
          </button>
        ))}
      </div>
    </div>
  )
}

function OffDuty() {
  const [lb, setLb] = React.useState<number | null>(null)
  const half = Math.ceil(OTHER_PHOTOS.length / 2)
  const open = (src: string) => setLb(OTHER_PHOTOS.findIndex((p) => p.src === src))
  return (
    <section id="off-duty" className="relative py-24">
      <div className="mx-auto mb-12 max-w-6xl px-6">
        <Reveal>
          <Badge variant="outline" className="rounded-none border-white/30 font-mono text-[10px] uppercase tracking-[0.3em] text-white/60">
            Off duty
          </Badge>
        </Reveal>
        <Reveal delay={0.08}>
          <h2 className="font-display mt-5 max-w-3xl text-[clamp(2.4rem,5.5vw,4.4rem)] leading-[0.95] text-white">
            The best camera is the one <span className="text-outline">in your pocket.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.14}>
          <p className="mt-4 max-w-lg text-white/60">
            Phones, borrowed bodies, a window seat. Frames that didn&apos;t come from either camera but still made the cut.
            Hover to pause, tap to open.
          </p>
        </Reveal>
      </div>
      <div className="space-y-px">
        <FilmRow items={OTHER_PHOTOS.slice(0, half)} onOpen={open} />
        <FilmRow items={OTHER_PHOTOS.slice(half)} reverse onOpen={open} />
      </div>
      <Lightbox photos={OTHER_PHOTOS} index={lb} onIndex={setLb} label="Off duty" accent="#9fb4ff" />
    </section>
  )
}

// ------------------------------------------------------------------ footer

function Outro() {
  const words = ["Keep", "chasing", "light."]
  return (
    <footer id="contact" className="relative overflow-hidden border-t border-white/10 px-6 pb-10 pt-28">
      <div className="pointer-events-none absolute left-1/2 top-0 size-[60vmax] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f0782d]/10 blur-[120px]" />
      <div className="relative mx-auto max-w-6xl">
        <h2 className="font-display text-[clamp(3.4rem,13vw,11rem)] leading-[0.85] text-white">
          {words.map((w, i) => (
            <span key={w} className="inline-block overflow-hidden pr-[0.2em] align-bottom">
              <motion.span
                className={"inline-block " + (i === 1 ? "text-outline" : "")}
                initial={{ y: "100%" }}
                whileInView={{ y: "0%" }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: i * 0.12, ease: EASE }}
              >
                {w}
              </motion.span>
            </span>
          ))}
        </h2>

        <div className="mt-14 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <Reveal className="max-w-md">
            <p className="text-white/65">
              Want a shoot, a print, or just to talk lenses? My inbox is always open.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-none bg-[#f4f2ee] font-mono font-bold uppercase tracking-[0.15em] text-black hover:bg-[#f0782d]">
                <a href={`mailto:${SITE.email}`}>
                  <Mail /> Say hello
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-none border-white/30 bg-transparent font-mono font-bold uppercase tracking-[0.15em] text-white hover:bg-white hover:text-black"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              >
                <ArrowUp /> Back to the cameras
              </Button>
            </div>
          </Reveal>
          <Reveal delay={0.1} className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40 md:text-right">
            <p className="flex items-center gap-2 md:justify-end">
              <Aperture className="size-3.5" /> {SITE.first} {SITE.last} · {SITE.since}–{SITE.year}
            </p>
            <p className="mt-2">Built with Next.js, shadcn/ui, Three.js &amp; Framer Motion</p>
            <p className="mt-1">Journal spreads adapted from a 21st.dev component</p>
          </Reveal>
        </div>
      </div>
    </footer>
  )
}

export function Afterword() {
  return (
    <>
      <About />
      <OffDuty />
      <Outro />
    </>
  )
}
