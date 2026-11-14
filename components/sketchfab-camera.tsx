"use client"

/**
 * One real camera model, embedded from Sketchfab and driven through the official Viewer API.
 * Visitors can't grab it (pointer-events are off); instead we fly Sketchfab's camera every frame:
 * a spiral in on arrival, a push-in on scroll, and on focus an orbit round to the back followed
 * by a dolly into the rear LCD. Sketchfab's world is Z-up; all numbers below are world units
 * measured per model (see CALIBRATION).
 *
 * The iframe overhangs its box top and bottom and the overflow is hidden: Sketchfab's title bar
 * lives in the top strip, its "click & hold" hint and logo in the bottom one. The camera is panned so the subject
 * stays centred in the visible part.
 */

import * as React from "react"
import type { MotionValue } from "framer-motion"

type Vec3 = [number, number, number]

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    Sketchfab?: any
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export type Calibration = {
  target: Vec3
  fov: number
  restAz: number
  restEl: number
  restR: number
  /** Azimuth that looks straight at the LCD (unwrapped so the turn goes the way we want). */
  backAz: number
  backEl: number
  screen: Vec3
  screenR: number
  spin: 1 | -1
}

export const CALIBRATION: Record<"sony" | "nikon", Calibration> = {
  sony: {
    target: [0, 2.92, 8.07],
    fov: 30,
    restAz: -0.55,
    restEl: 0.2,
    restR: 70,
    backAz: Math.PI,
    backEl: 0,
    screen: [0, 4.7, 6.5],
    screenR: 12,
    spin: 1,
  },
  nikon: {
    target: [-3.28, -0.67, 8.65],
    fov: 30,
    restAz: -Math.PI / 2 + 0.55,
    restEl: 0.2,
    restR: 72,
    backAz: Math.PI / 2 - 2 * Math.PI,
    backEl: 0,
    screen: [1.1, -0.67, 6.2],
    screenR: 22,
    spin: -1,
  },
}

const SCRIPT = "https://static.sketchfab.com/api/sketchfab-viewer-1.12.1.js"
const CROP = 150 // bottom strip: hint + logo
const CROP_TOP = 70 // top strip: model title + share button
let scriptPromise: Promise<void> | null = null
function loadScript() {
  if (window.Sketchfab) return Promise.resolve()
  if (!scriptPromise)
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script")
      s.src = SCRIPT
      s.async = true
      s.onload = () => resolve()
      s.onerror = () => reject(new Error("Sketchfab viewer script failed to load"))
      document.head.appendChild(s)
    })
  return scriptPromise
}

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

type Props = {
  uid: string
  title: string
  calib: Calibration
  /** 0 → 1 scroll push-in. */
  progress: MotionValue<number>
  /** 0 → 1 turn-around-and-dive into the LCD. */
  focus: MotionValue<number>
  /** performance.now() when the spiral-in should start; null holds it far away. */
  introAt: number | null
  onReady?: () => void
}

