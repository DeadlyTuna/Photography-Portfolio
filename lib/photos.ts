import { PHOTO_META } from "./photo-meta"

export type CameraId = "sony" | "nikon"

export type Photo = {
  slug: string
  src: string
  thumb: string
  w: number
  h: number
  title: string
  exif?: string
}

function photo(slug: string, title: string): Photo {
  const m = PHOTO_META[slug]
  return {
    slug,
    src: `/photos/${slug}.jpg`,
    thumb: `/photos/thumb/${slug}.jpg`,
    w: m?.w ?? 1600,
    h: m?.h ?? 1067,
    title,
    exif: m?.exif,
  }
}

// ---------------------------------------------------------------- Sony α7R III
const S = {
  concert: photo("dsc00184", "Under one spotlight"),
  blue: photo("dsc00218", "Blue hour, on stage"),
  violet: photo("dsc00230", "Violet flare"),
  stupaUp: photo("dsc00502", "Boudhanath, looking up"),
  stupa: photo("dsc00506", "Prayer flags at Boudhanath"),
  garuda: photo("dsc00573", "Garuda in the clouds, Bali"),
  cliffs: photo("dsc00604", "Where the cliffs meet the swell, Bali"),
  ridges: photo("dsc00855", "Layers of blue"),
  lake: photo("dsc01677", "Still water, sharp peaks"),
  sunset: photo("dsc05033", "Sun dropping behind the range"),
  temple: photo("dsc08407", "Temple in the clouds"),
  path: photo("dsc08537", "Moss and fog"),
  wall: photo("dsc09018", "Along the ridge"),
  falls: photo("dsc09399", "Little falls in the forest"),
}

// ---------------------------------------------------------------- Nikon D3100
const N = {
  first: photo("dsc-0342", "2011, where it all started"),
  tiger: photo("wa-05-19-23", "Eyes in the grass"),
  beach: photo("wa-05-19-12", "Last light, first wave"),
  niagara: photo("wa-19-40-43-1", "Niagara mist"),
  fireworks: photo("wa-05-37-54", "Fireworks over the bay"),
  statue: photo("wa-19-40-42-5", "Silhouette at sundown"),
  bridge: photo("wa-19-40-43", "Bridge over blue water"),
  moon: photo("wa-05-19-14", "A cloud, and a moon"),
  coast: photo("wa-19-40-43-2", "Coastline, winding"),
  hills: photo("wa-19-40-42", "Hazy hills"),
  park: photo("wa-05-19-11", "Sun through the trees"),
  dusk: photo("wa-19-40-35", "City at dusk"),
  rocks: photo("wa-19-40-444", "Rocks and surf"),
  calm: photo("wa-19-57-29", "Morning, flat calm"),
  window: photo("wa-20-02-02-1", "Window seat sunset"),
  wing: photo("wa-05-19-13", "Red wing, night flight"),
  dad: photo("wa-19-40-44", "Up on dad's shoulders"),
}

// ---------------------------------------------------------------- Everything else
export const OTHER_PHOTOS: Photo[] = [
  photo("20181226-171143", "Dune lines"),
  photo("img-3018", "Fog over the Golden Gate"),
  photo("20190111-173706", "Heart at sunset"),
  photo("img-3310", "Coastal highway"),
  photo("20190720-194945", "Neon trees"),
  photo("dsc-5733", "Stripes"),
  photo("img-20231020-070932", "Mirror lake"),
  photo("20190714-175520", "Cliff edge"),
  photo("img-1083", "Falls at night"),
  photo("20220523-185158", "Snow peaks at golden hour"),
  photo("img-3125", "Autumn forest floor"),
  photo("img-20160428-185125-hdr", "City from above"),
  photo("img-6252", "Valley town"),
  photo("img-3127", "Wet road, tall pines"),
  photo("img-20231021-171136", "Evening over the hills"),
  photo("20181226-172717", "Crater in the sand"),
]

export const ME_PHOTO = photo("me-taking-the-pics", "Me, taking the pics")

export type CameraInfo = {
  id: CameraId
  name: string
  short: string
  tagline: string
  specs: string[]
  accent: string
  background: string
  photos: Photo[]
  screen: string
}

export const CAMERAS: Record<CameraId, CameraInfo> = {
  sony: {
    id: "sony",
    name: "Sony α7R III",
    short: "α7R III",
    tagline: "42MP full-frame mirrorless · FE 24–70mm f/2.8 GM",
    specs: ["42.4 MP", "Full frame", "FE 24–70 GM"],
    accent: "#f0782d",
    background: "radial-gradient(120% 80% at 50% 35%,#2a2522 0%,#1c1917 55%,#0f0d0c 100%)",
    photos: Object.values(S),
    screen: S.cliffs.thumb,
  },
  nikon: {
    id: "nikon",
    name: "Nikon D3100",
    short: "D3100",
    tagline: "14MP DX-format DSLR · where it all started",
    specs: ["14.2 MP", "DX format", "AF-S 18–55"],
    accent: "#f5c518",
    background: "radial-gradient(120% 80% at 50% 35%,#26261f 0%,#1a1a16 55%,#0e0e0c 100%)",
    photos: Object.values(N),
    screen: N.niagara.thumb,
  },
}

export const ALL_LIGHTBOX = (id: CameraId) => CAMERAS[id].photos
