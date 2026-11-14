"use client"

/**
 * Procedural, stylised models of the two bodies (built from primitives so they load instantly,
 * work offline, and every part — especially the rear LCD — sits at a known position the zoom can
 * fly into). Front of each camera faces +Z; the LCD sits on the back (-Z).
 */

import * as React from "react"
import * as THREE from "three"
import { RoundedBox } from "@react-three/drei"

// ------------------------------------------------------------------ textures

function useCanvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, deps: unknown[]) {
  return React.useMemo(() => {
    const c = document.createElement("canvas")
    c.width = w
    c.height = h
    const ctx = c.getContext("2d")!
    draw(ctx)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    return t
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

function useText(text: string, font: string, color = "#f4f2ee", w = 512, h = 128) {
  return useCanvasTexture(
    w,
    h,
    (ctx) => {
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = color
      ctx.font = font
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(text, w / 2, h / 2 + 4)
    },
    [text, font, color, w, h],
  )
}

function useRibs(count = 90, light = "#2c2c2e", dark = "#0c0c0d") {
  const t = useCanvasTexture(
    512,
    4,
    (ctx) => {
      const sw = 512 / count
      for (let i = 0; i < count; i++) {
        ctx.fillStyle = i % 2 ? light : dark
        ctx.fillRect(i * sw, 0, sw, 4)
      }
    },
    [count, light, dark],
  )
  t.wrapS = THREE.RepeatWrapping
  return t
}

/** The rear LCD: the photo the camera "just took", with a playback UI drawn over it. */
export function useScreenTexture(src: string, accent: string, counter: string, info: string) {
  return React.useMemo(() => {
    const W = 768
    const H = 512
    const c = document.createElement("canvas")
    c.width = W
    c.height = H
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    const draw = (img?: HTMLImageElement) => {
      const ctx = c.getContext("2d")!
      ctx.fillStyle = "#050506"
      ctx.fillRect(0, 0, W, H)
      if (img) {
        const s = Math.max(W / img.width, H / img.height)
        const iw = img.width * s
        const ih = img.height * s
        ctx.drawImage(img, (W - iw) / 2, (H - ih) / 2, iw, ih)
      }
      let g = ctx.createLinearGradient(0, 0, 0, 90)
      g.addColorStop(0, "rgba(0,0,0,.65)")
      g.addColorStop(1, "rgba(0,0,0,0)")
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, 90)
      g = ctx.createLinearGradient(0, H - 100, 0, H)
      g.addColorStop(0, "rgba(0,0,0,0)")
      g.addColorStop(1, "rgba(0,0,0,.7)")
      ctx.fillStyle = g
      ctx.fillRect(0, H - 100, W, 100)
      ctx.font = "600 26px ui-monospace, Consolas, monospace"
      ctx.textBaseline = "middle"
      ctx.fillStyle = accent
      ctx.beginPath()
      ctx.moveTo(30, 26)
      ctx.lineTo(50, 38)
      ctx.lineTo(30, 50)
      ctx.fill()
      ctx.fillStyle = "#fff"
      ctx.fillText(counter, 64, 39)
      // battery
      ctx.strokeStyle = "#fff"
      ctx.lineWidth = 3
      ctx.strokeRect(W - 86, 26, 48, 24)
      ctx.fillRect(W - 38, 32, 5, 12)
      ctx.fillStyle = accent
      ctx.fillRect(W - 82, 30, 30, 16)
      ctx.fillStyle = "#fff"
      ctx.font = "600 24px ui-monospace, Consolas, monospace"
      ctx.fillText(info, 30, H - 34)
      t.needsUpdate = true
    }
    draw()
    if (typeof window !== "undefined") {
      const img = new Image()
      img.src = src
      img.onload = () => draw(img)
    }
    return t
  }, [src, accent, counter, info])
}

// ------------------------------------------------------------------ shared parts

const HALF_PI = Math.PI / 2

type Seg = { len: number; r: number; rFront?: number; color: string; rough?: number; metal?: number; ribs?: boolean }

function Lens({ segs, glassR, position }: { segs: Seg[]; glassR: number; position: [number, number, number] }) {
  const ribs = useRibs()
  let z = 0
  const parts = segs.map((s, i) => {
    const zc = z + s.len / 2
    z += s.len
    return (
      <mesh key={i} position={[0, 0, zc]} rotation-x={HALF_PI}>
        <cylinderGeometry args={[s.rFront ?? s.r, s.r, s.len, 72, 1]} />
        <meshStandardMaterial
          color={s.color}
          map={s.ribs ? ribs : null}
          roughness={s.rough ?? 0.6}
          metalness={s.metal ?? 0.2}
        />
      </mesh>
    )
  })
  return (
    <group position={position}>
      {parts}
      {/* front element: a slightly domed, coated glass */}
      <mesh position={[0, 0, z]} rotation-x={HALF_PI} scale={[1, 0.28, 1]}>
        <sphereGeometry args={[glassR, 48, 16, 0, Math.PI * 2, 0, HALF_PI]} />
        <meshPhysicalMaterial
          color="#070a14"
          roughness={0.03}
          metalness={0.85}
          clearcoat={1}
          clearcoatRoughness={0.02}
          iridescence={1}
          iridescenceIOR={1.6}
          envMapIntensity={2.4}
        />
      </mesh>
      <mesh position={[0, 0, z + 0.001]}>
        <torusGeometry args={[glassR * 1.02, 0.012, 12, 72]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.4} metalness={0.6} />
      </mesh>
    </group>
  )
}

function Dial({ position, r, h, color = "#1f1f21" }: { position: [number, number, number]; r: number; h: number; color?: string }) {
  const ribs = useRibs(60, "#3a3a3c", "#121214")
  return (
    <mesh position={position}>
      <cylinderGeometry args={[r, r, h, 48]} />
      <meshStandardMaterial attach="material-0" map={ribs} roughness={0.5} metalness={0.5} />
      <meshStandardMaterial attach="material-1" color={color} roughness={0.35} metalness={0.6} />
      <meshStandardMaterial attach="material-2" color={color} roughness={0.35} metalness={0.6} />
    </mesh>
  )
}

function Button({ position, r = 0.035, h = 0.02, color = "#202022", axis = "z" }: { position: [number, number, number]; r?: number; h?: number; color?: string; axis?: "y" | "z" }) {
  return (
    <mesh position={position} rotation-x={axis === "z" ? HALF_PI : 0}>
      <cylinderGeometry args={[r, r, h, 24]} />
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.4} />
    </mesh>
  )
}

function Decal({ map, position, size, rotation = [0, 0, 0] }: { map: THREE.Texture; position: [number, number, number]; size: [number, number]; rotation?: [number, number, number] }) {
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={map} transparent toneMapped={false} depthWrite={false} />
    </mesh>
  )
}

