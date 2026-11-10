import type { Metadata } from 'next'
import { WaiterFloor } from '@/components/waiter-floor'

export const metadata: Metadata = {
  title: 'Live Floor & Table Monitor — Fornello Pizza',
  description: 'Real-time table orders, active bills, and service alerts across all 25 tables.',
  robots: { index: false, follow: false },
}

export default function FloorPage() {
  return <WaiterFloor />
}
