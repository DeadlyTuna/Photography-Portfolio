"use client"

import * as React from "react"
import { AnimatePresence, motion, useScroll, useSpring, useMotionValue, useReducedMotion } from "framer-motion"
import { ArrowUpRight, X } from "lucide-react"
import { SmoothScroll, scrollToTarget, setScrollLocked } from "@/components/smooth-scroll"
import { TopoField } from "@/components/ui/topo-field"
import { SITE } from "@/lib/site"
import { cn } from "@/lib/utils"

const LINKS = [
  { n: "01", label: "Selected", href: "#selected" },
  { n: "02", label: "Places", href: "#places" },
  { n: "03", label: "Cameras", href: "#cameras" },
  { n: "04", label: "About", href: "#about" },
  { n: "06", label: "Contact", href: "#contact" },
]

function Clock() {
  const [now, setNow] = React.useState<string | null>(null)
  React.useEffect(() => {
    const f = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Kolkata", hour12: false })
    const tick = () => setNow(f.format(new Date()))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [])
  return (
    <span className="label flex items-center gap-2 tabular-nums text-paper/60">
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-signal opacity-60" />
        <span className="relative inline-flex size-1.5 rounded-full bg-signal" />
      </span>
      IST {now ?? "--:--:--"}
    </span>
  )
}

// ------------------------------------------------------------------ nav

function Nav({ onMenu }: { onMenu: () => void }) {
  const [scrolled, setScrolled] = React.useState(false)
  React.useEffect(() => {
    const on = () => setScrolled(window.scrollY > window.innerHeight * 0.8)
    on()
    window.addEventListener("scroll", on, { passive: true })
    return () => window.removeEventListener("scroll", on)
  }, [])

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-[60] flex h-16 items-center justify-between border-b px-4 transition-[background-color,border-color,opacity] duration-500 sm:px-8 [[data-locked=true]_&]:pointer-events-none [[data-locked=true]_&]:opacity-0",
        scrolled ? "border-hair bg-ink/95" : "border-transparent bg-transparent",
      )}
    >
      <button
        type="button"
        onClick={() => scrollToTarget(0)}
        className="group flex items-baseline gap-3 focus-visible:outline-none"
        aria-label="Back to top"
        data-cursor="Top"
      >
        <span className="font-display text-2xl leading-none text-paper transition group-hover:text-signal">{SITE.short}</span>
        <span className="label hidden text-paper/40 sm:inline">Field notes</span>
      </button>

      <nav aria-label="Sections" className="hidden items-center gap-7 md:flex">
        {LINKS.map((l) => (
          <a
            key={l.href}
            href={l.href}
            onClick={(e) => {
              e.preventDefault()
              scrollToTarget(l.href)
            }}
            className="label group relative flex items-baseline gap-1.5 text-paper/70 transition hover:text-paper focus-visible:text-signal focus-visible:outline-none"
          >
            <span className="text-[8px] text-signal">{l.n}</span>
            {l.label}
            <span className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-signal transition-transform duration-300 group-hover:scale-x-100" />
          </a>
        ))}
      </nav>

      <div className="flex items-center gap-5">
        <span className="hidden lg:inline-flex">
          <Clock />
        </span>
        <button
          type="button"
          onClick={onMenu}
          className="label border border-hair px-3 py-2 text-paper transition hover:border-signal hover:text-signal focus-visible:border-signal focus-visible:outline-none md:hidden"
        >
          Menu
        </button>
      </div>
    </header>
  )
}

// ------------------------------------------------------------------ mobile menu

