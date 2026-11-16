import { SiteChrome } from "@/components/site-chrome"
import { Hero } from "@/components/sections/hero"
import { SelectedWorks } from "@/components/sections/selected-works"
import { Places } from "@/components/sections/places"
import { Experience } from "@/components/experience"
import { About } from "@/components/sections/about"
import { PhotoGallery } from "@/components/sections/photo-gallery"
import { Contact } from "@/components/sections/contact"

/*
 * Order matters: the two Sketchfab camera models are the slowest thing on the page, so the
 * cameras section sits third. They start downloading at page load and are ready by the time
 * a visitor scrolls past the selected works and places.
 */
export default function Home() {
  return (
    <>
      <SiteChrome />
      <main className="relative">
        <Hero />
        <SelectedWorks />
        <Places />
        <Experience />
        <About />
        <PhotoGallery />
      </main>
      <Contact />
    </>
  )
}
