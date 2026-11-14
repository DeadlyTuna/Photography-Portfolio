import { SiteChrome } from "@/components/site-chrome"
import { Experience } from "@/components/experience"
import { SelectedWorks } from "@/components/sections/selected-works"
import { Places } from "@/components/sections/places"
import { About } from "@/components/sections/about"
import { PhoneRoll } from "@/components/sections/phone-roll"
import { Contact } from "@/components/sections/contact"

export default function Home() {
  return (
    <>
      <SiteChrome />
      <main className="relative">
        <Experience />
        <SelectedWorks />
        <Places />
        <About />
        <PhoneRoll />
      </main>
      <Contact />
    </>
  )
}
