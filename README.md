# Field Notes — Harshvardhan Bhusari

A photography portfolio covering fifteen years of shooting, from a Nikon D3100 in 2011 to a Sony α7R III today. It is a single scrolling page built with Next.js, with 3D cameras you can pick up and look through, a globe of the places I've shot, and a drifting 3D gallery.

## The page, top to bottom

| # | Section | What it does |
|---|---------|--------------|
| — | **Hero** | Opens with a shutter, then the name rises in letter by letter over a full-screen slideshow of landscapes. A "Now showing" panel lists each frame's title, camera and EXIF. |
| 01 | **Selected works** | The section pins in place while eight large frames slide sideways as you scroll. On phones it becomes a swipeable row. Click any frame to open it full-size. |
| 02 | **Places** | An interactive globe. Scroll the list to fly to each place, or click a place or a pin for a card with the photo, coordinates, elevation and the camera used. |
| 03 | **Cameras** | Real 3D models of the Sony α7R III and Nikon D3100. Pick one and it turns around and zooms into its own back screen, which opens a circular gallery of that camera's photos. |
| 04 | **About** | Portrait, bio, gear list and count-up stats. |
| 05 | **Phone roll** | The phone photos drift toward you through 3D space. Scroll or use the arrow keys to move through them, click a frame to zoom in, and click it again or press Esc to step back. |
| 06 | **Contact** | A "Let's shoot" marquee, email, a rewind-to-top button and credits. |

The cameras section sits third on purpose. The two Sketchfab models are the slowest thing on the page, so they start downloading as soon as the page opens and are usually ready by the time a visitor scrolls down to them.

The nav bar has section links, a live IST clock, a scroll-progress bar, a full-screen menu on phones and a custom cursor. Smooth scrolling runs across the whole page.

## Running it

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

```bash
npm run build   # production build
npm start       # serve the production build
```

## Tech

- **Next.js 16** (App Router, Turbopack), **React 19**, **TypeScript**
- **Tailwind CSS 4**, with shadcn-style components in `components/ui`
- **Framer Motion** for scroll-linked and entrance animations
- **Lenis** for smooth scrolling
- **Sketchfab Viewer API** for the two 3D camera models
- **react-globe.gl** (three.js) for the Places globe
- **@react-three/fiber** and **drei** for the 3D phone-roll gallery
- **lucide-react** for icons

## Project layout

```
app/
  layout.tsx            fonts, metadata, Sketchfab preconnects
  page.tsx              section order
  globals.css           colour tokens (ink / paper / signal), base styles
components/
  sections/             one file per section (hero, selected-works, places, …)
  experience.tsx        the cameras section: pick a body, fly in, gallery
  sketchfab-camera.tsx  drives the Sketchfab models (calibrated views per camera)
  site-chrome.tsx       nav, clock, progress bar, custom cursor
  shutter.tsx           shutter-blade transition and flash
  lightbox.tsx          full-screen photo viewer
  smooth-scroll.tsx     Lenis setup
  ui/
    interactive-globe-explorer.tsx   Places globe
    3d-gallery-photography.tsx       phone-roll 3D gallery (click to zoom)
    circular-gallery.tsx             per-camera gallery ring
    topo-field.tsx                   animated contour lines (cameras section)
lib/
  site.ts               name, intro, email, years — edit copy here
  photos.ts             every photo, grouped by camera
  photo-meta.ts         sizes and EXIF for each photo
  places.ts             places (with coordinates) and the Selected works list
public/
  photos/               full-size photos, with thumbnails in photos/thumb/
  textures/             Earth textures for the globe
```

## Editing content

- **Name, intro, email and years:** `lib/site.ts`
- **Adding a photo:** put the image in `public/photos/` with a thumbnail in `public/photos/thumb/`, both named `<slug>.jpg`. Add the size and EXIF to `lib/photo-meta.ts`, then list it in `lib/photos.ts` under the right camera or in `OTHER_PHOTOS`.
- **Places:** `lib/places.ts`. Coordinates use the form `"08.81°S 115.17°E"`, and the globe reads its latitude and longitude from that string. Some places are best guesses from the photos and EXIF dates, so correct any that are off.
- **Selected works:** the `SELECTED` list in `lib/places.ts`

## Performance notes

- Every animated canvas (the cameras, the globe, the contour lines and the 3D gallery) pauses when it is scrolled out of view.
- The Sketchfab models request textures capped at 2048px, and the cameras send no updates while idle, so the models stop re-rendering when nothing moves.
- The 3D gallery and the globe use photo thumbnails and cap their render resolution.

## Credits

- Photography: Harshvardhan Bhusari
- 3D models, via [Sketchfab](https://sketchfab.com):
  - "SONY A7R3 camera" by Metazeon, licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
  - "Nikon D3100" by TRIANGLESCAN
- Earth textures: NASA Blue Marble imagery, shipped with [three-globe](https://github.com/vasturiano/three-globe)
- Fonts: Anton, Geist and Geist Mono, via `next/font`
