'use client'

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { bindTableOrder } from '@/lib/floor'
import { STRINGS, type Strings } from '@/lib/i18n'
import { getMergedMenu, type Lang, type MenuItem } from '@/lib/menu'
import { cartTotal, orderQuery, type CartLine, type Mode, type OrderParams, type Pacing, type Selections } from '@/lib/order'

export type PastOrder = {
  id: string
  orderRef: string
  timestamp: string
  mode: Mode
  table: number | null
  lines: CartLine[]
  total: number
}

type OrderContextValue = {
  lang: Lang
  t: Strings
  mode: Mode
  table: number | null
  lines: CartLine[]
  pacing: Pacing
  customerName: string
  customerPhone: string
  note: string
  orderRef: string
  menu: (MenuItem & { soldOut?: boolean; custom?: boolean })[]
  pastOrders: PastOrder[]
  editingLine: CartLine | null
  setLang: (lang: Lang) => void
  setMode: (mode: Mode) => void
  setTable: (table: number | null) => void
  addLine: (item: MenuItem, selections: Selections, qty: number, notes?: string) => void
  updateLine: (uid: string, selections: Selections, qty: number, notes?: string) => void
  setQty: (uid: string, qty: number) => void
  clearOrder: () => void
  clearOrderHistory: () => void
  setPacing: (pacing: Pacing) => void
  setCustomerName: (name: string) => void
  setCustomerPhone: (phone: string) => void
  setNote: (note: string) => void
  setEditingLine: (line: CartLine | null) => void
  reorderPastOrder: (order: PastOrder) => void
  saveCompletedOrder: () => void
  showToast: (msg: string) => void
}

const OrderContext = createContext<OrderContextValue | null>(null)

export function useOrder(): OrderContextValue {
  const value = useContext(OrderContext)
  if (!value) throw new Error('useOrder must be used inside OrderProvider')
  return value
}

const generateOrderRef = () => `F-${Math.floor(1000 + Math.random() * 9000)}`

