"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import type { GlobeMethods, GlobeProps } from "react-globe.gl";
import { Check, Copy, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const Globe = dynamic(() => import("react-globe.gl"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 animate-ping rounded-full bg-signal/30" />
        <div className="absolute inset-2 animate-pulse rounded-full bg-signal/50" />
      </div>
    </div>
  ),
}) as React.ComponentType<
  GlobeProps & { ref?: React.MutableRefObject<GlobeMethods | undefined> }
>;

export type GlobeLocationDetail = {
  label: string;
  value: string;
  /** Show a copy button for this row. */
  copy?: boolean;
};

export type GlobeLocation = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  subtitle?: string;
  details?: GlobeLocationDetail[];
  image?: { src: string; alt: string };
};

export type InteractiveGlobeExplorerProps = {
  locations: GlobeLocation[];
  initialLocationId?: string;
  globeTextureUrl?: string;
  /** Height map that gives mountains a bit of relief under the light. */
  bumpTextureUrl?: string;
  /** Colour of the pins and pulse rings (three.js can't read CSS variables). */
  accentColor?: string;
  /** Called when the photo in the details card is clicked. */
  onOpenImage?: (location: GlobeLocation) => void;
  className?: string;
};

type TooltipPosition = {
  x: number;
  y: number;
  mobile: boolean;
};

function useElementSize(ref: React.RefObject<HTMLElement | null>) {
  const [size, setSize] = React.useState(420);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const next = Math.min(el.clientWidth, el.clientHeight, 640);
      setSize(Math.max(280, next || 420));
    };

    const observer = new ResizeObserver(update);
    observer.observe(el);
    update();

    return () => observer.disconnect();
  }, [ref]);

  return size;
}

