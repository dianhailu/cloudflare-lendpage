import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'PinGo - Pinjaman Online Cepat | Download APK',
  description: 'Download PinGo - Aplikasi pinjaman online terpercaya dengan bunga rendah, proses cepat, dan limit hingga Rp 100 juta. Beroperasi dengan standar keamanan tinggi dan sesuai regulasi keuangan.',
  keywords: ['pinjaman online', 'pinjaman tunai', 'kredit cepat', 'download pingo', 'fintech indonesia', 'pinjaman tanpa jaminan'],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#ffffff',
}

export default function DownloadLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