function Menu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const closeRef = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (!open) return
    setScrollLocked(true)
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("keydown", onKey)
      setScrollLocked(false)
    }
  }, [open, onClose])

  const go = (href: string) => {
    onClose()
    window.setTimeout(() => scrollToTarget(href), 380)
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className="fixed inset-0 z-[80] flex flex-col bg-ink"
          initial={{ clipPath: "inset(0 0 100% 0)" }}
          animate={{ clipPath: "inset(0 0 0% 0)" }}
          exit={{ clipPath: "inset(0 0 100% 0)" }}
          transition={{ duration: 0.6, ease: [0.7, 0, 0.2, 1] }}
        >
          <TopoField opacity={0.12} annotations={false} interactive={false} seed={21} />
          <div className="relative z-10 flex h-16 items-center justify-between border-b border-hair px-4">
            <span className="font-display text-2xl">{SITE.short}</span>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="flex size-10 items-center justify-center border border-hair text-paper focus-visible:border-signal focus-visible:outline-none"
            >
              <X className="size-5" />
            </button>
          </div>
          <nav aria-label="Sections" className="relative z-10 flex flex-1 flex-col justify-center gap-1 px-4">
            {LINKS.map((l, i) => (
              <a
                key={l.href}
                href={l.href}
                onClick={(e) => {
                  e.preventDefault()
                  go(l.href)
                }}
                className="group flex items-baseline gap-4 overflow-hidden border-b border-hair py-2 focus-visible:outline-none"
              >
                <span className="label text-signal">{l.n}</span>
                <motion.span
                  className="font-display text-[clamp(3rem,15vw,6rem)] text-paper group-focus-visible:text-signal"
                  initial={{ y: "110%" }}
                  animate={{ y: "0%" }}
                  transition={{ delay: 0.25 + i * 0.06, duration: 0.7, ease: [0.7, 0, 0.1, 1] }}
                >
                  {l.label}
                </motion.span>
              </a>
            ))}
          </nav>
          <div className="relative z-10 flex items-center justify-between border-t border-hair px-4 py-5">
            <a href={`mailto:${SITE.email}`} className="label flex items-center gap-2 text-paper/70">
              Email <ArrowUpRight className="size-3.5 text-signal" />
            </a>
            <Clock />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

// ------------------------------------------------------------------ cursor

function Cursor() {
  const reduce = useReducedMotion()
  const [enabled, setEnabled] = React.useState(false)
  const [label, setLabel] = React.useState<string | null>(null)
  const [hot, setHot] = React.useState(false)
  const [hidden, setHidden] = React.useState(true)
  const x = useMotionValue(-100)
  const y = useMotionValue(-100)
  const rx = useSpring(x, { stiffness: 420, damping: 38, mass: 0.6 })
  const ry = useSpring(y, { stiffness: 420, damping: 38, mass: 0.6 })

  React.useEffect(() => {
    if (reduce || !window.matchMedia("(pointer: fine)").matches) return
    setEnabled(true)
    document.documentElement.classList.add("has-cursor")
    let lastTarget: HTMLElement | null = null
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return
      x.set(e.clientX)
      y.set(e.clientY)
      // Only touch React state when something actually changed (pointermove fires a lot).
      const t = e.target as HTMLElement | null
      if (t === lastTarget) return
      lastTarget = t
      setHidden(false)
      const tagged = t?.closest?.("[data-cursor]") as HTMLElement | null
      setLabel(tagged?.dataset.cursor ?? null)
      setHot(!!t?.closest?.("a,button,[role=button],input,textarea,select"))
    }
    const leave = () => {
      lastTarget = null
      setHidden(true)
    }
    window.addEventListener("pointermove", move, { passive: true })
    document.documentElement.addEventListener("pointerleave", leave)
    return () => {
      window.removeEventListener("pointermove", move)
      document.documentElement.removeEventListener("pointerleave", leave)
      document.documentElement.classList.remove("has-cursor")
    }
  }, [reduce, x, y])

  if (!enabled) return null
  const size = label ? 84 : hot ? 46 : 30
  return (
    <>
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[200] size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-paper mix-blend-difference"
        style={{ x, y, opacity: hidden ? 0 : 1 }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[199] flex items-center justify-center rounded-full mix-blend-difference"
        style={{ x: rx, y: ry, translateX: "-50%", translateY: "-50%", opacity: hidden ? 0 : 1 }}
        animate={{
          width: size,
          height: size,
          backgroundColor: label ? "rgba(235,237,240,1)" : "rgba(235,237,240,0)",
          borderColor: "rgba(235,237,240,.8)",
        }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
      >
        <span className="absolute inset-0 rounded-full border border-current text-paper/80" style={{ opacity: label ? 0 : 1 }} />
        <AnimatePresence>
          {label ? (
            <motion.span
              key={label}
              className="label relative text-[9px] text-ink"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
            >
              {label}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </>
  )
}

// ------------------------------------------------------------------ progress

function Progress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 40 })
  return <motion.div aria-hidden className="fixed inset-x-0 top-0 z-[61] h-px origin-left bg-signal" style={{ scaleX }} />
}

export function SiteChrome() {
  const [menu, setMenu] = React.useState(false)
  const close = React.useCallback(() => setMenu(false), [])
  return (
    <>
      <SmoothScroll />
      <Progress />
      <Nav onMenu={() => setMenu(true)} />
      <Menu open={menu} onClose={close} />
      <Cursor />
    </>
  )
}
