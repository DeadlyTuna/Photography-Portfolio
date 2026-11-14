"use client"

/**
 * Circular Gallery (21st.dev), adapted for the portfolio:
 *  - the page is scroll-locked while you're "inside" a camera, so rotation comes from the
 *    wheel, drag/swipe and arrow keys on the gallery itself (plus slow auto-rotate)
 *  - rotation runs in a rAF loop writing transforms directly (no React re-render per frame)
 *  - the ring is pushed back by its radius so the front card sits at true size, and card
 *    size / radius follow the viewport
 *  - clicking the front cards calls `onItemClick(index)` (used for the fullscreen viewer)
 *  - film-still styling: gradients, frame numbers, serif titles
 */

import React, { useEffect, useRef, useState, type HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

export interface GalleryItem {
  common: string
  binomial: string
  photo: {
    url: string
    text: string
    pos?: string
    by: string
  }
}

interface CircularGalleryProps extends HTMLAttributes<HTMLDivElement> {
  items: GalleryItem[]
  /** Distance of the cards from the centre. Defaults to just enough to fit every card. */
  radius?: number
  /** Degrees per frame of auto-rotation while idle. */
  autoRotateSpeed?: number
  accent?: string
  onItemClick?: (index: number) => void
  /** Fires when a different card comes to the front. */
  onFrontChange?: (index: number) => void
  /** Imperative nudges from outside (prev/next buttons): bump `step.n` to move by `step.d` cards. */
  step?: { n: number; d: number }
}

const wrap = (a: number) => ((a % 360) + 360) % 360

const CircularGallery = React.forwardRef<HTMLDivElement, CircularGalleryProps>(
  ({ items, className, radius, autoRotateSpeed = 0.06, accent = "#fff", onItemClick, onFrontChange, step, ...props }, ref) => {
    const ringRef = useRef<HTMLDivElement>(null)
    const cardRefs = useRef<(HTMLDivElement | null)[]>([])
    const rot = useRef(0)
    const target = useRef(0)
    const lastTouch = useRef(-1e9)
    const drag = useRef<null | { x: number; start: number; moved: boolean; id: number }>(null)
    const front = useRef(-1)
    const [size, setSize] = useState({ w: 280, h: 373, r: 700 })
    const n = items.length
    const anglePerItem = 360 / Math.max(1, n)
    const frontCb = useRef(onFrontChange)
    useEffect(() => {
      frontCb.current = onFrontChange
    }, [onFrontChange])

    // Card size + ring radius from the viewport.
    useEffect(() => {
      const fit = () => {
        const w = Math.round(Math.min(300, window.innerWidth * 0.62, window.innerHeight * 0.42))
        const h = Math.round(w * 1.33)
        const r = radius ?? Math.max(360, (w * 1.12 * n) / (2 * Math.PI))
        setSize({ w, h, r })
      }
      fit()
      window.addEventListener("resize", fit)
      return () => window.removeEventListener("resize", fit)
    }, [n, radius])

    // External prev / next.
    useEffect(() => {
      if (!step || step.n === 0) return
      lastTouch.current = performance.now()
      target.current = Math.round(target.current / anglePerItem) * anglePerItem - step.d * anglePerItem
    }, [step, anglePerItem])

    // The loop: ease rotation toward its target, fade/dim cards by how far round they are.
    useEffect(() => {
      let raf = 0
      let prev = performance.now()
      const tick = (now: number) => {
        const dt = Math.min(0.05, (now - prev) / 1000)
        prev = now
        const idle = now - lastTouch.current > 1600 && !drag.current
        if (idle) target.current -= autoRotateSpeed * dt * 60
        rot.current += (target.current - rot.current) * (1 - Math.exp(-dt * 9))
        const ring = ringRef.current
        if (ring) ring.style.transform = `translateZ(${-size.r}px) rotateY(${rot.current}deg)`
        let best = 0
        let bestD = 999
        for (let i = 0; i < n; i++) {
          const el = cardRefs.current[i]
          if (!el) continue
          const rel = wrap(i * anglePerItem + rot.current)
          const d = rel > 180 ? 360 - rel : rel
          if (d < bestD) {
            bestD = d
            best = i
          }
          el.style.opacity = String(Math.max(0.08, 1 - d / 140))
          el.style.filter = d < anglePerItem / 2 ? "none" : `grayscale(1) brightness(${Math.max(0.3, 1 - d / 150)})`
          el.style.pointerEvents = d < 70 ? "auto" : "none"
          el.dataset.front = d < anglePerItem / 2 ? "1" : "0"
        }
        if (best !== front.current) {
          front.current = best
          frontCb.current?.(best)
        }
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
      return () => cancelAnimationFrame(raf)
    }, [n, anglePerItem, autoRotateSpeed, size.r])

    // Wheel / trackpad rotates the ring (page is locked behind it).
    const stageRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
      const el = stageRef.current
      if (!el) return
      const onWheel = (e: WheelEvent) => {
        e.preventDefault()
        lastTouch.current = performance.now()
        const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
        target.current -= d * 0.12
      }
      el.addEventListener("wheel", onWheel, { passive: false })
      return () => el.removeEventListener("wheel", onWheel)
    }, [])

    const onKeyDown = (e: React.KeyboardEvent) => {
      const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0
      if (d) {
        e.preventDefault()
        lastTouch.current = performance.now()
        target.current = Math.round(target.current / anglePerItem) * anglePerItem - d * anglePerItem
      } else if (e.key === "Enter" && front.current >= 0) onItemClick?.(front.current)
    }

    return (
      <div
        ref={ref}
        role="region"
        aria-roledescription="carousel"
        aria-label="Circular 3D gallery. Drag, scroll or use arrow keys to rotate; Enter opens the front photo."
        tabIndex={0}
        onKeyDown={onKeyDown}
        className={cn("relative flex h-full w-full items-center justify-center outline-none", className)}
        {...props}
      >
        <div
          ref={stageRef}
          className="relative h-full w-full cursor-grab touch-pan-y select-none active:cursor-grabbing"
          style={{ perspective: "1800px" }}
          onPointerDown={(e) => {
            if (e.button !== 0) return
            drag.current = { x: e.clientX, start: target.current, moved: false, id: e.pointerId }
            lastTouch.current = performance.now()
          }}
          onPointerMove={(e) => {
            const d = drag.current
            if (!d || d.id !== e.pointerId) return
            const dx = e.clientX - d.x
            if (!d.moved && Math.abs(dx) > 6) {
              d.moved = true
              ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
            }
            if (d.moved) target.current = d.start + dx * 0.22
          }}
          onPointerUp={(e) => {
            const d = drag.current
            drag.current = null
            lastTouch.current = performance.now()
            if (!d) return
            if (d.moved) {
              target.current = Math.round(target.current / anglePerItem) * anglePerItem
              return
            }
            const card = (e.target as HTMLElement).closest("[data-index]")
            if (card) onItemClick?.(Number(card.getAttribute("data-index")))
          }}
          onPointerCancel={() => (drag.current = null)}
        >
          <div ref={ringRef} className="absolute inset-0" style={{ transformStyle: "preserve-3d" }}>
            {items.map((item, i) => (
              <div
                key={item.photo.url}
                ref={(el) => {
                  cardRefs.current[i] = el
                }}
                data-index={i}
                role="group"
                aria-label={item.common}
                className="group absolute left-1/2 top-1/2 cursor-zoom-in"
                style={{
                  width: size.w,
                  height: size.h,
                  marginLeft: -size.w / 2,
                  marginTop: -size.h / 2,
                  transform: `rotateY(${i * anglePerItem}deg) translateZ(${size.r}px)`,
                  backfaceVisibility: "hidden",
                }}
              >
                <div
                  data-cursor="Open"
                  className="relative h-full w-full overflow-hidden border border-hair bg-black shadow-[0_30px_80px_rgba(0,0,0,.8)] transition-[border-color] duration-300 group-hover:border-[var(--acc)] group-data-[front=1]:border-[var(--acc)]"
                  style={{ "--acc": accent } as React.CSSProperties}
                >
                  <img
                    src={item.photo.url}
                    alt={item.photo.text}
                    draggable={false}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                    style={{ objectPosition: item.photo.pos || "center" }}
                  />
                  <span className="label absolute left-0 top-0 bg-ink px-2 py-1 text-[9px] text-paper/80">
                    FR <span style={{ color: accent }}>{String(i + 1).padStart(2, "0")}</span>
                  </span>
                  <div className="absolute inset-x-0 bottom-0 border-t border-hair bg-ink/85 px-3 py-2.5 backdrop-blur-sm">
                    <h2 className="font-display truncate text-xl text-paper">{item.common}</h2>
                    <p className="label mt-1 truncate text-[8px] text-paper/45">{item.binomial || item.photo.by}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  },
)

CircularGallery.displayName = "CircularGallery"

export { CircularGallery }
