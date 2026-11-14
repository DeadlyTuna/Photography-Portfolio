"use client"

import * as React from "react"
import * as THREE from "three"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Environment, Lightformer } from "@react-three/drei"
import type { MotionValue } from "framer-motion"
import { NikonD3100, NIKON_LCD, SonyA7R3, SONY_LCD, useScreenTexture } from "./camera-models"
import { CAMERAS, type CameraId } from "@/lib/photos"

export type Phase = "idle" | "focusing" | "gallery" | "returning"

export type StageProps = {
  /** 0 = hero framing, 1 = cameras zoomed in, offering the choice. */
  progress: MotionValue<number>
  phase: Phase
  selected: CameraId | null
  /** performance.now() when the intro started; the fly-in is timed from it. */
  startedAt: number
  active: boolean
  onSelect: (id: CameraId) => void
  onFocused: () => void
  onReturned: () => void
  /** DOM labels that follow each body on screen (positioned every frame). */
  labelRefs: React.RefObject<Record<CameraId, HTMLDivElement | null>>
}

// ------------------------------------------------------------------ math

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

type Pose = { x: number; y: number; z: number; rx: number; ry: number; s: number }
const lerpPose = (a: Pose, b: Pose, t: number): Pose => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
  z: lerp(a.z, b.z, t),
  rx: lerp(a.rx, b.rx, t),
  ry: lerp(a.ry, b.ry, t),
  s: lerp(a.s, b.s, t),
})

const IDS: CameraId[] = ["sony", "nikon"]
const SIDE: Record<CameraId, -1 | 1> = { sony: -1, nikon: 1 }
const LCD: Record<CameraId, THREE.Vector3> = { sony: SONY_LCD, nikon: NIKON_LCD }

/** Where a camera rests for a given scroll progress `p` (0 hero → 1 chooser). */
function basePose(id: CameraId, aspect: number, p: number): Pose {
  const side = SIDE[id]
  if (aspect < 0.85) {
    // Portrait phones: stack the bodies, Sony on top.
    const hero: Pose = { x: 0, y: side < 0 ? 1.45 : -1.5, z: -0.6, rx: 0.18, ry: -side * 0.5, s: 0.78 }
    const pick: Pose = { x: 0, y: side < 0 ? 1.12 : -0.98, z: 0.55, rx: 0.12, ry: -side * 0.38, s: 0.82 }
    return lerpPose(hero, pick, p)
  }
  const k = Math.min(1, Math.max(0.62, aspect / 1.7))
  const hero: Pose = { x: side * 2.25 * k, y: -0.02, z: -0.5, rx: 0.16, ry: -side * 0.48, s: 1 }
  const pick: Pose = { x: side * 1.62 * k, y: -0.22, z: 1.3, rx: 0.1, ry: -side * 0.32, s: 1 }
  return lerpPose(hero, pick, p)
}

const FOCUS_Z = 2.6
const SCREEN_DIST = 0.34

// ------------------------------------------------------------------ rig

