import type { Metadata } from 'next'
import { QrStudio } from '@/components/qr-studio'

export const metadata: Metadata = {
  title: 'Table QR Studio — Fornello Pizza',
  description: 'Generate print-ready QR cards for Fornello tables and the takeaway counter.',
  robots: { index: false, follow: false },
}

export default function QrPage() {
  return <QrStudio />
}