function Screen({ map, position, size }: { map: THREE.Texture; position: [number, number, number]; size: [number, number] }) {
  return (
    <group position={position}>
      <RoundedBox args={[size[0] + 0.06, size[1] + 0.06, 0.02]} radius={0.008} smoothness={2} position={[0, 0, 0.004]}>
        <meshPhysicalMaterial color="#050505" roughness={0.15} metalness={0.3} clearcoat={1} />
      </RoundedBox>
      <mesh position={[0, 0, -0.0075]} rotation-y={Math.PI}>
        <planeGeometry args={size} />
        <meshBasicMaterial map={map} toneMapped={false} />
      </mesh>
    </group>
  )
}

// ------------------------------------------------------------------ Sony α7R III

/** Rear LCD centre in the Sony's local space (used by the zoom). */
export const SONY_LCD = new THREE.Vector3(0.1, -0.06, -0.2365)

export function SonyA7R3({ screen }: { screen: THREE.Texture }) {
  const sony = useText("SONY", "700 92px Arial, Helvetica, sans-serif")
  const alpha = useText("α", "400 110px Georgia, serif", "#d8d8db", 128, 128)
  const gm = useText("GM", "800 80px Arial, sans-serif", "#ffffff", 160, 128)
  const lensTxt = useText("FE 2.8/24-70 GM", "600 52px Arial, sans-serif", "#bdbdc2", 512, 96)
  const body = <meshStandardMaterial color="#1d1d20" roughness={0.42} metalness={0.4} />
  const rubber = <meshStandardMaterial color="#111113" roughness={0.92} metalness={0.05} />
  return (
    <group>
      {/* main body + grip */}
      <RoundedBox args={[1.28, 0.78, 0.44]} radius={0.06} smoothness={4}>
        {body}
      </RoundedBox>
      <RoundedBox args={[0.34, 0.76, 0.68]} radius={0.14} smoothness={5} position={[-0.47, -0.01, 0.1]}>
        {rubber}
      </RoundedBox>
      {/* EVF hump with a sloped front */}
      <RoundedBox args={[0.46, 0.24, 0.42]} radius={0.05} smoothness={3} position={[0.08, 0.46, -0.02]}>
        {body}
      </RoundedBox>
      <mesh position={[0.08, 0.455, 0.18]} rotation-x={-0.5}>
        <boxGeometry args={[0.44, 0.2, 0.1]} />
        <meshStandardMaterial color="#1d1d20" roughness={0.42} metalness={0.4} />
      </mesh>
      <Decal map={sony} position={[0.08, 0.48, 0.227]} size={[0.32, 0.08]} rotation={[-0.5, 0, 0]} />
      {/* hot shoe */}
      <mesh position={[0.08, 0.59, -0.02]}>
        <boxGeometry args={[0.2, 0.018, 0.22]} />
        <meshStandardMaterial color="#9a9aa0" metalness={1} roughness={0.3} />
      </mesh>
      {/* eyecup */}
      <RoundedBox args={[0.34, 0.24, 0.1]} radius={0.04} smoothness={3} position={[0.08, 0.45, -0.26]}>
        {rubber}
      </RoundedBox>
      <mesh position={[0.08, 0.45, -0.312]}>
        <planeGeometry args={[0.2, 0.12]} />
        <meshPhysicalMaterial color="#020205" roughness={0.05} metalness={0.8} clearcoat={1} side={THREE.DoubleSide} />
      </mesh>
      {/* top controls */}
      <Dial position={[-0.3, 0.43, -0.06]} r={0.1} h={0.08} />
      <Dial position={[0.43, 0.43, -0.04]} r={0.1} h={0.07} />
      <Button position={[-0.47, 0.4, 0.2]} r={0.055} h={0.04} color="#b8b8be" axis="y" />
      <Button position={[-0.25, 0.4, 0.1]} r={0.03} h={0.02} axis="y" />
      <Button position={[-0.12, 0.4, 0.1]} r={0.03} h={0.02} axis="y" />
      {/* front: mount + α */}
      <mesh position={[0.08, -0.03, 0.235]} rotation-x={HALF_PI}>
        <cylinderGeometry args={[0.32, 0.32, 0.03, 72]} />
        <meshStandardMaterial color="#c8c8cd" metalness={1} roughness={0.22} />
      </mesh>
      <Decal map={alpha} position={[-0.18, 0.28, 0.222]} size={[0.07, 0.07]} />
      <Lens
        position={[0.08, -0.03, 0.25]}
        glassR={0.2}
        segs={[
          { len: 0.07, r: 0.28, color: "#18181a", rough: 0.5, metal: 0.3 },
          { len: 0.22, r: 0.285, color: "#18181a", ribs: true, rough: 0.85 },
          { len: 0.1, r: 0.282, color: "#1c1c1e", rough: 0.45, metal: 0.4 },
          { len: 0.16, r: 0.29, color: "#18181a", ribs: true, rough: 0.85 },
          { len: 0.12, r: 0.3, rFront: 0.31, color: "#141416", rough: 0.4, metal: 0.4 },
        ]}
      />
      {/* lens print + GM badge */}
      <Decal map={lensTxt} position={[0.08, 0.254, 0.59]} size={[0.26, 0.05]} rotation={[-HALF_PI, 0, 0]} />
      <mesh position={[0.364, 0.05, 0.59]} rotation-y={HALF_PI}>
        <planeGeometry args={[0.07, 0.055]} />
        <meshBasicMaterial color="#c8102e" toneMapped={false} />
      </mesh>
      <Decal map={gm} position={[0.3655, 0.05, 0.59]} size={[0.06, 0.048]} rotation={[0, HALF_PI, 0]} />
      {/* strap lugs */}
      <mesh position={[0.66, 0.26, 0]} rotation-z={HALF_PI}>
        <torusGeometry args={[0.035, 0.01, 8, 20]} />
        <meshStandardMaterial color="#9a9aa0" metalness={1} roughness={0.3} />
      </mesh>
      <mesh position={[-0.66, 0.26, 0]} rotation-z={HALF_PI}>
        <torusGeometry args={[0.035, 0.01, 8, 20]} />
        <meshStandardMaterial color="#9a9aa0" metalness={1} roughness={0.3} />
      </mesh>
      {/* back: LCD + controls */}
      <Screen map={screen} position={[SONY_LCD.x, SONY_LCD.y, -0.229]} size={[0.66, 0.44]} />
      <mesh position={[-0.43, -0.14, -0.225]}>
        <torusGeometry args={[0.075, 0.018, 12, 40]} />
        <meshStandardMaterial color="#2a2a2c" roughness={0.5} metalness={0.5} />
      </mesh>
      <Button position={[-0.43, -0.14, -0.228]} r={0.035} h={0.02} />
      <Button position={[-0.43, 0.12, -0.235]} r={0.028} h={0.04} color="#3a3a3c" />
      <Button position={[-0.33, 0.24, -0.228]} r={0.03} h={0.02} color="#c8102e" />
      <Button position={[-0.52, 0.24, -0.228]} r={0.03} h={0.02} />
      <Button position={[-0.43, -0.32, -0.228]} r={0.028} h={0.02} />
    </group>
  )
}