function Rig({ progress, phase, selected, startedAt, onSelect, onFocused, onReturned, labelRefs }: StageProps) {
  const { camera, size } = useThree()
  const outer = React.useRef<Record<CameraId, THREE.Group | null>>({ sony: null, nikon: null })
  const inner = React.useRef<Record<CameraId, THREE.Group | null>>({ sony: null, nikon: null })
  const hoverAmt = React.useRef<Record<CameraId, number>>({ sony: 0, nikon: 0 })
  const [hovered, setHovered] = React.useState<CameraId | null>(null)
  const hoveredRef = React.useRef<CameraId | null>(null)
  const focus = React.useRef(0)
  const smoothP = React.useRef(0)
  const fired = React.useRef<Phase | null>(null)
  const look = React.useMemo(() => new THREE.Vector3(), [])
  const tmpA = React.useMemo(() => new THREE.Vector3(), [])
  const tmpB = React.useMemo(() => new THREE.Vector3(), [])
  const proj = React.useMemo(() => new THREE.Vector3(), [])

  const sonyScreen = useScreenTexture(CAMERAS.sony.screen, CAMERAS.sony.accent, "1/" + CAMERAS.sony.photos.length, "70mm  f/4  1/160  ISO 125")
  const nikonScreen = useScreenTexture(CAMERAS.nikon.screen, CAMERAS.nikon.accent, "1/" + CAMERAS.nikon.photos.length, "18-55mm  f/5.6  1/200  ISO 100")

  React.useEffect(() => {
    document.body.style.cursor = hovered && phase === "idle" ? "pointer" : ""
    return () => {
      document.body.style.cursor = ""
    }
  }, [hovered, phase])

  React.useEffect(() => {
    fired.current = null
  }, [phase])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 20)
    const elapsed = (performance.now() - startedAt) / 1000
    const time = state.clock.elapsedTime
    const aspect = size.width / Math.max(1, size.height)

    // Scroll progress, softened so wheel steps glide.
    smoothP.current = THREE.MathUtils.damp(smoothP.current, progress.get(), 6, dt)
    const p = smoothP.current

    // Focus timeline: 0 → turn around → fly into the screen → 1.
    if (phase === "focusing") focus.current = Math.min(1, focus.current + dt / 2.5)
    else if (phase === "returning") focus.current = Math.max(0, focus.current - dt / 2)
    else if (phase === "gallery") focus.current = 1
    else focus.current = Math.max(0, focus.current - dt / 1.5)
    const f = focus.current
    if (phase === "focusing" && f >= 1 && fired.current !== phase) {
      fired.current = phase
      onFocused()
    }
    if (phase === "returning" && f <= 0 && fired.current !== phase) {
      fired.current = phase
      onReturned()
    }
    const a = easeInOutCubic(clamp01(f / 0.55))
    const b = easeInOutCubic(clamp01((f - 0.42) / 0.58))

    for (const id of IDS) {
      const o = outer.current[id]
      const r = inner.current[id]
      if (!o || !r) continue
      const side = SIDE[id]
      const i = side < 0 ? 0 : 1
      let pose = basePose(id, aspect, p)

      // Idle life: a slow float, a little sway and the cursor's parallax.
      const calm = 1 - a
      const hv = (hoverAmt.current[id] = THREE.MathUtils.damp(
        hoverAmt.current[id],
        hoveredRef.current === id && phase === "idle" ? 1 : 0,
        8,
        dt,
      ))
      pose = {
        ...pose,
        y: pose.y + (Math.sin(time * 1.1 + i * 1.7) * 0.05 + hv * 0.06) * calm,
        rx: pose.rx + (-state.pointer.y * 0.1 - hv * 0.12) * calm,
        ry: pose.ry + (Math.sin(time * 0.55 + i * 2.1) * 0.08 + state.pointer.x * 0.22 + hv * -side * 0.25) * calm,
        s: pose.s * (1 + hv * 0.07 * calm),
      }

      // Intro: each body spirals in from far away and lands behind the name.
      const t0 = 1.55 + i * 0.22
      const u = 1 - easeOutCubic(clamp01((elapsed - t0) / 2.7))
      o.visible = elapsed > t0 - 0.05
      if (u > 0) {
        const dir = side < 0 ? 1 : -1
        const phi = (side < 0 ? Math.PI : 0) + u * 2.3 * Math.PI * dir
        const R = u * 6.5
        pose = {
          ...pose,
          x: pose.x + R * Math.cos(phi),
          y: pose.y + u * 2.4 * -side,
          z: pose.z + R * Math.sin(phi) * 0.7 - u * 3,
          rx: pose.rx + u * 0.9,
          ry: pose.ry + u * 3 * Math.PI * dir,
        }
      }

      // Focus: the chosen body comes to centre and turns its back (LCD) to us; the other leaves.
      if (selected === id) {
        pose = lerpPose(pose, { x: 0, y: 0, z: FOCUS_Z, rx: 0, ry: side < 0 ? Math.PI : -Math.PI, s: 1 }, a)
      } else if (selected) {
        pose = { ...pose, x: pose.x + side * 4.5 * a, z: pose.z - 2.5 * a, ry: pose.ry - side * 1.4 * a }
      }

      o.position.set(pose.x, pose.y, pose.z)
      o.scale.setScalar(pose.s)
      r.rotation.set(pose.rx, pose.ry, 0)
    }

    // The view camera: hero → chooser by scroll, then into the chosen LCD.
    const camHero = tmpA.set(0, 0.2, 7.4)
    const camPick = tmpB.set(0, 0.1, 6.5)
    const cx = lerp(camHero.x, camPick.x, p)
    const cy = lerp(camHero.y, camPick.y, p)
    const cz = lerp(camHero.z, camPick.z, p)
    let px = cx
    let py = cy
    let pz = cz
    let lx = 0
    let ly = lerp(0, -0.12, p)
    let lz = 0
    if (selected) {
      const L = LCD[selected]
      const sx = -L.x
      const sy = L.y
      const sz = FOCUS_Z - L.z
      px = lerp(lerp(cx, 0, a), sx, b)
      py = lerp(lerp(cy, 0.12, a), sy, b)
      pz = lerp(lerp(cz, 6.3, a), sz + SCREEN_DIST, b)
      lx = lerp(lerp(lx, 0, a), sx, b)
      ly = lerp(lerp(ly, 0, a), sy, b)
      lz = lerp(lerp(lz, FOCUS_Z, a), sz, b)
    }
    camera.position.set(px, py, pz)
    look.set(lx, ly, lz)
    camera.lookAt(look)
    camera.updateMatrixWorld()

    // Pin each DOM label just under its camera.
    for (const id of IDS) {
      const o = outer.current[id]
      const el = labelRefs.current?.[id]
      if (!o || !el) continue
      proj.set(o.position.x, o.position.y - 0.62 * o.scale.x, o.position.z).project(camera)
      const x = (proj.x * 0.5 + 0.5) * size.width
      const y = (-proj.y * 0.5 + 0.5) * size.height
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translateX(-50%)`
    }
  })

  const bind = (id: CameraId) => ({
    onPointerOver: (e: { stopPropagation: () => void }) => {
      e.stopPropagation()
      hoveredRef.current = id
      setHovered(id)
    },
    onPointerOut: () => {
      if (hoveredRef.current === id) hoveredRef.current = null
      setHovered((h) => (h === id ? null : h))
    },
    onClick: (e: { stopPropagation: () => void }) => {
      e.stopPropagation()
      if (phase === "idle") onSelect(id)
    },
  })

  return (
    <>
      {IDS.map((id) => (
        <group
          key={id}
          ref={(g) => {
            outer.current[id] = g
          }}
          visible={false}
        >
          <group
            ref={(g) => {
              inner.current[id] = g
            }}
            {...bind(id)}
          >
            {id === "sony" ? <SonyA7R3 screen={sonyScreen} /> : <NikonD3100 screen={nikonScreen} />}
          </group>
        </group>
      ))}
    </>
  )
}

export default function CameraStage(props: StageProps) {
  return (
    <Canvas
      className="!absolute inset-0"
      dpr={[1, 1.8]}
      frameloop={props.active ? "always" : "never"}
      camera={{ position: [0, 0.2, 7.4], fov: 35, near: 0.05, far: 100 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 5, 6]} intensity={2.2} />
      <directionalLight position={[-5, 2, -4]} intensity={1.4} color="#ffd9b3" />
      <pointLight position={[-3.2, 1.2, -1.5]} intensity={14} distance={9} color={CAMERAS.sony.accent} />
      <pointLight position={[3.2, 1.2, -1.5]} intensity={14} distance={9} color={CAMERAS.nikon.accent} />
      <pointLight position={[0, -2.5, 3]} intensity={6} distance={9} color="#7a93ff" />
      <Environment resolution={256} frames={1}>
        <Lightformer intensity={2} rotation-x={Math.PI / 2} position={[0, 4, -9]} scale={[10, 1, 1]} />
        <Lightformer intensity={2} rotation-x={Math.PI / 2} position={[0, 4, -6]} scale={[10, 1, 1]} />
        <Lightformer intensity={2} rotation-x={Math.PI / 2} position={[0, 4, -3]} scale={[10, 1, 1]} />
        <Lightformer intensity={2} rotation-x={Math.PI / 2} position={[0, 4, 0]} scale={[10, 1, 1]} />
        <Lightformer intensity={3} rotation-y={Math.PI / 2} position={[-6, 1, -1]} scale={[20, 0.6, 1]} />
        <Lightformer intensity={3} rotation-y={-Math.PI / 2} position={[6, 1, 0]} scale={[20, 1, 1]} />
        <Lightformer form="ring" color={CAMERAS.sony.accent} intensity={4} scale={2} position={[-5, 2, 4]} target={[0, 0, 0]} />
        <Lightformer form="ring" color={CAMERAS.nikon.accent} intensity={4} scale={2} position={[5, 2, 4]} target={[0, 0, 0]} />
      </Environment>
      <Rig {...props} />
    </Canvas>
  )
}
