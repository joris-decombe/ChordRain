import type { Metadata, Viewport } from "next";
// Fonts are bundled via @fontsource — no CDN, no runtime network requests.
import "@fontsource/pixelify-sans/400.css";
import "@fontsource/pixelify-sans/500.css";
import "@fontsource/pixelify-sans/600.css";
import "@fontsource/pixelify-sans/700.css";
import "@fontsource/press-start-2p/400.css";
import "./globals.css";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const SITE_URL = "https://joris-decombe.github.io/ChordRain";

export const metadata: Metadata = {
  title: "ChordRain — Interactive Guitar Trainer",
  description:
    "Learn guitar with a Guitar Hero-style falling-note fretboard. Free, open-source trainer supporting MIDI and Guitar Pro files with real guitar samples.",
  keywords: [
    "guitar",
    "learn guitar",
    "guitar trainer",
    "MIDI player",
    "fretboard",
    "Guitar Pro",
    "music education",
    "interactive guitar",
    "guitar tabs",
    "open source guitar",
  ],
  authors: [{ name: "joris-decombe", url: "https://github.com/joris-decombe" }],
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "ChordRain",
    title: "ChordRain — Interactive Guitar Trainer",
    description:
      "Guitar Hero-style falling-note guitar trainer. Play along with MIDI or Guitar Pro files. Free and open source.",
    images: [
      {
        url: `${SITE_URL}/icon-512.png`,
        width: 512,
        height: 512,
        alt: "ChordRain app icon",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "ChordRain — Interactive Guitar Trainer",
    description:
      "Free open-source guitar trainer with Guitar Hero-style falling notes. MIDI and Guitar Pro support.",
    images: [`${SITE_URL}/icon-512.png`],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: "#0f172a",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "ChordRain",
  description:
    "Free, open-source interactive guitar trainer with Guitar Hero-style falling-note fretboard. Supports MIDI and Guitar Pro files.",
  url: SITE_URL,
  applicationCategory: "MusicApplication",
  operatingSystem: "Web",
  browserRequirements: "Requires a modern browser with Web Audio API support",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  codeRepository: "https://github.com/joris-decombe/ChordRain",
  license: "https://opensource.org/licenses/MIT",
  creator: {
    "@type": "Person",
    name: "joris-decombe",
    url: "https://github.com/joris-decombe",
  },
  featureList: [
    "MIDI file playback",
    "Guitar Pro file support",
    "Falling-note fretboard visualization",
    "Speed control",
    "Loop sections",
    "Per-string color coding",
    "Multiple visual themes",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; media-src 'self' data: blob:; worker-src 'self' blob:; connect-src 'self';"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body suppressHydrationWarning>
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