export function SketchfabCamera({ uid, title, calib, progress, focus, introAt, onReady }: Props) {
  const frame = React.useRef<HTMLIFrameElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const api = React.useRef<any>(null)
  const live = React.useRef({ calib, introAt, onReady })
  React.useEffect(() => {
    live.current = { calib, introAt, onReady }
  }, [calib, introAt, onReady])

  React.useEffect(() => {
    let dead = false
    loadScript()
      .then(() => {
        if (dead || !frame.current || !window.Sketchfab) return
        const client = new window.Sketchfab("1.12.1", frame.current)
        client.init(uid, {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          success: (a: any) => {
            a.start()
            a.addEventListener("viewerready", () => {
              if (dead) return
              a.setFov(live.current.calib.fov)
              // Kill the post-process vignette so the transparent background stays clean.
              try {
                a.setPostProcessing?.({ vignetteEnable: false, grainEnable: false, chromaticAberrationEnable: false })
              } catch {}
              api.current = a
              live.current.onReady?.()
            })
          },
          error: () => live.current.onReady?.(),
          autostart: 1,
          camera: 0,
          // Cap texture resolution: far less to download, still sharp at this size.
          max_texture_size: 2048,
          transparent: 1,
          autospin: 0,
          scrollwheel: 0,
          dnt: 1,
          ui_animations: 0,
          ui_annotations: 0,
          ui_ar: 0,
          ui_controls: 0,
          ui_fullscreen: 0,
          ui_general_controls: 0,
          ui_help: 0,
          ui_hint: 0,
          ui_infos: 0,
          ui_inspector: 0,
          ui_settings: 0,
          ui_sound: 0,
          ui_stop: 0,
          ui_theme: "dark",
          ui_vr: 0,
          ui_watermark: 0,
          ui_watermark_link: 0,
        })
      })
      .catch(() => live.current.onReady?.())
    return () => {
      dead = true
    }
  }, [uid])

  // Pause everything (and let the browser throttle the iframe) while the frame is off-screen.
  const box = React.useRef<HTMLDivElement>(null)
  const onScreen = React.useRef(true)
  React.useEffect(() => {
    const el = box.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => {
      onScreen.current = e.isIntersecting
      // Only hide once the model has finished loading: the page now opens on other sections,
      // and the download must keep going in the background until it is ready.
      if (frame.current && api.current) frame.current.style.visibility = e.isIntersecting ? "visible" : "hidden"
    })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  React.useEffect(() => {
    let raf = 0
    let last = ""
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const a = api.current
      const el0 = frame.current
      const b0 = box.current
      if (!a || !el0 || !b0 || !onScreen.current || document.hidden) return
      const c = live.current.calib
      const now = performance.now()
      const intro = live.current.introAt
      const u = intro === null ? 1 : 1 - easeOutCubic(clamp01((now - intro) / 3200))
      const p = progress.get()
      const f = focus.get()
      const fa = easeInOut(clamp01(f / 0.55))
      const fb = easeInOut(clamp01((f - 0.4) / 0.6))

      // No idle sway: when nothing moves we send nothing and Sketchfab stops re-rendering.
      let az = c.restAz + u * 2.3 * Math.PI * c.spin
      let el = c.restEl + u * 0.45
      let r = c.restR * (1 + 2.6 * u) * (1 - 0.16 * p)
      let tg: Vec3 = c.target
      if (fa > 0) {
        az = lerp(az, c.backAz, fa)
        el = lerp(el, c.backEl, fa)
        tg = [lerp(c.target[0], c.screen[0], fa), lerp(c.target[1], c.screen[1], fa), lerp(c.target[2], c.screen[2], fa)]
        r = lerp(r, c.restR * 0.62, fa)
        r = lerp(r, c.screenR, fb)
      }

      // The iframe is a fixed viewport-sized canvas; the box around it can be much smaller.
      // Back off so the subject keeps its size relative to the visible box, then pan so it
      // sits in the middle of that box.
      const h = el0.clientHeight || 1
      const vis = Math.max(1, b0.clientHeight)
      r *= lerp(h / vis, 1, fb)
      const k = (((CROP - CROP_TOP) / 2) / h) * 2 * r * Math.tan(((c.fov * Math.PI) / 180) / 2) * (1 - fb)
      const ce = Math.cos(el)
      const up: Vec3 = [-Math.sin(el) * Math.cos(az), -Math.sin(el) * Math.sin(az), ce]
      const target: Vec3 = [tg[0] - up[0] * k, tg[1] - up[1] * k, tg[2] - up[2] * k]
      const pos: Vec3 = [
        target[0] + r * ce * Math.cos(az),
        target[1] + r * ce * Math.sin(az),
        target[2] + r * Math.sin(el),
      ]
      const key = pos.map((v) => v.toFixed(2)).join() + target.map((v) => v.toFixed(2)).join()
      if (key === last) return
      last = key
      a.setCameraLookAt(pos, target, 0)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [progress, focus])

  // The iframe never changes size (resizing a WebGL canvas mid-animation is what stutters):
  // it is always viewport-sized plus the crop strips, centred in the box, and the box's
  // overflow does the framing. The shift puts the visible strip's centre on the box centre.
  return (
    <div ref={box} className="absolute inset-0 overflow-hidden">
      <iframe
        ref={frame}
        title={title}
        className="pointer-events-none absolute left-1/2 top-1/2 border-0"
        style={{
          width: "100vw",
          height: `calc(100svh + ${CROP + CROP_TOP}px)`,
          transform: `translate(-50%, calc(-50% + ${(CROP - CROP_TOP) / 2}px))`,
        }}
        allow="autoplay; fullscreen; xr-spatial-tracking"
      />
    </div>
  )
}
