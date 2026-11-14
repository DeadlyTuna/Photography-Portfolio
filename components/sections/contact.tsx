"use client"

import * as React from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { ArrowUp, ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TopoField } from "@/components/ui/topo-field"
import { scrollToTarget } from "@/components/smooth-scroll"
import { SITE } from "@/lib/site"

const PHRASE = "Let's shoot — "

function Marquee({ outline, reverse }: { outline?: boolean; reverse?: boolean }) {
  const text = Array.from({ length: 6 }, () => PHRASE).join("")
  return (
    <div className="overflow-hidden whitespace-nowrap" aria-hidden>
      <div className={"flex w-max " + (reverse ? "animate-marquee-rev" : "animate-marquee")}>
        {[0, 1].map((k) => (
          <span key={k} className={"font-display pr-[0.3em] text-[clamp(5rem,16vw,15rem)] " + (outline ? "text-stroke" : "text-paper")}>
            {text}
          </span>
        ))}
      </div>
    </div>
  )
}

export function Contact() {
  const ref = React.useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] })
  const lift = useTransform(scrollYProgress, [0, 1], ["12%", "0%"])

  return (
    <footer ref={ref} id="contact" className="relative overflow-hidden border-t border-hair pt-24">
      <TopoField opacity={0.14} highlight={9} seed={99} />

      <motion.div className="relative" style={{ y: lift }}>
        <div className="mx-auto max-w-[1600px] px-4 sm:px-8">
          <p className="label text-paper/50">
            <span className="text-signal">06</span> — Contact
          </p>
        </div>

        <div className="mt-10 space-y-[-0.1em]">
          <Marquee />
          <Marquee outline reverse />
        </div>

        <div className="mx-auto mt-16 grid max-w-[1600px] gap-12 px-4 sm:px-8 md:grid-cols-12">
          <div className="md:col-span-7">
            <p className="label text-paper/45">Write to</p>
            <a
              href={`mailto:${SITE.email}`}
              data-cursor="Mail"
              className="font-display group relative mt-3 inline-block break-all text-[clamp(1.8rem,4.4vw,4.6rem)] text-paper transition hover:text-signal focus-visible:text-signal focus-visible:outline-none"
            >
              {SITE.email}
              <span className="absolute -bottom-1 left-0 h-[3px] w-full origin-left scale-x-0 bg-signal transition-transform duration-500 group-hover:scale-x-100" />
            </a>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button asChild size="lg" className="label h-12 rounded-none bg-signal px-7 text-ink hover:bg-paper">
                <a href={`mailto:${SITE.email}`}>
                  Email me <ArrowUpRight />
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => scrollToTarget(0)}
                className="label h-12 rounded-none border-hair bg-transparent px-7 text-paper hover:border-paper hover:bg-paper hover:text-ink"
              >
                <ArrowUp /> Rewind to the cameras
              </Button>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-8 self-end md:col-span-5">
            {[
              ["Based", "India"],
              ["Available for", "Portraits · events · travel · prints"],
              ["Bodies", "Sony α7R III · Nikon D3100"],
              ["Shooting since", String(SITE.since)],
            ].map(([k, v]) => (
              <div key={k} className="border-t border-hair pt-3">
                <dt className="label text-paper/40">{k}</dt>
                <dd className="mt-2 text-sm text-paper/80">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mx-auto mt-24 flex max-w-[1600px] flex-col gap-3 border-t border-hair px-4 py-6 sm:px-8 md:flex-row md:items-center md:justify-between">
          <p className="label text-paper/60">
            © {SITE.year} {SITE.first} {SITE.last}
          </p>
          <p className="label text-paper/35">
            3D models: “SONY A7R3 camera” by Metazeon (CC BY 4.0) · “Nikon D3100” by TRIANGLESCAN — via Sketchfab
          </p>
          <p className="label text-paper/35">Next.js · shadcn/ui · Framer Motion · Lenis</p>
        </div>
      </motion.div>
    </footer>
  )
}
