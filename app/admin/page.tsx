import type { Metadata } from 'next'
import { MenuManager } from '@/components/menu-manager'

export const metadata: Metadata = {
  title: 'Menu Studio — Fornello Pizza',
  description: 'Staff menu management studio for Fornello Pizza.',
  robots: { index: false, follow: false },
}

export default function AdminPage() {
  return <MenuManager />
}

