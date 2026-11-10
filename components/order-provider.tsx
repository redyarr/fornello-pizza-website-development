'use client'

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { bindTableOrder } from '@/lib/floor'
import { STRINGS, type Strings } from '@/lib/i18n'
import { getMergedMenu, type Lang, type MenuItem } from '@/lib/menu'
import { cartTotal, orderQuery, type CartLine, type Mode, type OrderParams, type Pacing, type Selections } from '@/lib/order'
import { playSuccessChime } from '@/lib/sound'
import { generateTableSignature, verifyTableSignature } from '@/lib/table-token'

export type PastOrder = {
  id: string
  orderRef: string
  timestamp: string
  mode: Mode
  table: number | null
  lines: CartLine[]
  total: number
}

export type PlacedOrder = {
  id: string
  orderRef: string
  mode: Mode
  table: number | null
  lines: CartLine[]
  total: number
  pacing: Pacing
  customerName: string
  customerPhone: string
  note: string
  timestamp: string
  createdAt: number
}

type OrderContextValue = {
  lang: Lang
  t: Strings
  mode: Mode
  table: number | null
  isTableVerified: boolean
  verifiedTable: number | null
  lines: CartLine[]
  pacing: Pacing
  customerName: string
  customerPhone: string
  note: string
  orderRef: string
  activePlacedOrder: PlacedOrder | null
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
  placeOrder: () => PlacedOrder | null
  clearActivePlacedOrder: () => void
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
  const [verifiedTable, setVerifiedTable] = useState<number | null>(initial.table)
  const [lines, setLines] = useState<CartLine[]>([])
  const [pacing, setPacing] = useState<Pacing>('together')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [note, setNote] = useState('')
  const [orderRef, setOrderRef] = useState(generateOrderRef)
  const [menu, setMenu] = useState(() => getMergedMenu())
  const [pastOrders, setPastOrders] = useState<PastOrder[]>([])
  const [activePlacedOrder, setActivePlacedOrder] = useState<PlacedOrder | null>(null)
  const [editingLine, setEditingLine] = useState<CartLine | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [isOffline, setIsOffline] = useState(false)
  const hasHydratedCartRef = useRef(false)
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Sync and persist verified table session
  useEffect(() => {
    if (initial.table) {
      setVerifiedTable(initial.table)
      try {
        sessionStorage.setItem(
          'fornello_table_verified_v1',
          JSON.stringify({ table: initial.table, sig: generateTableSignature(initial.table) }),
        )
      } catch {}
    } else {
      try {
        const stored = sessionStorage.getItem('fornello_table_verified_v1')
        if (stored) {
          const parsed = JSON.parse(stored)
          if (parsed && typeof parsed.table === 'number' && verifyTableSignature(parsed.table, parsed.sig)) {
            setVerifiedTable(parsed.table)
            setParams((prev) => ({ ...prev, mode: 'dine-in', table: parsed.table }))
          }
        }
      } catch {}
    }
  }, [initial.table])

  // Register PWA offline service worker
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  // Track online/offline status
  useEffect(() => {
    if (typeof window === 'undefined') return
    const updateOnline = () => setIsOffline(!navigator.onLine)
    window.addEventListener('online', updateOnline)
    window.addEventListener('offline', updateOnline)
    updateOnline()
    return () => {
      window.removeEventListener('online', updateOnline)
      window.removeEventListener('offline', updateOnline)
    }
  }, [])

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

  // Load active placed order from localStorage safely after mount
  useEffect(() => {
    try {
      const savedPlaced = localStorage.getItem('fornello_placed_order_v1')
      if (savedPlaced) {
        const parsed = JSON.parse(savedPlaced) as PlacedOrder
        if (parsed && typeof parsed === 'object') {
          // Keep active for 4 hours
          if (Date.now() - (parsed.createdAt || 0) < 14400000) {
            setActivePlacedOrder(parsed)
          } else {
            localStorage.removeItem('fornello_placed_order_v1')
          }
        }
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
    // Enforce verified table constraints
    if (next.mode === 'dine-in' && (!verifiedTable || next.table !== verifiedTable)) {
      next.mode = 'takeaway'
      next.table = null
    }
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

  const placeOrder = (): PlacedOrder | null => {
    if (lines.length === 0) return null
    const orderTotal = cartTotal(lines)
    const newRecord: PlacedOrder = {
      id: crypto.randomUUID(),
      orderRef,
      mode: params.mode,
      table: params.table,
      lines: [...lines],
      total: orderTotal,
      pacing,
      customerName,
      customerPhone,
      note,
      timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      createdAt: Date.now(),
    }

    if (params.mode === 'dine-in' && params.table) {
      bindTableOrder(params.table, orderRef, lines, orderTotal)
    }

    const updated = [newRecord, ...pastOrders.slice(0, 9)]
    setPastOrders(updated)
    try {
      localStorage.setItem('fornello_order_history_v1', JSON.stringify(updated))
      localStorage.setItem('fornello_placed_order_v1', JSON.stringify(newRecord))
      localStorage.removeItem('fornello_cart_v1')
    } catch {}

    setActivePlacedOrder(newRecord)
    setLines([])
    setOrderRef(generateOrderRef())
    playSuccessChime()
    showToast(STRINGS[params.lang].orderPlacedNotice)
    return newRecord
  }

  const clearActivePlacedOrder = () => {
    setActivePlacedOrder(null)
    try {
      localStorage.removeItem('fornello_placed_order_v1')
    } catch {}
  }

  const isTableVerified = verifiedTable !== null && params.table === verifiedTable && params.mode === 'dine-in'

  const value: OrderContextValue = {
    ...params,
    t: STRINGS[params.lang],
    isTableVerified,
    verifiedTable,
    lines,
    pacing,
    customerName,
    customerPhone,
    note,
    orderRef,
    activePlacedOrder,
    menu,
    pastOrders,
    editingLine,
    setLang: (lang) => update({ lang }),
    setMode: (mode) => {
      if (mode === 'dine-in' && !verifiedTable) {
        showToast(STRINGS[params.lang].dineInQrOnly)
        return
      }
      update({ mode, table: mode === 'dine-in' ? verifiedTable : null })
    },
    setTable: (table) => {
      if (table === null) {
        update({ table: null, mode: 'takeaway' })
        return
      }
      if (table !== verifiedTable) {
        showToast(STRINGS[params.lang].tableLockedNotice)
        return
      }
      update({ table: verifiedTable, mode: 'dine-in' })
    },
    addLine,
    updateLine,
    setQty,
    clearOrder,
    clearOrderHistory,
    placeOrder,
    clearActivePlacedOrder,
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
        {isOffline ? (
          <aside
            role="status"
            aria-live="polite"
            className="fixed bottom-20 start-1/2 z-40 -translate-x-1/2 flex items-center gap-2 rounded-full border border-amber-600/40 bg-amber-500/90 text-amber-950 px-4 py-1.5 text-xs font-semibold shadow-lg backdrop-blur"
          >
            <span className="size-2 rounded-full bg-amber-950 animate-pulse" />
            <span>{params.lang === 'ckb' ? 'دۆخی ئۆفلاین · مینیو و داواکاری بەردەستە' : 'Offline Mode · Menu & Ordering Active'}</span>
          </aside>
        ) : null}
      </div>
    </OrderContext.Provider>
  )
}
