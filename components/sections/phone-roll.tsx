"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Lightbox } from "@/components/lightbox"
import { OTHER_PHOTOS, type Photo } from "@/lib/photos"

const EASE = [0.7, 0, 0.1, 1] as const

function Row({ items, reverse, onOpen }: { items: Photo[]; reverse?: boolean; onOpen: (p: Photo) => void }) {
  const doubled = [...items, ...items]
  return (
    <div className="group/row overflow-hidden">
      <div className={"flex w-max gap-4 pr-4 group-hover/row:[animation-play-state:paused] " + (reverse ? "animate-marquee-rev" : "animate-marquee")}>
        {doubled.map((p, i) => (
          <button
            key={p.slug + i}
            type="button"
            onClick={() => onOpen(p)}
            data-cursor="Open"
            aria-label={`Open ${p.title}`}
            aria-hidden={i >= items.length || undefined}
            tabIndex={i >= items.length ? -1 : 0}
            className="group shrink-0 text-left focus-visible:outline-none"
          >
            <span
              className="block h-[28svh] overflow-hidden border border-hair bg-black transition group-focus-visible:border-signal md:h-[40svh]"
              style={{ aspectRatio: `${p.w} / ${p.h}` }}
            >
              <img
                src={p.thumb}
                alt={p.title}
                loading="lazy"
                draggable={false}
                className="h-full w-full object-cover grayscale transition duration-700 group-hover:scale-[1.04] group-hover:grayscale-0"
              />
            </span>
            <span className="label mt-2 flex justify-between gap-4 text-paper/40">
              <span className="text-paper/70">{p.title}</span>
              <span className="hidden sm:inline">{p.exif}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function PhoneRoll() {
  const [lb, setLb] = React.useState<number | null>(null)
  const half = Math.ceil(OTHER_PHOTOS.length / 2)
  const open = (p: Photo) => setLb(OTHER_PHOTOS.findIndex((x) => x.slug === p.slug))

  return (
    <section id="phone-roll" className="relative border-t border-hair py-24 md:py-32">
      <div className="mx-auto mb-14 flex max-w-[1600px] flex-col justify-between gap-6 px-4 sm:px-8 md:flex-row md:items-end">
        <div>
          <p className="label text-paper/50">
            <span className="text-signal">05</span> — Phone roll
          </p>
          <h2 className="font-display mt-6 text-[clamp(3.6rem,10vw,10rem)] text-paper">
            {["Off the", "clock"].map((w, i) => (
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
          Phones, borrowed bodies, a window seat. {OTHER_PHOTOS.length} frames that came from neither camera but
          still made the cut. Hover to stop the roll, tap to open.
        </p>
      </div>
      <div className="space-y-8">
        <Row items={OTHER_PHOTOS.slice(0, half)} onOpen={open} />
        <Row items={OTHER_PHOTOS.slice(half)} reverse onOpen={open} />
      </div>
      <Lightbox photos={OTHER_PHOTOS} index={lb} onIndex={setLb} label="Phone roll" />
    </section>
  )
}