// ------------------------------------------------------------------ Nikon D3100

export const NIKON_LCD = new THREE.Vector3(0.06, -0.07, -0.2665)

export function NikonD3100({ screen }: { screen: THREE.Texture }) {
  const nikon = useText("Nikon", "italic 800 96px Arial, Helvetica, sans-serif")
  const model = useText("D3100", "700 64px Arial, Helvetica, sans-serif", "#e8e8e8", 320, 96)
  const af = useText("AF-S DX 18-55", "600 50px Arial, sans-serif", "#d9c27a", 512, 96)
  const body = <meshStandardMaterial color="#161617" roughness={0.62} metalness={0.15} />
  const rubber = <meshStandardMaterial color="#0d0d0e" roughness={0.95} metalness={0.02} />
  return (
    <group>
      <RoundedBox args={[1.26, 0.74, 0.5]} radius={0.09} smoothness={4}>
        {body}
      </RoundedBox>
      <RoundedBox args={[0.38, 0.8, 0.78]} radius={0.17} smoothness={5} position={[-0.45, -0.01, 0.12]}>
        {rubber}
      </RoundedBox>
      {/* the red Nikon swoosh on the grip */}
      <mesh position={[-0.33, 0.2, 0.5]} rotation={[0.2, -0.5, 0.35]}>
        <boxGeometry args={[0.025, 0.2, 0.02]} />
        <meshStandardMaterial color="#d10a0a" roughness={0.4} emissive="#5a0000" />
      </mesh>
      {/* pentaprism */}
      <group position={[0.06, 0.5, -0.02]} scale={[1.15, 1, 0.8]}>
        <mesh rotation-y={Math.PI / 4}>
          <cylinderGeometry args={[0.2, 0.33, 0.3, 4, 1]} />
          <meshStandardMaterial color="#161617" roughness={0.55} metalness={0.15} flatShading />
        </mesh>
      </group>
      <Decal map={nikon} position={[0.06, 0.5, 0.136]} size={[0.24, 0.07]} rotation={[-0.24, 0, 0]} />
      <mesh position={[0.06, 0.656, -0.02]}>
        <boxGeometry args={[0.18, 0.018, 0.2]} />
        <meshStandardMaterial color="#8c8c92" metalness={1} roughness={0.3} />
      </mesh>
      {/* yellow Nikon square on the front */}
      <mesh position={[0.48, 0.27, 0.252]}>
        <planeGeometry args={[0.06, 0.06]} />
        <meshBasicMaterial color="#f5c518" toneMapped={false} />
      </mesh>
      <Decal map={model} position={[0.47, -0.3, 0.252]} size={[0.16, 0.05]} />
      {/* eyecup */}
      <RoundedBox args={[0.3, 0.2, 0.1]} radius={0.04} smoothness={3} position={[0.06, 0.44, -0.29]}>
        {rubber}
      </RoundedBox>
      <mesh position={[0.06, 0.44, -0.342]}>
        <planeGeometry args={[0.16, 0.1]} />
        <meshPhysicalMaterial color="#020205" roughness={0.05} metalness={0.8} clearcoat={1} side={THREE.DoubleSide} />
      </mesh>
      {/* top controls */}
      <Dial position={[-0.33, 0.42, -0.06]} r={0.12} h={0.07} />
      <Button position={[-0.47, 0.42, 0.24]} r={0.05} h={0.04} color="#2a2a2c" axis="y" />
      <mesh position={[-0.47, 0.405, 0.24]}>
        <cylinderGeometry args={[0.075, 0.075, 0.02, 32]} />
        <meshStandardMaterial color="#8c8c92" metalness={1} roughness={0.3} />
      </mesh>
      {/* mount + kit lens */}
      <mesh position={[0.06, -0.03, 0.26]} rotation-x={HALF_PI}>
        <cylinderGeometry args={[0.3, 0.3, 0.03, 72]} />
        <meshStandardMaterial color="#c8c8cd" metalness={1} roughness={0.22} />
      </mesh>
      <Lens
        position={[0.06, -0.03, 0.275]}
        glassR={0.19}
        segs={[
          { len: 0.08, r: 0.27, color: "#141415", rough: 0.6 },
          { len: 0.2, r: 0.275, color: "#141415", ribs: true, rough: 0.9 },
          { len: 0.012, r: 0.277, color: "#c9a646", rough: 0.3, metal: 1 },
          { len: 0.12, r: 0.265, color: "#171718", rough: 0.55 },
          { len: 0.07, r: 0.27, color: "#141415", ribs: true, rough: 0.9 },
          { len: 0.08, r: 0.265, rFront: 0.27, color: "#111112", rough: 0.5 },
        ]}
      />
      <Decal map={af} position={[0.06, 0.237, 0.627]} size={[0.24, 0.045]} rotation={[-HALF_PI, 0, 0]} />
      <mesh position={[0.64, 0.25, 0]} rotation-z={HALF_PI}>
        <torusGeometry args={[0.035, 0.01, 8, 20]} />
        <meshStandardMaterial color="#8c8c92" metalness={1} roughness={0.3} />
      </mesh>
      <mesh position={[-0.65, 0.25, 0]} rotation-z={HALF_PI}>
        <torusGeometry args={[0.035, 0.01, 8, 20]} />
        <meshStandardMaterial color="#8c8c92" metalness={1} roughness={0.3} />
      </mesh>
      {/* back: LCD, button column, d-pad */}
      <Screen map={screen} position={[NIKON_LCD.x, NIKON_LCD.y, -0.259]} size={[0.6, 0.44]} />
      {[0.16, 0.04, -0.08, -0.2].map((y) => (
        <Button key={y} position={[0.48, y, -0.258]} r={0.03} h={0.02} />
      ))}
      <mesh position={[-0.42, -0.1, -0.255]}>
        <torusGeometry args={[0.07, 0.022, 12, 40]} />
        <meshStandardMaterial color="#232325" roughness={0.5} metalness={0.4} />
      </mesh>
      <Button position={[-0.42, -0.1, -0.258]} r={0.032} h={0.02} color="#2c2c2e" />
      <Button position={[-0.42, 0.15, -0.258]} r={0.035} h={0.02} color="#c8102e" />
      <Button position={[-0.42, -0.3, -0.258]} r={0.028} h={0.02} />
    </group>
  )
}
