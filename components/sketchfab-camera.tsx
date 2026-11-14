"use client"

/**
 * One real camera model, embedded from Sketchfab and driven through the official Viewer API.
 * Visitors can't grab it (pointer-events are off); instead we fly Sketchfab's own camera every
 * frame: a spiral in on arrival, a push-in on scroll, and on focus an orbit round to the back
 * followed by a dolly into the rear LCD. Sketchfab is Z-up.
 */

import * as React from "react"
import type { MotionValue } from "framer-motion"

type Vec3 = [number, number, number]

/* eslint-disable @typescript-eslint/no-explicit-any */
type SketchfabApi = any
declare global {
  interface Window {
    Sketchfab?: any
    __sf?: Record<string, any>
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export type Calibration = {
  /** Azimuth offset (radians, from the default view) that looks straight at the rear LCD. */
  backAz: number
  /** Elevation (radians) for looking at the LCD. */
  backEl: number
  /** Centre of the LCD in model space; falls back to the default target. */
  screen?: Vec3
  /** Camera distance at the end of the dolly, as a fraction of the default distance. */
  screenDist: number
  /** Multiplier on the default distance for the resting framing. */
  fit: number
  /** Extra azimuth for the resting view, so the two bodies face the middle. */
  restAz: number
  /** Which way it spirals in (+1 / -1). */
  spin: 1 | -1
}

const SCRIPT = "https://static.sketchfab.com/api/sketchfab-viewer-1.12.1.js"
let scriptPromise: Promise<void> | null = null
function loadScript() {
  if (typeof window === "undefined") return Promise.resolve()
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
  id: string
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
  className?: string
}

export function SketchfabCamera({ id, uid, title, calib, progress, focus, introAt, onReady, className }: Props) {
  const frame = React.useRef<HTMLIFrameElement>(null)
  const api = React.useRef<SketchfabApi>(null)
  const base = React.useRef<null | { t: Vec3; r: number; a: number; e: number }>(null)
  const calibRef = React.useRef(calib)
  const introRef = React.useRef(introAt)
  const readyCb = React.useRef(onReady)
  React.useEffect(() => {
    calibRef.current = calib
    introRef.current = introAt
    readyCb.current = onReady
  }, [calib, introAt, onReady])

  // Boot the viewer.
  React.useEffect(() => {
    let dead = false
    loadScript()
      .then(() => {
        if (dead || !frame.current || !window.Sketchfab) return
        const client = new window.Sketchfab("1.12.1", frame.current)
        client.init(uid, {
          success: (a: SketchfabApi) => {
            api.current = a
            ;(window.__sf ??= {})[id + "_status"] = "success"
            a.start()
            a.addEventListener("viewerstart", () => ((window.__sf ??= {})[id + "_status"] = "started"))
            a.addEventListener("viewerready", () => {
              a.getCameraLookAt((err: unknown, cam: { position: Vec3; target: Vec3 }) => {
                if (err || dead) return
                const [px, py, pz] = cam.position
                const [tx, ty, tz] = cam.target
                const dx = px - tx
                const dy = py - ty
                const dz = pz - tz
                const r = Math.hypot(dx, dy, dz)
                base.current = { t: cam.target, r, a: Math.atan2(dy, dx), e: Math.asin(dz / r) }
                ;(window.__sf ??= {})[id] = { api: a, base: base.current }
                readyCb.current?.()
              })
            })
          },
          error: (e: unknown) => {
            ;(window.__sf ??= {})[id + "_status"] = "error " + String(e)
            readyCb.current?.()
          },
          autostart: 1,
          preload: 1,
          transparent: 1,
          camera: 0,
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
          ui_loading: 0,
          ui_settings: 0,
          ui_sound: 0,
          ui_start: 0,
          ui_stop: 0,
          ui_theme: "dark",
          ui_vr: 0,
          ui_watermark: 0,
          ui_watermark_link: 0,
        })
      })
      .catch(() => readyCb.current?.())
    return () => {
      dead = true
    }
  }, [uid, id])

  // Fly the camera.
  React.useEffect(() => {
    let raf = 0
    let last = ""
    let n = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const a = api.current
      const b = base.current
      if (!a || !b) return
      if (++n % 2) return // ~30 updates/s is plenty and keeps postMessage traffic low
      const c = calibRef.current
      const now = performance.now()
      const intro = introRef.current
      const u = intro === null ? 1 : 1 - easeOutCubic(clamp01((now - intro) / 3000))
      const p = progress.get()
      const f = focus.get()
      const fa = easeInOut(clamp01(f / 0.55))
      const fb = easeInOut(clamp01((f - 0.45) / 0.55))
      const t = now / 1000

      let r = b.r * c.fit * (1 + 2.8 * u) * (1 - 0.14 * p)
      let az = b.a + c.restAz * (1 - u) + u * 2.2 * Math.PI * c.spin + Math.sin(t * 0.5) * 0.12 * (1 - fa) * (1 - u)
      let el = b.e + u * 0.4 + Math.sin(t * 0.7) * 0.03 * (1 - fa)
      let tg: Vec3 = b.t
      if (fa > 0) {
        az = lerp(az, b.a + c.backAz, fa)
        el = lerp(el, c.backEl, fa)
        const s = c.screen ?? b.t
        tg = [lerp(b.t[0], s[0], fa), lerp(b.t[1], s[1], fa), lerp(b.t[2], s[2], fa)]
        r = lerp(r, b.r * 0.9, fa)
        r = lerp(r, b.r * c.screenDist, fb)
      }
      const ce = Math.cos(el)
      const pos: Vec3 = [tg[0] + r * ce * Math.cos(az), tg[1] + r * ce * Math.sin(az), tg[2] + r * Math.sin(el)]
      const key = pos.map((v) => v.toFixed(4)).join() + tg.map((v) => v.toFixed(4)).join()
      if (key === last) return
      last = key
      a.setCameraLookAt(pos, tg, 0)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [progress, focus])

  return (
    <iframe
      ref={frame}
      title={title}
      className={"pointer-events-none h-full w-full border-0 " + (className ?? "")}
      allow="autoplay; fullscreen; xr-spatial-tracking"
    />
  )
}
