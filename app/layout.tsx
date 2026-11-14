import type { Metadata, Viewport } from "next"
import { Anton, Geist, Geist_Mono } from "next/font/google"
import "./globals.css"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })
const anton = Anton({ variable: "--font-anton", weight: "400", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Harshvardhan Bhusari — Photography",
  description:
    "Field notes from fifteen years of chasing light. Mountains, coastlines, gigs and golden hours, shot on a Sony α7R III and a Nikon D3100.",
  openGraph: { title: "Harshvardhan Bhusari — Photography", description: "Two cameras. One eye." },
}

export const viewport: Viewport = { themeColor: "#060607" }

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${anton.variable} dark`}>
      <body className="min-h-svh">
        {children}
        <div className="grain" aria-hidden />
      </body>
    </html>
  )
}
