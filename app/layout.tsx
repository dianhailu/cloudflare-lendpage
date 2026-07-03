import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

// Use system fonts for maximum compatibility in Indonesia
// Google Fonts can be slow/unreliable on Indonesian networks

export const metadata: Metadata = {
  title: 'PinGo - Pinjaman Tunai Cepat & Mudah',
  description: 'Dapatkan pinjaman tunai hingga Rp 10.000.000 dalam hitungan menit. Proses cepat, bunga rendah, tanpa jaminan.',
  generator: 'v0.app',
  keywords: ['pinjaman online', 'pinjaman tunai', 'kredit cepat', 'pinjaman tanpa jaminan', 'fintech indonesia'],
  icons: {
    icon: '/images/pingo-logo.jpg',
    apple: '/images/pingo-logo.jpg',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#22c55e',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
      </head>
      <body>
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
