"use client"

/**
 * TopoField — an animated topographic contour background, rebuilt from scratch
 * (after "Topo Field" on 21st.dev by @mengto).
 *
 * How it works: a smooth fractal-noise height field drifts over time; every frame we run
 * marching squares over a coarse grid and stroke the iso-lines at evenly spaced elevations.
 * Every 5th line is an "index contour" (brighter, thicker), one band can be picked out in the
 * signal colour, and the pointer raises a summit you can push the terrain around with — a
 * crosshair follows it with a live elevation readout. A faint survey grid and edge
 * coordinates sit underneath.
 *
 * Cheap enough to run full-screen: ~16px cells, only the levels that cross each cell are
 * tested, 30fps cap, paused off-screen / in hidden tabs, one static frame for reduced motion.
 */

import * as React from "react"
import { cn } from "@/lib/utils"

// ------------------------------------------------------------------ noise

function makeNoise(seed: number) {
  const p = new Uint8Array(512)
  const perm = Array.from({ length: 256 }, (_, i) => i)
  let s = seed >>> 0 || 1
  for (let i = 255; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0
    const j = s % (i + 1)
    ;[perm[i], perm[j]] = [perm[j], perm[i]]
  }
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255]
  const grad = (h: number, x: number, y: number) => {
    const g = h & 7
    const u = g < 4 ? x : y
    const v = g < 4 ? y : x
    return (g & 1 ? -u : u) + (g & 2 ? -2 * v : 2 * v)
  }
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)
  return (x: number, y: number) => {
    const X = Math.floor(x) & 255
    const Y = Math.floor(y) & 255
    const xf = x - Math.floor(x)
    const yf = y - Math.floor(y)
    const u = fade(xf)
    const v = fade(yf)
    const aa = p[p[X] + Y]
    const ab = p[p[X] + Y + 1]
    const ba = p[p[X + 1] + Y]
    const bb = p[p[X + 1] + Y + 1]
    const x1 = grad(aa, xf, yf) + u * (grad(ba, xf - 1, yf) - grad(aa, xf, yf))
    const x2 = grad(ab, xf, yf - 1) + u * (grad(bb, xf - 1, yf - 1) - grad(ab, xf, yf - 1))
    return (x1 + v * (x2 - x1)) * 0.25 // ~[-1, 1] → [-.5, .5]-ish
  }
}

// ------------------------------------------------------------------ component

export interface TopoFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Line colour (any CSS colour). */
  color?: string
  /** Colour of the highlighted band + crosshair. */
  accent?: string
  /** Number of contour levels across the full height range. */
  levels?: number
  /** Feature size: bigger = broader hills. */
  scale?: number
  /** Drift speed. 0 freezes the terrain. */
  speed?: number
  /** Base line opacity (0–1). */
  opacity?: number
  /** Raise a summit under the pointer. */
  interactive?: boolean
  /** Faint survey grid every N px (0 = off). */
  grid?: number
  /** Edge coordinate ticks + the elevation readout. */
  annotations?: boolean
  /** Which contour index gets the accent colour (-1 = none). */
  highlight?: number
  seed?: number
}

