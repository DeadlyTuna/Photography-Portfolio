"use client";

import type React from 'react';
import { useRef, useMemo, useCallback, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

type ImageItem = string | { src: string; alt?: string };

interface FadeSettings {
	fadeIn: { start: number; end: number };
	fadeOut: { start: number; end: number };
}

interface BlurSettings {
	blurIn: { start: number; end: number };
	blurOut: { start: number; end: number };
	maxBlur: number;
}

interface InfiniteGalleryProps {
	images: ImageItem[];
	speed?: number;
	zSpacing?: number;
	visibleCount?: number;
	falloff?: { near: number; far: number };
	fadeSettings?: FadeSettings;
	blurSettings?: BlurSettings;
	className?: string;
	style?: React.CSSProperties;
}

interface PlaneData {
	index: number;
	z: number;
	imageIndex: number;
	x: number;
	y: number;
}

const DEFAULT_DEPTH_RANGE = 50;
const MAX_HORIZONTAL_OFFSET = 8;
const MAX_VERTICAL_OFFSET = 8;
/** How far in front of the photo the camera stops when you zoom in. */
const ZOOM_DISTANCE = 4;

const createClothMaterial = () => {
	return new THREE.ShaderMaterial({
		transparent: true,
		uniforms: {
			map: { value: null },
			opacity: { value: 1.0 },
			blurAmount: { value: 0.0 },
			scrollForce: { value: 0.0 },
			time: { value: 0.0 },
			isHovered: { value: 0.0 },
		},
		vertexShader: `
      uniform float scrollForce;
      uniform float time;
      uniform float isHovered;
      varying vec2 vUv;
      varying vec3 vNormal;

      void main() {
        vUv = uv;
        vNormal = normal;

        vec3 pos = position;

        // Create smooth curving based on scroll force
        float curveIntensity = scrollForce * 0.3;

        // Base curve across the plane based on distance from center
        float distanceFromCenter = length(pos.xy);
        float curve = distanceFromCenter * distanceFromCenter * curveIntensity;

        // Add gentle cloth-like ripples
        float ripple1 = sin(pos.x * 2.0 + scrollForce * 3.0) * 0.02;
        float ripple2 = sin(pos.y * 2.5 + scrollForce * 2.0) * 0.015;
        float clothEffect = (ripple1 + ripple2) * abs(curveIntensity) * 2.0;

        // Flag waving effect when hovered
        float flagWave = 0.0;
        if (isHovered > 0.5) {
          float wavePhase = pos.x * 3.0 + time * 8.0;
          float waveAmplitude = sin(wavePhase) * 0.1;
          float dampening = smoothstep(-0.5, 0.5, pos.x);
          flagWave = waveAmplitude * dampening;

          float secondaryWave = sin(pos.x * 5.0 + time * 12.0) * 0.03 * dampening;
          flagWave += secondaryWave;
        }

        pos.z -= (curve + clothEffect + flagWave);

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
		fragmentShader: `
      uniform sampler2D map;
      uniform float opacity;
      uniform float blurAmount;
      uniform float scrollForce;
      varying vec2 vUv;
      varying vec3 vNormal;

      void main() {
        vec4 color = texture2D(map, vUv);

        // Simple blur approximation
        if (blurAmount > 0.0) {
          vec2 texelSize = 1.0 / vec2(textureSize(map, 0));
          vec4 blurred = vec4(0.0);
          float total = 0.0;

          for (float x = -2.0; x <= 2.0; x += 1.0) {
            for (float y = -2.0; y <= 2.0; y += 1.0) {
              vec2 offset = vec2(x, y) * texelSize * blurAmount;
              float weight = 1.0 / (1.0 + length(vec2(x, y)));
              blurred += texture2D(map, vUv + offset) * weight;
              total += weight;
            }
          }
          color = blurred / total;
        }

        // Add subtle lighting effect based on curving
        float curveHighlight = abs(scrollForce) * 0.05;
        color.rgb += vec3(curveHighlight * 0.1);

        gl_FragColor = vec4(color.rgb, color.a * opacity);
      }
    `,
	});
};

function ImagePlane({
	texture,
	position,
	scale,
	material,
	index,
	onSelect,
	setMesh,
}: {
	texture: THREE.Texture;
	position: [number, number, number];
	scale: [number, number, number];
	material: THREE.ShaderMaterial;
	index: number;
	onSelect: (index: number) => void;
	setMesh: (mesh: THREE.Mesh | null) => void;
}) {
	const [isHovered, setIsHovered] = useState(false);

	useEffect(() => {
		if (material && texture) {
			material.uniforms.map.value = texture;
		}
	}, [material, texture]);

	useEffect(() => {
		if (material && material.uniforms) {
			material.uniforms.isHovered.value = isHovered ? 1.0 : 0.0;
		}
	}, [material, isHovered]);

	return (
		<mesh
			ref={setMesh}
			position={position}
			scale={scale}
			material={material}
			onPointerEnter={(e) => {
				e.stopPropagation();
				setIsHovered(true);
				document.body.style.cursor = 'zoom-in';
			}}
			onPointerLeave={() => {
				setIsHovered(false);
				document.body.style.cursor = '';
			}}
			onClick={(e) => {
				e.stopPropagation();
				// Faded-out planes can still be hit by the ray, so ignore them.
				if (material.uniforms.opacity.value < 0.5) return;
				onSelect(index);
			}}
		>
			<planeGeometry args={[1, 1, 32, 32]} />
		</mesh>
	);
}

function GalleryScene({
	images,
	speed = 1,
	visibleCount = 8,
	fadeSettings = {
		fadeIn: { start: 0.05, end: 0.15 },
		fadeOut: { start: 0.85, end: 0.95 },
	},
	blurSettings = {
		blurIn: { start: 0.0, end: 0.1 },
		blurOut: { start: 0.9, end: 1.0 },
		maxBlur: 3.0,
	},
}: Omit<InfiniteGalleryProps, 'className' | 'style'>) {
	const { gl, camera } = useThree();
	// Scroll state lives in refs: updating React state every frame re-rendered the whole gallery.
	const [, bumpVersion] = useState(0);
	const scrollVelocity = useRef(0);
	const autoPlay = useRef(true);
	const lastInteraction = useRef(Date.now());
	const zoomIndex = useRef<number | null>(null);
	const lastZoom = useRef<number | null>(null);
	const zoomAmt = useRef(0);
	const meshes = useRef<(THREE.Mesh | null)[]>([]);
	const shownImage = useRef<number[]>([]);
	const lookTarget = useMemo(() => new THREE.Vector3(), []);

	const normalizedImages = useMemo(
		() => images.map((img) => (typeof img === 'string' ? { src: img, alt: '' } : img)),
		[images]
	);

	const textures = useTexture(normalizedImages.map((img) => img.src));

	const materials = useMemo(
		() => Array.from({ length: visibleCount }, () => createClothMaterial()),
		[visibleCount]
	);

	const spatialPositions = useMemo(() => {
		const positions: { x: number; y: number }[] = [];
		for (let i = 0; i < visibleCount; i++) {
			const horizontalAngle = (i * 2.618) % (Math.PI * 2);
			const verticalAngle = (i * 1.618 + Math.PI / 3) % (Math.PI * 2);
			const horizontalRadius = (i % 3) * 1.2;
			const verticalRadius = ((i + 1) % 4) * 0.8;
			const x = (Math.sin(horizontalAngle) * horizontalRadius * MAX_HORIZONTAL_OFFSET) / 3;
			const y = (Math.cos(verticalAngle) * verticalRadius * MAX_VERTICAL_OFFSET) / 4;
			positions.push({ x, y });
		}
		return positions;
	}, [visibleCount]);

	const totalImages = normalizedImages.length;
	const depthRange = DEFAULT_DEPTH_RANGE;

	const planesData = useRef<PlaneData[]>(
		Array.from({ length: visibleCount }, (_, i) => ({
			index: i,
			z: visibleCount > 0 ? ((depthRange / visibleCount) * i) % depthRange : 0,
			imageIndex: totalImages > 0 ? i % totalImages : 0,
			x: spatialPositions[i]?.x ?? 0,
			y: spatialPositions[i]?.y ?? 0,
		}))
	);

	useEffect(() => {
		planesData.current = Array.from({ length: visibleCount }, (_, i) => ({
			index: i,
			z: visibleCount > 0 ? ((depthRange / Math.max(visibleCount, 1)) * i) % depthRange : 0,
			imageIndex: totalImages > 0 ? i % totalImages : 0,
			x: spatialPositions[i]?.x ?? 0,
			y: spatialPositions[i]?.y ?? 0,
		}));
		shownImage.current = [];
	}, [depthRange, spatialPositions, totalImages, visibleCount]);

	const handleWheel = useCallback(
		(event: WheelEvent) => {
			event.preventDefault();
			if (zoomIndex.current !== null) return; // locked while a photo is zoomed
			scrollVelocity.current += event.deltaY * 0.01 * speed;
			autoPlay.current = false;
			lastInteraction.current = Date.now();
		},
		[speed]
	);

	const handleKeyDown = useCallback(
		(event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				zoomIndex.current = null;
				return;
			}
			if (zoomIndex.current !== null) return;
			if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
				scrollVelocity.current -= 2 * speed;
				autoPlay.current = false;
				lastInteraction.current = Date.now();
			} else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
				scrollVelocity.current += 2 * speed;
				autoPlay.current = false;
				lastInteraction.current = Date.now();
			}
		},
		[speed]
	);

	// Click a frame: zoom into it. Click the same frame again to step back.
	const handleSelect = useCallback((i: number) => {
		lastInteraction.current = Date.now();
		autoPlay.current = false;
		if (zoomIndex.current === i) {
			zoomIndex.current = null;
			return;
		}
		zoomIndex.current = i;
		lastZoom.current = i;
	}, []);

	// Listen on this scene's own canvas. (querySelector('canvas') picked up the hero's canvas.)
	useEffect(() => {
		const el = gl.domElement;
		el.addEventListener('wheel', handleWheel, { passive: false });
		document.addEventListener('keydown', handleKeyDown);
		return () => {
			el.removeEventListener('wheel', handleWheel);
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [gl, handleWheel, handleKeyDown]);

	useEffect(() => {
		const interval = setInterval(() => {
			if (Date.now() - lastInteraction.current > 3000) {
				autoPlay.current = true;
			}
		}, 1000);
		return () => clearInterval(interval);
	}, []);

	useFrame((state, delta) => {
		const zi = zoomIndex.current;

		if (zi !== null) {
			scrollVelocity.current = 0;
			lastZoom.current = zi;
		} else {
			if (autoPlay.current) scrollVelocity.current += 0.3 * delta;
			scrollVelocity.current *= 0.95;
		}
		const velocity = scrollVelocity.current;

		// Ease the zoom in and out.
		zoomAmt.current += ((zi === null ? 0 : 1) - zoomAmt.current) * (1 - Math.exp(-delta * 4));

		const time = state.clock.getElapsedTime();
		materials.forEach((material) => {
			if (material && material.uniforms) {
				material.uniforms.time.value = time;
				material.uniforms.scrollForce.value = velocity;
			}
		});

		const imageAdvance = totalImages > 0 ? visibleCount % totalImages || totalImages : 0;
		const totalRange = depthRange;
		const halfRange = totalRange / 2;
		let imagesChanged = false;

		planesData.current.forEach((plane, i) => {
			let newZ = plane.z + velocity * delta * 10;
			let wrapsForward = 0;
			let wrapsBackward = 0;

			if (newZ >= totalRange) {
				wrapsForward = Math.floor(newZ / totalRange);
				newZ -= totalRange * wrapsForward;
			} else if (newZ < 0) {
				wrapsBackward = Math.ceil(-newZ / totalRange);
				newZ += totalRange * wrapsBackward;
			}

			if (wrapsForward > 0 && imageAdvance > 0 && totalImages > 0) {
				plane.imageIndex = (plane.imageIndex + wrapsForward * imageAdvance) % totalImages;
			}

			if (wrapsBackward > 0 && imageAdvance > 0 && totalImages > 0) {
				const step = plane.imageIndex - wrapsBackward * imageAdvance;
				plane.imageIndex = ((step % totalImages) + totalImages) % totalImages;
			}

			if (shownImage.current[i] !== plane.imageIndex) {
				shownImage.current[i] = plane.imageIndex;
				imagesChanged = true;
			}

			plane.z = ((newZ % totalRange) + totalRange) % totalRange;
			plane.x = spatialPositions[i]?.x ?? 0;
			plane.y = spatialPositions[i]?.y ?? 0;

			// Move the mesh directly: React doesn't re-render on every frame any more.
			const mesh = meshes.current[i];
			if (mesh) mesh.position.set(plane.x, plane.y, plane.z - halfRange);

			const normalizedPosition = plane.z / totalRange;
			let opacity = 1;

			if (normalizedPosition >= fadeSettings.fadeIn.start && normalizedPosition <= fadeSettings.fadeIn.end) {
				opacity = (normalizedPosition - fadeSettings.fadeIn.start) / (fadeSettings.fadeIn.end - fadeSettings.fadeIn.start);
			} else if (normalizedPosition < fadeSettings.fadeIn.start) {
				opacity = 0;
			} else if (normalizedPosition >= fadeSettings.fadeOut.start && normalizedPosition <= fadeSettings.fadeOut.end) {
				opacity = 1 - (normalizedPosition - fadeSettings.fadeOut.start) / (fadeSettings.fadeOut.end - fadeSettings.fadeOut.start);
			} else if (normalizedPosition > fadeSettings.fadeOut.end) {
				opacity = 0;
			}
			opacity = Math.max(0, Math.min(1, opacity));

			let blur = 0;

			if (normalizedPosition >= blurSettings.blurIn.start && normalizedPosition <= blurSettings.blurIn.end) {
				const blurInProgress = (normalizedPosition - blurSettings.blurIn.start) / (blurSettings.blurIn.end - blurSettings.blurIn.start);
				blur = blurSettings.maxBlur * (1 - blurInProgress);
			} else if (normalizedPosition < blurSettings.blurIn.start) {
				blur = blurSettings.maxBlur;
			} else if (normalizedPosition >= blurSettings.blurOut.start && normalizedPosition <= blurSettings.blurOut.end) {
				const blurOutProgress = (normalizedPosition - blurSettings.blurOut.start) / (blurSettings.blurOut.end - blurSettings.blurOut.start);
				blur = blurSettings.maxBlur * blurOutProgress;
			} else if (normalizedPosition > blurSettings.blurOut.end) {
				blur = blurSettings.maxBlur;
			}
			blur = Math.max(0, Math.min(blurSettings.maxBlur, blur));

			// While zoomed: the chosen frame is sharp and fully visible, the others fade away.
			if (zi === i) {
				opacity = 1;
				blur = 0;
			} else if (zi !== null || zoomAmt.current > 0.001) {
				opacity *= 1 - zoomAmt.current * 0.9;
			}

			const material = materials[i];
			if (material && material.uniforms) {
				material.uniforms.opacity.value = opacity;
				material.uniforms.blurAmount.value = blur;
			}
		});

		// Camera: fly toward the chosen frame, and back out again.
		const idx = zi ?? lastZoom.current;
		const k = zoomAmt.current;
		const p = idx !== null ? planesData.current[idx] : undefined;
		if (p) {
			const px = p.x;
			const py = p.y;
			const pz = p.z - halfRange;
			camera.position.set(px * k, py * k, (pz + ZOOM_DISTANCE) * k);
			lookTarget.set(px * k, py * k, -(1 - k) + pz * k);
			camera.lookAt(lookTarget);
		}

		if (imagesChanged) bumpVersion((v) => v + 1);
	});

	if (normalizedImages.length === 0) return null;

	return (
		<>
			{planesData.current.map((plane, i) => {
				const texture = textures[plane.imageIndex];
				const material = materials[i];

				if (!texture || !material) return null;

				const img = texture.image as { width?: number; height?: number } | undefined;
				const aspect = img?.width && img?.height ? img.width / img.height : 1;
				const scale: [number, number, number] = aspect > 1 ? [2 * aspect, 2, 1] : [2, 2 / aspect, 1];

				return (
					<ImagePlane
						key={plane.index}
						index={i}
						texture={texture}
						position={[plane.x, plane.y, plane.z - depthRange / 2]}
						scale={scale}
						material={material}
						onSelect={handleSelect}
						setMesh={(m) => {
							meshes.current[i] = m;
						}}
					/>
				);
			})}
		</>
	);
}

// Fallback component for when WebGL is not available
function FallbackGallery({ images }: { images: ImageItem[] }) {
	const normalizedImages = useMemo(
		() => images.map((img) => (typeof img === 'string' ? { src: img, alt: '' } : img)),
		[images]
	);

	return (
		<div className="flex flex-col items-center justify-center h-full bg-gray-100 p-4">
			<p className="text-gray-600 mb-4">WebGL not supported. Showing image list:</p>
			<div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
				{normalizedImages.map((img, i) => (
					<img key={i} src={img.src || '/placeholder.svg'} alt={img.alt} className="w-full h-32 object-cover rounded" />
				))}
			</div>
		</div>
	);
}

export default function InfiniteGallery({
	images,
	className = 'h-96 w-full',
	style,
	speed = 1,
	visibleCount = 8,
	fadeSettings = {
		fadeIn: { start: 0.05, end: 0.25 },
		fadeOut: { start: 0.4, end: 0.43 },
	},
	blurSettings = {
		blurIn: { start: 0.0, end: 0.1 },
		blurOut: { start: 0.4, end: 0.43 },
		maxBlur: 8.0,
	},
}: InfiniteGalleryProps) {
	const [webglSupported, setWebglSupported] = useState(true);

	useEffect(() => {
		try {
			const canvas = document.createElement('canvas');
			const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
			if (!gl) setWebglSupported(false);
		} catch {
			setWebglSupported(false);
		}
	}, []);

	if (!webglSupported) {
		return (
			<div className={className} style={style}>
				<FallbackGallery images={images} />
			</div>
		);
	}

	return (
		<div className={className} style={style} data-lenis-prevent>
			<Canvas camera={{ position: [0, 0, 0], fov: 55 }} gl={{ antialias: true, alpha: true }} dpr={[1, 1.5]}>
				<GalleryScene
					images={images}
					speed={speed}
					visibleCount={visibleCount}
					fadeSettings={fadeSettings}
					blurSettings={blurSettings}
				/>
			</Canvas>
		</div>
	);
}
