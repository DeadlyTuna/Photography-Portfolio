"use client"

import * as React from "react"
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform, useVelocity } from "framer-motion"
import { ArrowUpRight } from "lucide-react"
import { Lightbox } from "@/components/lightbox"
import { TopoField } from "@/components/ui/topo-field"
import { PLACES } from "@/lib/places"
import { cn } from "@/lib/utils"

const EASE = [0.7, 0, 0.1, 1] as const
const PHOTOS = PLACES.map((p) => p.photo)

export function Places() {
  const [active, setActive] = React.useState<number | null>(null)
  const [lb, setLb] = React.useState<number | null>(null)
  const [fine, setFine] = React.useState(false)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 260, damping: 28, mass: 0.5 })
  const sy = useSpring(y, { stiffness: 260, damping: 28, mass: 0.5 })
  // tilt with horizontal velocity
  const vx = useVelocity(sx)
  const rot = useTransform(vx, [-1600, 1600], [-9, 9], { clamp: true })

  React.useEffect(() => setFine(window.matchMedia("(pointer: fine)").matches), [])

  const onMove = (e: React.PointerEvent) => {
    x.set(e.clientX)
    y.set(e.clientY)
  }

  return (
    <section id="places" className="relative overflow-hidden border-t border-hair py-24 md:py-36" onPointerMove={onMove}>
      <TopoField opacity={0.07} annotations={false} seed={42} highlight={-1} />

      <div className="relative mx-auto max-w-[1600px] px-4 sm:px-8">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div>
            <p className="label text-paper/50">
              <span className="text-signal">03</span> — Places
            </p>
            <h2 className="font-display mt-6 text-[clamp(3.6rem,10vw,10rem)] text-paper">
              {["Where the", "light was"].map((w, i) => (
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
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-paper/60">
            Five pins on the map, with the coordinates and the body that was in my hands. Hover a place to see
            the frame; click to open it.
          </p>
        </div>

        <ul className="mt-16 border-t border-hair" onPointerLeave={() => setActive(null)}>
          {PLACES.map((p, i) => (
            <motion.li
              key={p.name}
              className="border-b border-hair"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-8% 0px" }}
              transition={{ duration: 0.8, delay: i * 0.06, ease: EASE }}
            >
              <button
                type="button"
                onClick={() => setLb(i)}
                onPointerEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                data-cursor="View"
                className={cn(
                  "group grid w-full grid-cols-[2.5rem_1fr_auto] items-center gap-4 py-5 text-left transition-opacity duration-500 focus-visible:outline-none md:grid-cols-[4rem_1fr_14rem_10rem_8rem_2rem] md:py-7",
                  active !== null && active !== i ? "opacity-30" : "opacity-100",
                )}
              >
                <span className="label text-signal">{String(i + 1).padStart(2, "0")}</span>
                <span className="min-w-0">
                  <span className="font-display block truncate text-[clamp(2.4rem,6.4vw,6.4rem)] text-paper transition-all duration-500 group-hover:translate-x-4 group-hover:text-signal group-focus-visible:translate-x-4 group-focus-visible:text-signal">
                    {p.name}
                  </span>
                  <span className="label mt-1 block text-paper/45 md:hidden">
                    {p.coords} · {p.year}
                  </span>
                </span>
                <span className="label hidden text-paper/55 md:block">
                  {p.region}
                  <br />
                  <span className="text-paper/35">{p.coords}</span>
                </span>
                <span className="label hidden text-paper/55 md:block">
                  ▲ {p.elevation}
                  <br />
                  <span className="text-paper/35">{p.body}</span>
                </span>
                <span className="label hidden text-paper/55 md:block">{p.year}</span>
                {/* touch: small inline thumb; fine pointers: arrow */}
                <span className="flex justify-end">
                  {fine ? (
                    <ArrowUpRight className="size-5 text-paper/40 transition group-hover:rotate-45 group-hover:text-signal" />
                  ) : (
                    <img src={p.photo.thumb} alt="" className="h-14 w-20 object-cover" loading="lazy" />
                  )}
                </span>
              </button>
            </motion.li>
          ))}
        </ul>
      </div>

      {/* floating preview that follows the cursor */}
      {fine ? (
        <motion.div
          aria-hidden
          className="pointer-events-none fixed left-0 top-0 z-[55]"
          style={{ x: sx, y: sy, rotate: rot, translateX: "-50%", translateY: "-50%" }}
        >
          <AnimatePresence mode="popLayout">
            {active !== null ? (
              <motion.div
                key={active}
                className="relative w-[22vw] max-w-[360px] overflow-hidden border border-hair bg-black"
                style={{ aspectRatio: String(PLACES[active].photo.w / PLACES[active].photo.h) }}
                initial={{ opacity: 0, scale: 0.85, clipPath: "inset(50% 0 50% 0)" }}
                animate={{ opacity: 1, scale: 1, clipPath: "inset(0% 0 0% 0)" }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.45, ease: [0.2, 0.7, 0.2, 1] }}
              >
                <img src={PLACES[active].photo.thumb} alt="" className="h-full w-full object-cover" />
                <span className="label absolute bottom-0 left-0 bg-ink px-2 py-1 text-[9px] text-signal">
                  {PLACES[active].coords}
                </span>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      ) : null}

      <Lightbox photos={PHOTOS} index={lb} onIndex={setLb} label="Places" />
    </section>
  )
}
