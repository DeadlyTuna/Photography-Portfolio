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
      <head>
        {/* The intro plays from the top: don't let the browser restore an old scroll position. */}
        <script dangerouslySetInnerHTML={{ __html: "history.scrollRestoration='manual';scrollTo(0,0)" }} />
        {/* Warm up Sketchfab before React even mounts: the 3D models are the slowest thing on the page. */}
        <link rel="preconnect" href="https://sketchfab.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://static.sketchfab.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://media.sketchfab.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://media.sketchfab.com" />
        <link rel="preload" as="script" href="https://static.sketchfab.com/api/sketchfab-viewer-1.12.1.js" />
      </head>
      <body className="min-h-svh">
        {children}
        <div className="grain" aria-hidden />
      </body>
    </html>
  )
}
