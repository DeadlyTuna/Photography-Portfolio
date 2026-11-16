"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Lightbox } from "@/components/lightbox"
import { InteractiveGlobeExplorer, type GlobeLocation } from "@/components/ui/interactive-globe-explorer"
import { PLACES } from "@/lib/places"

const EASE = [0.7, 0, 0.1, 1] as const
const PHOTOS = PLACES.map((p) => p.photo)

/** "08.81°S 115.17°E" → { lat: -8.81, lng: 115.17 } */
function parseCoords(s: string) {
  const m = s.match(/([\d.]+)°([NS])\s+([\d.]+)°([EW])/)
  if (!m) return { lat: 0, lng: 0 }
  return {
    lat: Number(m[1]) * (m[2] === "S" ? -1 : 1),
    lng: Number(m[3]) * (m[4] === "W" ? -1 : 1),
  }
}

const LOCATIONS: GlobeLocation[] = PLACES.map((p, i) => ({
  id: String(i),
  name: p.name,
  subtitle: p.region,
  ...parseCoords(p.coords),
  image: { src: p.photo.thumb, alt: p.photo.title },
  details: [
    { label: "Frame", value: p.photo.title },
    { label: "Coordinates", value: p.coords, copy: true },
    { label: "Elevation", value: p.elevation },
    { label: "Shot on", value: p.year === "—" ? p.body : `${p.body} · ${p.year}` },
  ],
}))

export function Places() {
  const [lb, setLb] = React.useState<number | null>(null)

  return (
    <section id="places" className="relative overflow-hidden border-t border-hair py-24 md:py-32">
      <div className="relative mx-auto max-w-[1600px] px-4 sm:px-8">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div>
            <p className="label text-paper/50">
              <span className="text-signal">02</span> — Places
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
            {PLACES.length} pins on the map. Scroll the list to fly the globe there, click a place for the frame, the
            coordinates and the body that was in my hands, or click a pin on the globe.
          </p>
        </div>

        <motion.div
          className="mt-14"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 0.9, ease: EASE }}
        >
          <InteractiveGlobeExplorer
            locations={LOCATIONS}
            onOpenImage={(loc) => setLb(Number(loc.id))}
            className="h-[78svh] min-h-[520px] max-h-[760px]"
          />
        </motion.div>
      </div>

      <Lightbox photos={PHOTOS} index={lb} onIndex={setLb} label="Places" />
    </section>
  )
}