export function TopoField({
  color = "#ebedf0",
  accent = "#c6ff3d",
  levels = 22,
  scale = 420,
  speed = 1,
  opacity = 0.16,
  interactive = true,
  grid = 96,
  annotations = true,
  highlight = 11,
  seed = 7,
  className,
  ...props
}: TopoFieldProps) {
  const wrap = React.useRef<HTMLDivElement>(null)
  const canvas = React.useRef<HTMLCanvasElement>(null)
  const readout = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const host = wrap.current
    const cv = canvas.current
    if (!host || !cv) return
    const ctx = cv.getContext("2d")
    if (!ctx) return

    const noise = makeNoise(seed)
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const CELL = 16
    let W = 0
    let H = 0
    let dpr = 1
    let cols = 0
    let rows = 0
    let field = new Float32Array(0)
    let raf = 0
    let last = 0
    let t = 0
    let visible = true
    // pointer, eased: x/y in css px, s = summit strength 0..1
    const ptr = { x: -9999, y: -9999, tx: -9999, ty: -9999, s: 0, ts: 0 }

    const resize = () => {
      const r = host.getBoundingClientRect()
      W = Math.max(1, Math.round(r.width))
      H = Math.max(1, Math.round(r.height))
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      cv.width = Math.round(W * dpr)
      cv.height = Math.round(H * dpr)
      cv.style.width = W + "px"
      cv.style.height = H + "px"
      cols = Math.ceil(W / CELL) + 1
      rows = Math.ceil(H / CELL) + 1
      field = new Float32Array(cols * rows)
    }

    const height = (x: number, y: number) => {
      const nx = x / scale
      const ny = y / scale
      let h = noise(nx + t * 0.05, ny - t * 0.035) * 1.0
      h += noise(nx * 2.1 - t * 0.04, ny * 2.1 + 7.3) * 0.45
      h += noise(nx * 4.3 + 3.1, ny * 4.3 - t * 0.06) * 0.18
      if (ptr.s > 0.001) {
        const dx = x - ptr.x
        const dy = y - ptr.y
        h += ptr.s * 0.95 * Math.exp(-(dx * dx + dy * dy) / (2 * 150 * 150))
      }
      return h
    }

    const LO = -0.9
    const HI = 1.5
    const step = (HI - LO) / levels

    const draw = () => {
      // sample
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) field[j * cols + i] = height(i * CELL, j * CELL)

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)

      // survey grid
      if (grid > 0) {
        ctx.strokeStyle = color
        ctx.globalAlpha = opacity * 0.28
        ctx.lineWidth = 1
        ctx.beginPath()
        for (let x = grid; x < W; x += grid) {
          ctx.moveTo(x + 0.5, 0)
          ctx.lineTo(x + 0.5, H)
        }
        for (let y = grid; y < H; y += grid) {
          ctx.moveTo(0, y + 0.5)
          ctx.lineTo(W, y + 0.5)
        }
        ctx.stroke()
      }

      // contours: one path per level so we can style index lines
      const paths: Path2D[] = Array.from({ length: levels + 1 }, () => new Path2D())
      for (let j = 0; j < rows - 1; j++) {
        for (let i = 0; i < cols - 1; i++) {
          const a = field[j * cols + i] // top-left
          const b = field[j * cols + i + 1] // top-right
          const c = field[(j + 1) * cols + i + 1] // bottom-right
          const d = field[(j + 1) * cols + i] // bottom-left
          const mn = Math.min(a, b, c, d)
          const mx = Math.max(a, b, c, d)
          let k0 = Math.ceil((mn - LO) / step)
          const k1 = Math.floor((mx - LO) / step)
          if (k0 < 0) k0 = 0
          const x0 = i * CELL
          const y0 = j * CELL
          for (let k = k0; k <= k1 && k <= levels; k++) {
            const iso = LO + k * step
            const ca = a > iso ? 8 : 0
            const cb = b > iso ? 4 : 0
            const cc = c > iso ? 2 : 0
            const cd = d > iso ? 1 : 0
            const code = ca | cb | cc | cd
            if (code === 0 || code === 15) continue
            // edge crossings
            const top = () => x0 + ((iso - a) / (b - a)) * CELL
            const right = () => y0 + ((iso - b) / (c - b)) * CELL
            const bottom = () => x0 + ((iso - d) / (c - d)) * CELL
            const left = () => y0 + ((iso - a) / (d - a)) * CELL
            const P = paths[k]
            const seg = (ax: number, ay: number, bx: number, by: number) => {
              P.moveTo(ax, ay)
              P.lineTo(bx, by)
            }
            switch (code) {
              case 1:
              case 14:
                seg(x0, left(), bottom(), y0 + CELL)
                break
              case 2:
              case 13:
                seg(bottom(), y0 + CELL, x0 + CELL, right())
                break
              case 3:
              case 12:
                seg(x0, left(), x0 + CELL, right())
                break
              case 4:
              case 11:
                seg(top(), y0, x0 + CELL, right())
                break
              case 5:
                seg(x0, left(), top(), y0)
                seg(bottom(), y0 + CELL, x0 + CELL, right())
                break
              case 6:
              case 9:
                seg(top(), y0, bottom(), y0 + CELL)
                break
              case 7:
              case 8:
                seg(x0, left(), top(), y0)
                break
              case 10:
                seg(top(), y0, x0 + CELL, right())
                seg(x0, left(), bottom(), y0 + CELL)
                break
            }
          }
        }
      }
      ctx.lineJoin = "round"
      ctx.lineCap = "round"
      for (let k = 0; k <= levels; k++) {
        const index = k % 5 === 0
        const hot = k === highlight
        ctx.strokeStyle = hot ? accent : color
        ctx.globalAlpha = hot ? Math.min(1, opacity * 2.6) : index ? Math.min(1, opacity * 1.9) : opacity
        ctx.lineWidth = hot ? 1.3 : index ? 1.15 : 0.75
        ctx.stroke(paths[k])
      }
      ctx.globalAlpha = 1

      // summit crosshair
      if (annotations && ptr.s > 0.02) {
        ctx.globalAlpha = ptr.s * 0.9
        ctx.strokeStyle = accent
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(ptr.x, ptr.y, 10, 0, Math.PI * 2)
        ctx.moveTo(ptr.x - 22, ptr.y)
        ctx.lineTo(ptr.x - 14, ptr.y)
        ctx.moveTo(ptr.x + 14, ptr.y)
        ctx.lineTo(ptr.x + 22, ptr.y)
        ctx.moveTo(ptr.x, ptr.y - 22)
        ctx.lineTo(ptr.x, ptr.y - 14)
        ctx.moveTo(ptr.x, ptr.y + 14)
        ctx.lineTo(ptr.x, ptr.y + 22)
        ctx.stroke()
        ctx.globalAlpha = 1
      }
      if (readout.current) {
        const el = readout.current
        if (annotations && ptr.s > 0.02) {
          const h = height(ptr.x, ptr.y)
          const m = Math.round(1200 + h * 1400)
          el.style.opacity = String(ptr.s)
          el.style.transform = `translate3d(${(ptr.x + 28).toFixed(0)}px, ${(ptr.y - 6).toFixed(0)}px, 0)`
          el.textContent = `▲ ${m.toLocaleString("en-US")} m · ${(ptr.x / W * 100).toFixed(1)}N ${(ptr.y / H * 100).toFixed(1)}E`
        } else el.style.opacity = "0"
      }
    }

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (!visible || document.hidden) return
      if (now - last < 1000 / 30) return
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      t += dt * speed
      const e = 1 - Math.exp(-dt * 7)
      ptr.x += (ptr.tx - ptr.x) * e
      ptr.y += (ptr.ty - ptr.y) * e
      ptr.s += (ptr.ts - ptr.s) * (1 - Math.exp(-dt * 3))
      draw()
    }

    const onMove = (e: PointerEvent) => {
      if (!interactive) return
      const r = host.getBoundingClientRect()
      const x = e.clientX - r.left
      const y = e.clientY - r.top
      const inside = x >= 0 && y >= 0 && x <= r.width && y <= r.height
      ptr.tx = x
      ptr.ty = y
      if (ptr.x < -9000) {
        ptr.x = x
        ptr.y = y
      }
      ptr.ts = inside && e.pointerType !== "touch" ? 1 : 0
    }
    const onLeave = () => (ptr.ts = 0)

    resize()
    const ro = new ResizeObserver(() => {
      resize()
      draw()
    })
    ro.observe(host)
    const io = new IntersectionObserver(([en]) => (visible = en.isIntersecting))
    io.observe(host)
    window.addEventListener("pointermove", onMove, { passive: true })
    document.addEventListener("pointerleave", onLeave)

    if (reduced) draw()
    else raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      window.removeEventListener("pointermove", onMove)
      document.removeEventListener("pointerleave", onLeave)
    }
  }, [color, accent, levels, scale, speed, opacity, interactive, grid, annotations, highlight, seed])

  return (
    <div ref={wrap} aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} {...props}>
      <canvas ref={canvas} className="absolute inset-0" />
      {annotations ? (
        <>
          <div
            ref={readout}
            className="label absolute left-0 top-0 whitespace-nowrap text-[9px] opacity-0 will-change-transform"
            style={{ color: accent }}
          />
          <div className="label absolute inset-x-0 top-3 flex justify-between px-4 text-[9px] text-paper/25">
            {["00°", "15°", "30°", "45°", "60°", "75°", "90°"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="label absolute inset-y-0 left-3 flex flex-col justify-between py-10 text-[9px] text-paper/25 [writing-mode:vertical-rl]">
            {["N 10", "N 20", "N 30", "N 40"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}

export default TopoField
