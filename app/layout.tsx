import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Harshvardhan Bhusari · Photography",
  description: "Two cameras, fifteen years of chasing light. A photography portfolio shot on a Sony α7R III and a Nikon D3100.",
}

export const viewport: Viewport = {
  themeColor: "#050505",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark antialiased`}
    >
      <body className="min-h-svh bg-[#050505] text-[#f4f2ee]">
        {children}
        <div className="grain" aria-hidden />
      </body>
    </html>
  )
}
