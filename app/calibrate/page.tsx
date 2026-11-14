"use client"
// TEMPORARY: used to tune the Sketchfab camera paths. Deleted before handing back.
import * as React from "react"
import { useMotionValue } from "framer-motion"
import { SketchfabCamera, type Calibration } from "@/components/sketchfab-camera"

const DEFAULT: Calibration = { backAz: Math.PI, backEl: 0.05, screenDist: 0.25, fit: 1, restAz: 0, spin: 1 }

export default function Calibrate() {
  const sp = useMotionValue(0)
  const sf = useMotionValue(0)
  const np = useMotionValue(0)
  const nf = useMotionValue(0)
  const [sc, setSc] = React.useState<Calibration>(DEFAULT)
  const [nc, setNc] = React.useState<Calibration>(DEFAULT)
  const [introAt] = React.useState(() => performance.now() - 10000)
  React.useEffect(() => {
    const w = window as unknown as Record<string, unknown>
    w.__mv = { sony: { p: sp, f: sf }, nikon: { p: np, f: nf } }
    w.__setCalib = (id: string, c: Partial<Calibration>) => (id === "sony" ? setSc((o) => ({ ...o, ...c })) : setNc((o) => ({ ...o, ...c })))
  }, [sp, sf, np, nf])
  return (
    <div className="grid h-svh grid-cols-2 bg-neutral-900">
      <SketchfabCamera id="sony" uid="aa7ecf6efe144d1d9898a0ae294e0722" title="Sony" calib={sc} progress={sp} focus={sf} introAt={introAt} />
      <SketchfabCamera id="nikon" uid="7793688671a64b5fbeac5a57543fad3d" title="Nikon" calib={nc} progress={np} focus={nf} introAt={introAt} />
    </div>
  )
}