export function OrderProvider({ initial, children }: { initial: OrderParams; children: ReactNode }) {
  const [params, setParams] = useState<OrderParams>(initial)
  const [lines, setLines] = useState<CartLine[]>([])
  const [pacing, setPacing] = useState<Pacing>('together')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [note, setNote] = useState('')
  const [orderRef, setOrderRef] = useState(generateOrderRef)
  const [menu, setMenu] = useState(() => getMergedMenu())
  const [pastOrders, setPastOrders] = useState<PastOrder[]>([])
  const [editingLine, setEditingLine] = useState<CartLine | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const hasHydratedCartRef = useRef(false)
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null)

  const showToast = (msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast(msg)
    toastTimerRef.current = setTimeout(() => {
      setToast(null)
    }, 2800)
  }

  // Load past orders from localStorage safely after mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('fornello_order_history_v1')
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory)
        if (Array.isArray(parsed)) setPastOrders(parsed)
      }
    } catch {}
  }, [])

  // Listen for menu updates from staff admin studio or storage
  useEffect(() => {
    const onMenuUpdate = () => setMenu(getMergedMenu())
    window.addEventListener('fornello_menu_updated', onMenuUpdate)
    window.addEventListener('storage', onMenuUpdate)
    return () => {
      window.removeEventListener('fornello_menu_updated', onMenuUpdate)
      window.removeEventListener('storage', onMenuUpdate)
    }
  }, [])

  // Restore cart from localStorage safely after mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('fornello_cart_v1')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLines(parsed)
        }
      }
    } catch {
      // ignore in incognito or blocked storage
    } finally {
      hasHydratedCartRef.current = true
    }
  }, [])

  // Persist cart to localStorage on changes after hydration
  useEffect(() => {
    if (!hasHydratedCartRef.current) return
    try {
      localStorage.setItem('fornello_cart_v1', JSON.stringify(lines))
    } catch {
      // ignore
    }
  }, [lines])

  useEffect(() => {
    document.documentElement.lang = params.lang
    document.documentElement.dir = params.lang === 'ckb' ? 'rtl' : 'ltr'
  }, [params.lang])

  const update = (patch: Partial<OrderParams>) => {
    const next = { ...params, ...patch }
    setParams(next)
    window.history.replaceState(null, '', orderQuery(next))
  }

  const addLine = (item: MenuItem, selections: Selections, qty: number, lineNotes?: string) => {
    const signature = JSON.stringify(selections)
    const trimmedNotes = lineNotes?.trim() || undefined
    setLines((prev) => {
      const match = prev.find(
        (l) => l.itemId === item.id && JSON.stringify(l.selections) === signature && l.notes === trimmedNotes,
      )
      if (match) return prev.map((l) => (l === match ? { ...l, qty: l.qty + qty } : l))
      return [...prev, { uid: crypto.randomUUID(), itemId: item.id, qty, selections, notes: trimmedNotes }]
    })
    showToast(STRINGS[params.lang].itemAddedToast(item.name, qty))
  }

  const updateLine = (uid: string, selections: Selections, qty: number, lineNotes?: string) => {
    const trimmedNotes = lineNotes?.trim() || undefined
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.uid !== uid)
        : prev.map((l) => (l.uid === uid ? { ...l, selections, qty, notes: trimmedNotes } : l)),
    )
    const line = lines.find((l) => l.uid === uid)
    if (line) {
      const item = menu.find((m) => m.id === line.itemId)
      if (item) showToast(STRINGS[params.lang].itemUpdatedToast(item.name))
    }
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
    setOrderRef(generateOrderRef())
    try {
      localStorage.removeItem('fornello_cart_v1')
    } catch {}
  }

  const clearOrderHistory = () => {
    setPastOrders([])
    try {
      localStorage.removeItem('fornello_order_history_v1')
    } catch {}
  }

  const saveCompletedOrder = () => {
    if (lines.length === 0) return
    const newRecord: PastOrder = {
      id: crypto.randomUUID(),
      orderRef,
      timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      mode: params.mode,
      table: params.table,
      lines: [...lines],
      total: cartTotal(lines),
    }
    const updated = [newRecord, ...pastOrders.slice(0, 9)]
    setPastOrders(updated)
    if (params.mode === 'dine-in' && params.table) {
      bindTableOrder(params.table, orderRef, lines, cartTotal(lines))
    }
    try {
      localStorage.setItem('fornello_order_history_v1', JSON.stringify(updated))
    } catch {}
  }

  const reorderPastOrder = (past: PastOrder) => {
    setLines(past.lines)
    if (past.mode) update({ mode: past.mode, table: past.table })
    showToast(STRINGS[params.lang].reorderedToast)
  }

  const value: OrderContextValue = {
    ...params,
    t: STRINGS[params.lang],
    lines,
    pacing,
    customerName,
    customerPhone,
    note,
    orderRef,
    menu,
    pastOrders,
    editingLine,
    setLang: (lang) => update({ lang }),
    setMode: (mode) => update({ mode }),
    setTable: (table) => update({ table }),
    addLine,
    updateLine,
    setQty,
    clearOrder,
    clearOrderHistory,
    setPacing,
    setCustomerName,
    setCustomerPhone,
    setNote,
    setEditingLine,
    reorderPastOrder,
    saveCompletedOrder,
    showToast,
  }

  return (
    <OrderContext.Provider value={value}>
      <div id="top" lang={params.lang} dir={params.lang === 'ckb' ? 'rtl' : 'ltr'} className="min-h-dvh">
        {children}
        {toast ? (
          <aside
            role="status"
            aria-live="polite"
            className="fixed top-16 start-1/2 z-50 -translate-x-1/2 rounded-full border border-primary/40 bg-card/95 px-5 py-2.5 text-center text-sm font-medium text-foreground shadow-2xl backdrop-blur animate-in fade-in-0 slide-in-from-top-4 duration-200"
          >
            {toast}
          </aside>
        ) : null}
      </div>
    </OrderContext.Provider>
  )
}
