import { OTHER_PHOTOS, CAMERAS, type Photo } from "./photos"

/** Places with a confidently identified landmark in the photos. Coordinates are approximate. */
export type Place = {
  name: string
  region: string
  coords: string
  elevation: string
  year: string
  body: string
  photo: Photo
}

const find = (slug: string): Photo => {
  const all = [...CAMERAS.sony.photos, ...CAMERAS.nikon.photos, ...OTHER_PHOTOS]
  const p = all.find((x) => x.slug === slug)
  if (!p) throw new Error("missing photo " + slug)
  return p
}

export const PLACES: Place[] = [
  { name: "Bali", region: "Indonesia", coords: "08.81°S 115.17°E", elevation: "263 m", year: "2019", body: "Sony α7R III", photo: find("dsc00573") },
  { name: "Kathmandu", region: "Nepal", coords: "27.72°N 085.36°E", elevation: "1,400 m", year: "2023", body: "Sony α7R III", photo: find("dsc00506") },
  { name: "Niagara", region: "North America", coords: "43.08°N 079.07°W", elevation: "99 m", year: "—", body: "Nikon D3100", photo: find("wa-19-40-43-1") },
  { name: "San Francisco", region: "United States", coords: "37.82°N 122.48°W", elevation: "67 m", year: "2016", body: "iPhone 6s", photo: find("img-3018") },
  { name: "Singapore", region: "Gardens by the Bay", coords: "01.28°N 103.86°E", elevation: "15 m", year: "2019", body: "Galaxy Note 9", photo: find("20190720-194945") },
]

/** A hand-picked run for the "Selected works" reel. */
export const SELECTED: { photo: Photo; body: string; note: string }[] = [
  { photo: find("dsc00604"), body: "Sony α7R III", note: "Swell against the cliffs" },
  { photo: find("dsc00184"), body: "Sony α7R III", note: "One spotlight, one shot" },
  { photo: find("wa-05-19-23"), body: "Nikon D3100", note: "Held my breath" },
  { photo: find("dsc08407"), body: "Sony α7R III", note: "Fog, then a temple" },
  { photo: find("dsc01677"), body: "Sony α7R III", note: "Glass-still water" },
  { photo: find("wa-05-37-54"), body: "Nikon D3100", note: "Bay on fire" },
  { photo: find("dsc00502"), body: "Sony α7R III", note: "Prayer flags, straight up" },
  { photo: find("dsc05033"), body: "Sony α7R III", note: "Last light on the range" },
]