export function InteractiveGlobeExplorer({
  locations,
  initialLocationId,
  globeTextureUrl = "/textures/earth-blue-marble.jpg",
  bumpTextureUrl = "/textures/earth-topology.png",
  accentColor = "#c6ff3d",
  onOpenImage,
  className,
}: InteractiveGlobeExplorerProps) {
  const initialLocation =
    locations.find((location) => location.id === initialLocationId) ??
    locations[0];

  const rootRef = React.useRef<HTMLDivElement>(null);
  const globeRef = React.useRef<GlobeMethods | undefined>(undefined);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const locationRefs = React.useRef<Record<string, HTMLButtonElement | null>>(
    {},
  );
  const isScrollingProgrammatically = React.useRef(false);
  const resumeSpin = React.useRef<number | undefined>(undefined);
  const globeSize = useElementSize(containerRef);

  const [selectedLocation, setSelectedLocation] =
    React.useState<GlobeLocation | null>(null);
  const [activeLocationId, setActiveLocationId] = React.useState(
    initialLocation?.id,
  );
  const [tooltipPosition, setTooltipPosition] = React.useState<TooltipPosition>(
    { x: 0, y: 0, mobile: false },
  );
  const [copiedField, setCopiedField] = React.useState<string | null>(null);

  const activeLocation = locations.find((l) => l.id === activeLocationId);
  const rings = React.useMemo(
    () => (activeLocation ? [activeLocation] : []),
    [activeLocation],
  );

  // Fly to a place; stop the idle spin for a while so it stays in view.
  const focusGlobe = React.useCallback((location: GlobeLocation, ms = 800) => {
    globeRef.current?.pointOfView(
      { lat: location.lat, lng: location.lng, altitude: 2.2 },
      ms,
    );
    const controls = globeRef.current?.controls();
    if (controls) {
      controls.autoRotate = false;
      window.clearTimeout(resumeSpin.current);
      resumeSpin.current = window.setTimeout(() => {
        controls.autoRotate = true;
      }, 8000);
    }
  }, []);

  React.useEffect(() => () => window.clearTimeout(resumeSpin.current), []);

  const handleGlobeReady = React.useCallback(() => {
    const controls = globeRef.current?.controls();
    if (controls) {
      controls.enableZoom = false;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.4;
    }
    if (initialLocation) focusGlobe(initialLocation, 1000);
  }, [focusGlobe, initialLocation]);

  // Don't render the globe while it's scrolled out of view.
  React.useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      const g = globeRef.current;
      if (!g) return;
      if (entry.isIntersecting) g.resumeAnimation();
      else g.pauseAnimation();
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // The details card is position: fixed next to its row, so close it when the page scrolls.
  React.useEffect(() => {
    if (!selectedLocation) return;
    const close = () => setSelectedLocation(null);
    window.addEventListener("scroll", close, { passive: true });
    return () => window.removeEventListener("scroll", close);
  }, [selectedLocation]);

  const handleLocationClick = React.useCallback(
    (location: GlobeLocation, event: React.MouseEvent<HTMLElement>) => {
      setActiveLocationId(location.id);
      setSelectedLocation(location);
      setCopiedField(null);

      const rect = event.currentTarget.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const tooltipWidth = 320;
      const mobile = viewportWidth < 768;
      let x = rect.right + 16;

      if (x + tooltipWidth > viewportWidth - 20) {
        x = rect.left - tooltipWidth - 16;
      }

      setTooltipPosition({
        x: Math.max(20, x),
        y: Math.min(Math.max(rect.top + rect.height / 2, 220), window.innerHeight - 220),
        mobile,
      });

      focusGlobe(location, 1000);
    },
    [focusGlobe],
  );

  const handlePointClick = React.useCallback(
    (point: object) => {
      const location = locations.find(
        (item) => item.id === (point as GlobeLocation).id,
      );
      if (!location) return;

      setActiveLocationId(location.id);
      setSelectedLocation(null);
      focusGlobe(location, 800);

      isScrollingProgrammatically.current = true;
      const container = scrollContainerRef.current;
      const el = locationRefs.current[location.id];
      // Scroll the list only (scrollIntoView would also scroll the page).
      if (container && el) {
        container.scrollTo({
          top: el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2,
          behavior: "smooth",
        });
      }

      window.setTimeout(() => {
        isScrollingProgrammatically.current = false;
      }, 1000);
    },
    [focusGlobe, locations],
  );

  const handleScroll = React.useCallback(() => {
    const container = scrollContainerRef.current;
    if (isScrollingProgrammatically.current || !container) return;

    const containerRect = container.getBoundingClientRect();
    const containerCenter = container.clientHeight / 2;
    let closestLocation: GlobeLocation | null = null;
    let minDistance = Number.POSITIVE_INFINITY;

    for (const location of locations) {
      const element = locationRefs.current[location.id];
      if (!element) continue;

      const rect = element.getBoundingClientRect();
      const elementCenter = rect.top - containerRect.top + rect.height / 2;
      const distance = Math.abs(elementCenter - containerCenter);

      if (distance < minDistance) {
        minDistance = distance;
        closestLocation = location;
      }
    }

    if (closestLocation && closestLocation.id !== activeLocationId) {
      setActiveLocationId(closestLocation.id);
      setSelectedLocation(null);
      focusGlobe(closestLocation, 500);
    }
  }, [activeLocationId, focusGlobe, locations]);

  const copyToClipboard = React.useCallback((text: string, field: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(null), 1800);
    });
  }, []);

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative flex h-[680px] w-full overflow-hidden border border-hair bg-ink text-paper",
        className,
      )}
    >
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        data-lenis-prevent
        className="relative z-10 flex w-[42%] min-w-[220px] max-w-[520px] flex-col items-start justify-start overflow-y-auto px-5 [scrollbar-width:none] sm:px-8 md:min-w-[280px] md:px-12 lg:px-16 [&::-webkit-scrollbar]:hidden"
      >
        {/* spacers let the first and last place scroll to the middle */}
        <div aria-hidden className="h-[45%] shrink-0" />
        {locations.map((location, i) => {
          const isActive = activeLocationId === location.id;
          const isSelected = selectedLocation?.id === location.id;

          return (
            <button
              key={location.id}
              ref={(el) => {
                locationRefs.current[location.id] = el;
              }}
              type="button"
              data-cursor="View"
              onClick={(event) => handleLocationClick(location, event)}
              className={cn(
                "relative shrink-0 py-2 text-left transition-all duration-500 ease-out focus-visible:outline-none md:py-3",
                isActive
                  ? "translate-x-1 text-signal"
                  : "text-paper/20 hover:text-paper/45",
              )}
            >
              <span className="label block text-[10px] opacity-70">
                {String(i + 1).padStart(2, "0")}
                {location.subtitle ? ` — ${location.subtitle}` : ""}
              </span>
              <span className="font-display relative flex items-center gap-3 text-[clamp(2rem,4vw,3.6rem)] leading-[1.05]">
                {location.name}
                {isActive && isSelected && (
                  <span className="flex items-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="-ml-3" aria-hidden>
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                  </span>
                )}
              </span>
            </button>
          );
        })}
        <div aria-hidden className="h-[45%] shrink-0" />
      </div>

      <div
        ref={containerRef}
        className="absolute inset-0 flex items-center justify-center md:relative md:flex-1"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink via-ink/90 to-transparent md:hidden" />
        <div className="pointer-events-auto relative">
          <div className="absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-1/2 h-[80%] w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(95,180,255,0.12),transparent)]" />
          </div>
          <Globe
            ref={globeRef}
            width={globeSize}
            height={globeSize}
            globeImageUrl={globeTextureUrl}
            bumpImageUrl={bumpTextureUrl}
            backgroundColor="rgba(0,0,0,0)"
            atmosphereColor="#5fb4ff"
            atmosphereAltitude={0.18}
            pointsData={locations}
            pointLat="lat"
            pointLng="lng"
            pointColor={() => accentColor}
            pointAltitude={0.01}
            pointRadius={0.5}
            pointLabel={() => ""}
            ringsData={rings}
            ringLat="lat"
            ringLng="lng"
            ringColor={() => (t: number) => `rgba(198,255,61,${1 - t})`}
            ringMaxRadius={4}
            ringPropagationSpeed={2}
            ringRepeatPeriod={900}
            onGlobeReady={handleGlobeReady}
            onPointClick={handlePointClick}
            enablePointerInteraction
            animateIn
          />
        </div>
      </div>

      {selectedLocation && (
        <>
          <button
            type="button"
            aria-label="Close location details"
            className="fixed inset-0 z-40 cursor-default bg-black/20"
            onClick={() => setSelectedLocation(null)}
          />

          <div
            className={cn(
              "fixed z-50 w-72 overflow-hidden border border-hair bg-ink shadow-2xl shadow-black/60 md:w-80",
              tooltipPosition.mobile && "left-1/2 top-auto bottom-5",
            )}
            style={
              tooltipPosition.mobile
                ? { transform: "translateX(-50%)" }
                : {
                    left: `${tooltipPosition.x}px`,
                    top: `${tooltipPosition.y}px`,
                    transform: "translateY(-50%)",
                  }
            }
          >
            {selectedLocation.image ? (
              <button
                type="button"
                data-cursor="Open"
                onClick={() => onOpenImage?.(selectedLocation)}
                className="group relative block aspect-[3/2] w-full overflow-hidden bg-black"
                aria-label={`Open ${selectedLocation.image.alt}`}
              >
                <img
                  src={selectedLocation.image.src}
                  alt={selectedLocation.image.alt}
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />
                <span className="label absolute bottom-0 left-0 flex items-center gap-1.5 bg-ink px-2 py-1 text-[9px] text-signal">
                  <Maximize2 className="size-3" /> {selectedLocation.name}
                </span>
              </button>
            ) : null}
            {selectedLocation.details?.map((d, i) => (
              <LocationDetailRow
                key={d.label}
                label={d.label}
                value={d.value}
                accent={i === 0}
                copied={copiedField === d.label}
                onCopy={d.copy ? () => copyToClipboard(d.value, d.label) : undefined}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function LocationDetailRow({
  label,
  value,
  copied,
  accent,
  onCopy,
}: {
  label: string;
  value: string;
  copied: boolean;
  accent?: boolean;
  onCopy?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-hair px-4 py-3 first:border-t-0">
      <span className="min-w-0">
        <span className="label block text-[10px] text-paper/40">{label}</span>
        <span className={cn("block text-sm leading-relaxed text-paper/80", accent && "text-signal")}>
          {value}
        </span>
      </span>
      {onCopy ? (
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Copy ${label.toLowerCase()}`}
          className="h-8 w-8 shrink-0 rounded-none text-paper/40 transition-colors hover:bg-paper/10 hover:text-paper"
          onClick={onCopy}
        >
          {copied ? <Check className="h-4 w-4 text-signal" /> : <Copy className="h-4 w-4" />}
        </Button>
      ) : null}
    </div>
  );
}

export default InteractiveGlobeExplorer;
