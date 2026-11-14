"use client"

import * as React from "react"
import { animate, motion, useInView, useReducedMotion, useScroll, useTransform } from "framer-motion"
import { CAMERAS, ME_PHOTO, OTHER_PHOTOS } from "@/lib/photos"
import { PLACES } from "@/lib/places"
import { SITE } from "@/lib/site"

const EASE = [0.7, 0, 0.1, 1] as const

function CountUp({ to, suffix }: { to: number; suffix?: string }) {
  const ref = React.useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: "-10% 0px" })
  const reduce = useReducedMotion()
  React.useEffect(() => {
    const el = ref.current
    if (!el || !inView) return
    if (reduce) {
      el.textContent = String(to)
      return
    }
    const c = animate(0, to, { duration: 1.8, ease: [0.2, 0.7, 0.2, 1], onUpdate: (v) => (el.textContent = String(Math.round(v))) })
    return () => c.stop()
  }, [inView, to, reduce])
  return (
    <span className="font-display text-[clamp(4.5rem,10vw,9rem)] leading-none text-paper">
      <span ref={ref}>0</span>
      {suffix ? <span className="text-signal">{suffix}</span> : null}
    </span>
  )
}

const GEAR = [
  ["Sony α7R III", "42.4MP full-frame mirrorless", "Main body"],
  ["FE 24–70mm f/2.8 GM", "Lives on the Sony", "Glass"],
  ["Nikon D3100", "14.2MP DX DSLR", "First body · 2011"],
  ["AF-S DX 18–55mm", "The kit lens that started it", "Glass"],
  ["Phone", "For everything in between", "Pocket"],
]

export function About() {
  const frame = React.useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: frame, offset: ["start end", "end start"] })
  const y = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"])
  const years = SITE.year - SITE.since
  const frames = CAMERAS.sony.photos.length + CAMERAS.nikon.photos.length + OTHER_PHOTOS.length

  return (
    <section id="about" className="relative border-t border-hair py-24 md:py-36">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-8">
        <p className="label text-paper/50">
          <span className="text-signal">04</span> — About
        </p>
        <h2 className="font-display mt-6 text-[clamp(3.2rem,9.5vw,10rem)] text-paper">
          {["I don't take pictures.", "I wait for them."].map((line, i) => (
            <span key={line} className="block overflow-hidden">
              <motion.span
                className={"block " + (i === 1 ? "text-signal" : "")}
                initial={{ y: "110%" }}
                whileInView={{ y: "0%" }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: i * 0.12, ease: EASE }}
              >
                {line}
              </motion.span>
            </span>
          ))}
        </h2>

        <div className="mt-16 grid gap-12 md:grid-cols-12 md:gap-10">
          {/* portrait */}
          <motion.figure
            className="relative md:col-span-5"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{ duration: 1, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <div ref={frame} className="relative aspect-[4/5] overflow-hidden border border-hair bg-black">
              <motion.img
                src={ME_PHOTO.src}
                alt="Harsh photographing a misty valley at sunrise"
                loading="lazy"
                style={{ y, scale: 1.18 }}
                className="h-full w-full object-cover grayscale-[30%]"
              />
            </div>
            {(["-left-2 -top-2 border-l border-t", "-right-2 -top-2 border-r border-t", "-left-2 -bottom-2 border-l border-b", "-right-2 -bottom-2 border-r border-b"] as const).map((k) => (
              <span key={k} className={"absolute size-5 border-signal " + k} aria-hidden />
            ))}
            <figcaption className="label mt-4 flex justify-between text-paper/45">
              <span>Fig. 01 — The guy behind the lens</span>
              <span className="text-paper/30">Sunrise, ▲ somewhere high</span>
            </figcaption>
          </motion.figure>

          {/* bio + gear */}
          <div className="md:col-span-6 md:col-start-7">
            <div className="space-y-5 text-base leading-relaxed text-paper/70 md:text-lg">
              <p>
                I picked up a Nikon D3100 in {SITE.since} and never really put a camera down again. Today most of my
                work comes off a Sony α7R III with an FE 24–70mm f/2.8 GM: mountains at first light, coastlines in
                bad weather, concerts where the only light is one spotlight.
              </p>
              <p className="text-paper/55">
                I care more about patience than gear: waiting for the fog to lift, for the swell to hit the rocks,
                for someone to step into the frame. Everything here is something I stood in front of.
              </p>
            </div>

            <div className="mt-12">
              <p className="label mb-3 text-paper/40">Kit list</p>
              <ul className="border-t border-hair">
                {GEAR.map(([name, spec, tag], i) => (
                  <motion.li
                    key={name}
                    className="grid grid-cols-[1fr_auto] items-baseline gap-4 border-b border-hair py-4 sm:grid-cols-[1.2fr_1fr_auto]"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: i * 0.06 }}
                  >
                    <span className="font-display text-2xl text-paper sm:text-3xl">{name}</span>
                    <span className="hidden text-sm text-paper/55 sm:block">{spec}</span>
                    <span className="label text-signal">{tag}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* stats band */}
        <div className="mt-24 grid grid-cols-2 border-y border-hair md:grid-cols-4">
          {[
            { n: years, s: "yrs", l: "Behind the viewfinder" },
            { n: frames, s: "+", l: "Frames on this site" },
            { n: 2, s: "", l: "Bodies, one eye" },
            { n: PLACES.length, s: "", l: "Places pinned" },
          ].map((st, i) => (
            <div key={st.l} className={"px-2 py-10 sm:px-6 " + (i % 2 ? "border-l border-hair " : "") + (i === 2 ? "md:border-l " : "") + (i > 1 ? "border-t border-hair md:border-t-0" : "")}>
              <CountUp to={st.n} suffix={st.s} />
              <p className="label mt-4 text-paper/45">{st.l}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
