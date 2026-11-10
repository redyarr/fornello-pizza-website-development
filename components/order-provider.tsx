'use client'

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { bindTableOrder, getInitialFloorState, getOrCreateDeviceId, rotateDeviceId, syncRemoteFloorState } from '@/lib/floor'
import { STRINGS, type Strings } from '@/lib/i18n'
import { getMergedMenu, syncRemoteMenuData, type Lang, type MenuItem } from '@/lib/menu'
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
  deviceId?: string
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
  deviceId?: string
}

type OrderContextValue = {
  lang: Lang
  t: Strings
  mode: Mode
  table: number | null
  deviceId: string
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
  simulateTableScan: (table: number | null) => void
  simulateNewCustomerPhone: () => void
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
  const [deviceId, setDeviceId] = useState<string>('DEV-INIT')
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

  // Hydrate per-phone cryptographic deviceId on client mount
  useEffect(() => {
    const id = getOrCreateDeviceId()
    setDeviceId(id)
  }, [])

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

  // Load past orders scoped strictly to this phone's deviceId
  useEffect(() => {
    if (deviceId === 'DEV-INIT') return
    try {
      const savedHistory = localStorage.getItem(`fornello_order_history_${deviceId}`)
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory)
        if (Array.isArray(parsed)) setPastOrders(parsed)
      } else {
        setPastOrders([])
      }
    } catch {}
  }, [deviceId])

  // Load active placed order scoped strictly to this phone's deviceId
  // Automatically expires after 45 minutes or if scanning a different table QR code
  useEffect(() => {
    if (deviceId === 'DEV-INIT') return
    try {
      const savedPlaced = localStorage.getItem(`fornello_placed_order_${deviceId}`)
      if (savedPlaced) {
        const parsed = JSON.parse(savedPlaced) as PlacedOrder
        if (parsed && typeof parsed === 'object') {
          const ageMs = Date.now() - (parsed.createdAt || 0)
          const samePhone = !parsed.deviceId || parsed.deviceId === deviceId
          const sameTableOrTakeaway = !initial.table || parsed.table === initial.table
          if (ageMs < 45 * 60 * 1000 && samePhone && sameTableOrTakeaway) {
            setActivePlacedOrder(parsed)
          } else {
            localStorage.removeItem(`fornello_placed_order_${deviceId}`)
            setActivePlacedOrder(null)
          }
        }
      } else {
        setActivePlacedOrder(null)
      }
    } catch {}
  }, [deviceId, initial.table])

  // Hydrate and listen for menu updates from staff admin studio, storage, and live cross-device API
  useEffect(() => {
    const onMenuUpdate = () => setMenu(getMergedMenu())
    onMenuUpdate()
    void syncRemoteMenuData()

    const pollTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      void syncRemoteMenuData()
      void syncRemoteFloorState()
    }, 8000)

    const onVisibilityOrFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void syncRemoteMenuData()
        void syncRemoteFloorState()
      }
    }

    window.addEventListener('fornello_menu_updated', onMenuUpdate)
    window.addEventListener('storage', onMenuUpdate)
    window.addEventListener('focus', onVisibilityOrFocus)
    document.addEventListener('visibilitychange', onVisibilityOrFocus)
    return () => {
      clearInterval(pollTimer)
      window.removeEventListener('fornello_menu_updated', onMenuUpdate)
      window.removeEventListener('storage', onMenuUpdate)
      window.removeEventListener('focus', onVisibilityOrFocus)
      document.removeEventListener('visibilitychange', onVisibilityOrFocus)
    }
  }, [])

  // If staff settles/clears the table on /floor, or if another phone takes over the table, clear this phone's old active ticket
  useEffect(() => {
    const syncFloorClear = () => {
      setActivePlacedOrder((prev) => {
        if (!prev || prev.mode !== 'dine-in' || !prev.table) return prev
        const floor = getInitialFloorState()
        const floorRecord = floor.tables[prev.table]
        const currentDevId = getOrCreateDeviceId()
        if (
          !floorRecord ||
          (floorRecord.deviceId && floorRecord.deviceId !== currentDevId) ||
          floorRecord.orderRef !== prev.orderRef
        ) {
          try {
            localStorage.removeItem(`fornello_placed_order_${currentDevId}`)
          } catch {}
          return null
        }
        return prev
      })
    }
    window.addEventListener('fornello_floor_updated', syncFloorClear)
    window.addEventListener('storage', syncFloorClear)
    return () => {
      window.removeEventListener('fornello_floor_updated', syncFloorClear)
      window.removeEventListener('storage', syncFloorClear)
    }
  }, [])

  // Restore cart scoped strictly to this phone's deviceId (auto-expires after 2 hours so returning next day starts fresh)
  useEffect(() => {
    if (deviceId === 'DEV-INIT') return
    try {
      const saved = localStorage.getItem(`fornello_cart_${deviceId}`)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.lines)) {
          const ageMs = Date.now() - (parsed.updatedAt || 0)
          if (ageMs < 2 * 60 * 60 * 1000 && parsed.lines.length > 0) {
            setLines(parsed.lines)
          } else {
            localStorage.removeItem(`fornello_cart_${deviceId}`)
            setLines([])
          }
        } else {
          localStorage.removeItem(`fornello_cart_${deviceId}`)
          setLines([])
        }
      } else {
        setLines([])
      }
    } catch {
      // ignore in incognito or blocked storage
    } finally {
      hasHydratedCartRef.current = true
    }
  }, [deviceId])

  // Persist cart to localStorage scoped strictly to this phone's deviceId with timestamp
  useEffect(() => {
    if (!hasHydratedCartRef.current || deviceId === 'DEV-INIT') return
    try {
      if (lines.length === 0) {
        localStorage.removeItem(`fornello_cart_${deviceId}`)
      } else {
        localStorage.setItem(
          `fornello_cart_${deviceId}`,
          JSON.stringify({ updatedAt: Date.now(), lines }),
        )
      }
    } catch {
      // ignore
    }
  }, [lines, deviceId])

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
      localStorage.removeItem(`fornello_cart_${deviceId}`)
    } catch {}
  }

  const clearOrderHistory = () => {
    setPastOrders([])
    try {
      localStorage.removeItem(`fornello_order_history_${deviceId}`)
    } catch {}
  }

  const saveCompletedOrder = () => {
    if (lines.length === 0) return
    const activeDevId = deviceId === 'DEV-INIT' ? getOrCreateDeviceId() : deviceId
    const newRecord: PastOrder = {
      id: crypto.randomUUID(),
      orderRef,
      timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      mode: params.mode,
      table: params.table,
      lines: [...lines],
      total: cartTotal(lines),
      deviceId: activeDevId,
    }
    const updated = [newRecord, ...pastOrders.slice(0, 9)]
    setPastOrders(updated)
    if (params.mode === 'dine-in' && params.table) {
      bindTableOrder(params.table, orderRef, lines, cartTotal(lines), activeDevId)
    }
    try {
      localStorage.setItem(`fornello_order_history_${activeDevId}`, JSON.stringify(updated))
    } catch {}
  }

  const reorderPastOrder = (past: PastOrder) => {
    setLines(past.lines)
    if (past.mode) update({ mode: past.mode, table: past.table })
    showToast(STRINGS[params.lang].reorderedToast)
  }

  const placeOrder = (): PlacedOrder | null => {
    if (lines.length === 0) return null
    const activeDevId = deviceId === 'DEV-INIT' ? getOrCreateDeviceId() : deviceId
    const orderTotal = cartTotal(lines)

    // Check if this same phone already has an active dine-in order at this exact table
    const isSamePhoneTableSession = Boolean(
      activePlacedOrder &&
        params.mode === 'dine-in' &&
        params.table &&
        activePlacedOrder.mode === 'dine-in' &&
        activePlacedOrder.table === params.table &&
        activePlacedOrder.deviceId === activeDevId,
    )

    const mergedLines: CartLine[] =
      isSamePhoneTableSession && activePlacedOrder ? [...activePlacedOrder.lines] : []
    for (const incoming of lines) {
      const sig = JSON.stringify(incoming.selections)
      const idx = mergedLines.findIndex(
        (l) => l.itemId === incoming.itemId && JSON.stringify(l.selections) === sig && l.notes === incoming.notes,
      )
      if (idx >= 0) {
        mergedLines[idx] = { ...mergedLines[idx], qty: mergedLines[idx].qty + incoming.qty }
      } else {
        mergedLines.push(incoming)
      }
    }

    const finalRef = isSamePhoneTableSession && activePlacedOrder ? activePlacedOrder.orderRef : orderRef
    const finalTotal =
      isSamePhoneTableSession && activePlacedOrder ? activePlacedOrder.total + orderTotal : orderTotal

    const newRecord: PlacedOrder = {
      id: crypto.randomUUID(),
      orderRef: finalRef,
      mode: params.mode,
      table: params.table,
      lines: mergedLines,
      total: finalTotal,
      pacing,
      customerName,
      customerPhone,
      note: note.trim() || (isSamePhoneTableSession ? activePlacedOrder?.note ?? '' : ''),
      timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      createdAt: Date.now(),
      deviceId: activeDevId,
    }

    if (params.mode === 'dine-in' && params.table) {
      bindTableOrder(params.table, finalRef, lines, orderTotal, activeDevId)
    }

    const updated = [newRecord, ...pastOrders.slice(0, 9)]
    setPastOrders(updated)
    try {
      localStorage.setItem(`fornello_order_history_${activeDevId}`, JSON.stringify(updated))
      localStorage.setItem(`fornello_placed_order_${activeDevId}`, JSON.stringify(newRecord))
      localStorage.removeItem(`fornello_cart_${activeDevId}`)
    } catch {}

    setActivePlacedOrder(newRecord)
    setLines([])
    setOrderRef(generateOrderRef())
    playSuccessChime()
    showToast(STRINGS[params.lang].orderPlacedNotice)
    return newRecord
  }

  const clearActivePlacedOrder = () => {
    const activeDevId = deviceId === 'DEV-INIT' ? getOrCreateDeviceId() : deviceId
    setActivePlacedOrder(null)
    try {
      localStorage.removeItem(`fornello_placed_order_${activeDevId}`)
    } catch {}
  }

  const simulateNewCustomerPhone = () => {
    const freshDeviceId = rotateDeviceId()
    setDeviceId(freshDeviceId)
    setLines([])
    setActivePlacedOrder(null)
    setPastOrders([])
    setNote('')
    setCustomerName('')
    setCustomerPhone('')
    setOrderRef(generateOrderRef())
    showToast(
      params.lang === 'ckb'
        ? `📱 مۆبایلی میوانی نوێ چالاککرا (${freshDeviceId}) — جیاکراوەتەوە لە میوانی پێشوو`
        : `📱 New customer phone active (${freshDeviceId}) — isolated from previous guest!`,
    )
  }

  const simulateTableScan = (targetTable: number | null) => {
    if (activePlacedOrder && activePlacedOrder.table !== targetTable) {
      clearActivePlacedOrder()
    }
    if (targetTable === null || targetTable < 1 || targetTable > 25) {
      setVerifiedTable(null)
      try {
        sessionStorage.removeItem('fornello_table_verified_v1')
      } catch {}
      const next: OrderParams = { ...params, mode: 'takeaway', table: null }
      setParams(next)
      window.history.replaceState(null, '', orderQuery(next))
      return
    }
    const sig = generateTableSignature(targetTable)
    setVerifiedTable(targetTable)
    try {
      sessionStorage.setItem('fornello_table_verified_v1', JSON.stringify({ table: targetTable, sig }))
    } catch {}
    const next: OrderParams = { ...params, mode: 'dine-in', table: targetTable }
    setParams(next)
    window.history.replaceState(null, '', orderQuery(next))
  }

  const isTableVerified = verifiedTable !== null && params.table === verifiedTable && params.mode === 'dine-in'

  const value: OrderContextValue = {
    ...params,
    t: STRINGS[params.lang],
    deviceId,
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
    simulateTableScan,
    simulateNewCustomerPhone,
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
          <div className="pointer-events-none fixed inset-x-0 top-16 z-50 flex justify-center px-4">
            <aside
              role="status"
              aria-live="polite"
              className="pointer-events-auto w-fit max-w-md rounded-2xl border border-primary/50 bg-card/95 px-5 py-3 text-center text-sm leading-relaxed font-medium text-foreground shadow-2xl backdrop-blur-md animate-in fade-in-0 slide-in-from-top-4 duration-200"
            >
              {toast}
            </aside>
          </div>
        ) : null}
        {isOffline ? (
          <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40 flex justify-center px-4">
            <aside
              role="status"
              aria-live="polite"
              className="pointer-events-auto flex w-fit max-w-md items-center gap-2 rounded-full border border-amber-600/40 bg-amber-500/95 px-4 py-1.5 text-xs font-semibold text-amber-950 shadow-lg backdrop-blur"
            >
              <span className="size-2 shrink-0 rounded-full bg-amber-950 animate-pulse" />
              <span>{params.lang === 'ckb' ? 'دۆخی ئۆفلاین · مینیۆ و داواکردن بەردەستە' : 'Offline Mode · Menu & Ordering Active'}</span>
            </aside>
          </div>
        ) : null}
      </div>
    </OrderContext.Provider>
  )
}
