"use client"

import * as React from "react"
import { motion, useAnimate } from "framer-motion"

const BLADES = 8

/**
 * A focal-plane shutter: horizontal steel blades that retract up and down from the middle.
 * Driven imperatively (useAnimate) so every blade always finishes and `onDone(open)` fires
 * exactly once per change, even if `open` flips mid-animation.
 */
export function Shutter({
  open,
  onDone,
  children,
}: {
  open: boolean
  onDone?: (open: boolean) => void
  children?: React.ReactNode
}) {
  const [scope, run] = useAnimate()
  const done = React.useRef(onDone)
  const first = React.useRef(true)
  // Whatever `open` is on mount is the resting state; only later changes animate.
  const [startOpen] = React.useState(open)
  React.useEffect(() => {
    done.current = onDone
  }, [onDone])

  React.useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const half = BLADES / 2
    const blades = Array.from(scope.current.querySelectorAll("[data-blade]")) as HTMLElement[]
    let cancelled = false
    const runs = blades.map((el, i) => {
      const upper = i < half
      const fromMiddle = upper ? half - 1 - i : i - half
      return run(
        el,
        { scaleY: open ? 0 : 1 },
        open
          ? { duration: 0.62, delay: fromMiddle * 0.055, ease: [0.7, 0, 0.2, 1] }
          : { duration: 0.32, delay: (half - 1 - fromMiddle) * 0.03, ease: [0.5, 0, 0.75, 0] },
      )
    })
    run(scope.current.querySelector("[data-veil]"), { opacity: open ? 0 : 1 }, { duration: 0.2 })
    Promise.all(runs).then(() => {
      if (!cancelled) done.current?.(open)
    })
    return () => {
      cancelled = true
    }
  }, [open, run, scope])

  return (
    <div ref={scope} className="pointer-events-none fixed inset-0 z-[90] flex flex-col" aria-hidden={open}>
      {Array.from({ length: BLADES }, (_, i) => (
        <div
          key={i}
          data-blade=""
          className="relative flex-1 border-y border-black/70"
          style={{
            transform: startOpen ? "scaleY(0)" : "scaleY(1)",
            transformOrigin: i < BLADES / 2 ? "top" : "bottom",
            background: "linear-gradient(180deg,#0f1012 0%,#1a1c1f 46%,#08090a 54%,#121316 100%)",
            boxShadow: "inset 0 1px 0 rgba(235,237,240,.06)",
          }}
        />
      ))}
      <div data-veil="" className="absolute inset-0 flex items-center justify-center" style={{ opacity: startOpen ? 0 : 1 }}>
        {children}
      </div>
    </div>
  )
}

/** A quick cold flash, like a strobe at the moment the shutter fires. */
export function Flash({ fire }: { fire: number }) {
  return (
    <motion.div
      key={fire}
      className="pointer-events-none fixed inset-0 z-[95] bg-[#f4f7ff]"
      initial={{ opacity: fire ? 0.5 : 0 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
    />
  )
}
