'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { STRINGS, type Strings } from '@/lib/i18n'
import type { Lang, MenuItem } from '@/lib/menu'
import { orderQuery, type CartLine, type Mode, type OrderParams, type Pacing, type Selections } from '@/lib/order'

type OrderContextValue = {
  lang: Lang
  t: Strings
  mode: Mode
  table: number | null
  lines: CartLine[]
  pacing: Pacing
  customerName: string
  note: string
  setLang: (lang: Lang) => void
  setMode: (mode: Mode) => void
  setTable: (table: number | null) => void
  addLine: (item: MenuItem, selections: Selections, qty: number) => void
  setQty: (uid: string, qty: number) => void
  clearOrder: () => void
  setPacing: (pacing: Pacing) => void
  setCustomerName: (name: string) => void
  setNote: (note: string) => void
}

const OrderContext = createContext<OrderContextValue | null>(null)

export function useOrder(): OrderContextValue {
  const value = useContext(OrderContext)
  if (!value) throw new Error('useOrder must be used inside OrderProvider')
  return value
}

export function OrderProvider({ initial, children }: { initial: OrderParams; children: ReactNode }) {
  const [params, setParams] = useState<OrderParams>(initial)
  const [lines, setLines] = useState<CartLine[]>([])
  const [pacing, setPacing] = useState<Pacing>('together')
  const [customerName, setCustomerName] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    document.documentElement.lang = params.lang
    document.documentElement.dir = params.lang === 'ckb' ? 'rtl' : 'ltr'
  }, [params.lang])

  const update = (patch: Partial<OrderParams>) => {
    const next = { ...params, ...patch }
    setParams(next)
    window.history.replaceState(null, '', orderQuery(next))
  }

  const addLine = (item: MenuItem, selections: Selections, qty: number) => {
    const signature = JSON.stringify(selections)
    setLines((prev) => {
      const match = prev.find((l) => l.itemId === item.id && JSON.stringify(l.selections) === signature)
      if (match) return prev.map((l) => (l === match ? { ...l, qty: l.qty + qty } : l))
      return [...prev, { uid: crypto.randomUUID(), itemId: item.id, qty, selections }]
    })
  }

  const setQty = (uid: string, qty: number) => {
    setLines((prev) =>
      qty <= 0 ? prev.filter((l) => l.uid !== uid) : prev.map((l) => (l.uid === uid ? { ...l, qty } : l)),
    )
  }

  const clearOrder = () => {
    setLines([])
    setNote('')
    setPacing('together')
  }

  const value: OrderContextValue = {
    ...params,
    t: STRINGS[params.lang],
    lines,
    pacing,
    customerName,
    note,
    setLang: (lang) => update({ lang }),
    setMode: (mode) => update({ mode }),
    setTable: (table) => update({ table }),
    addLine,
    setQty,
    clearOrder,
    setPacing,
    setCustomerName,
    setNote,
  }

  return (
    <OrderContext.Provider value={value}>
      <div id="top" lang={params.lang} dir={params.lang === 'ckb' ? 'rtl' : 'ltr'} className="min-h-dvh">
        {children}
      </div>
    </OrderContext.Provider>
  )
}
