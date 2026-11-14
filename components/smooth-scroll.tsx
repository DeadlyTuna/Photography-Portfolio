"use client"

/**
 * Site-wide smooth scrolling (Lenis) + a tiny API the rest of the app uses:
 *  - setScrollLocked(true) freezes the page (camera turn, gallery overlay, menus)
 *  - scrollToTarget("#places") glides to an anchor or a y offset
 * Reduced-motion users get native scrolling.
 */

import * as React from "react"
import Lenis from "lenis"

let lenis: Lenis | null = null
let locked = false

export function setScrollLocked(v: boolean) {
  locked = v
  document.documentElement.style.overflow = v ? "hidden" : ""
  document.documentElement.dataset.locked = v ? "true" : "false"
  if (lenis) {
    if (v) lenis.stop()
    else lenis.start()
  }
}

export function scrollToTarget(target: string | number) {
  if (lenis) {
    lenis.scrollTo(target, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) })
    return
  }
  if (typeof target === "number") window.scrollTo({ top: target, behavior: "smooth" })
  else document.querySelector(target)?.scrollIntoView({ behavior: "smooth" })
}

export function SmoothScroll() {
  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    lenis = new Lenis({ autoRaf: true, lerp: 0.09, wheelMultiplier: 0.95 })
    if (locked) lenis.stop()
    return () => {
      lenis?.destroy()
      lenis = null
    }
  }, [])
  return null
}
