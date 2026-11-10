// Client-side Floor Management & Real-Time Sync Engine
// Manages Table 01 - Table 25 live state, active bills, order lines, and waiter calls.
// Synchronizes in real-time across tabs/screens via BroadcastChannel + localStorage.
// Provides portable QR token payload encoding for instant device-to-device syncing without a backend.

import { SITE } from './i18n'
import type { CartLine } from './order'

export type TableCallType = 'waiter' | 'bill' | 'water' | 'cutlery'

export type ActiveTableCall = {
  type: TableCallType
  time: string
  timestamp: number
  deviceId?: string
}

export type TableOrderRecord = {
  table: number
  orderRef: string
  timestamp: string
  createdAt: number
  lines: CartLine[]
  total: number
  deviceId?: string
  call?: ActiveTableCall
  status: 'active' | 'served' | 'paid'
}

export type FloorState = {
  tables: Record<number, TableOrderRecord | undefined>
  activeCalls: Record<number, ActiveTableCall | undefined>
}

const FLOOR_STORAGE_KEY = 'fornello_floor_state_v2'
const DEVICE_STORAGE_KEY = 'fornello_device_id_v1'
const BROADCAST_CHANNEL_NAME = 'fornello_floor_mesh_channel'

function generateRandomDeviceTag(): string {
  const bytes = new Uint8Array(3)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < 3; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
    .slice(0, 4)
  return `DEV-${hex}`
}

export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'DEV-SSR0'
  try {
    const existing = localStorage.getItem(DEVICE_STORAGE_KEY)
    if (existing && existing.startsWith('DEV-')) return existing
    const fresh = generateRandomDeviceTag()
    localStorage.setItem(DEVICE_STORAGE_KEY, fresh)
    return fresh
  } catch {
    return generateRandomDeviceTag()
  }
}

export function rotateDeviceId(): string {
  const fresh = generateRandomDeviceTag()
  if (typeof window !== 'undefined') {
    try {
      const prev = localStorage.getItem(DEVICE_STORAGE_KEY)
      if (prev) {
        localStorage.removeItem(`fornello_cart_${prev}`)
        localStorage.removeItem(`fornello_placed_order_${prev}`)
      }
      localStorage.setItem(DEVICE_STORAGE_KEY, fresh)
    } catch {}
  }
  return fresh
}

// Feature toggle: set to true if you want to show the sync QR code on the digital waiter ticket
// and the "Scan Customer Order" button on the Live Floor Monitor in the future.
export const ENABLE_WAITER_QR_SYNC = false

// Auto-expire forgotten table sessions after 90 minutes and service calls after 30 minutes
// so a table never stays stuck if staff forget to manually clear it.
const STALE_TABLE_TTL_MS = 90 * 60 * 1000
const STALE_CALL_TTL_MS = 30 * 60 * 1000

let broadcastChannel: BroadcastChannel | null = null

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null
  if (!broadcastChannel && typeof window.BroadcastChannel !== 'undefined') {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME)
  }
  return broadcastChannel
}

export function getInitialFloorState(): FloorState {
  if (typeof window === 'undefined') return { tables: {}, activeCalls: {} }
  try {
    const raw = localStorage.getItem(FLOOR_STORAGE_KEY)
    if (!raw) return { tables: {}, activeCalls: {} }
    const parsed = JSON.parse(raw) as FloorState
    const now = Date.now()
    const rawTables = parsed.tables || {}
    const rawCalls = parsed.activeCalls || {}

    const tables: Record<number, TableOrderRecord | undefined> = {}
    for (const [k, record] of Object.entries(rawTables)) {
      if (record && now - (record.createdAt || 0) < STALE_TABLE_TTL_MS) {
        tables[Number(k)] = record
      }
    }

    const activeCalls: Record<number, ActiveTableCall | undefined> = {}
    for (const [k, call] of Object.entries(rawCalls)) {
      if (call && now - (call.timestamp || 0) < STALE_CALL_TTL_MS) {
        activeCalls[Number(k)] = call
      }
    }

    return { tables, activeCalls }
  } catch {
    return { tables: {}, activeCalls: {} }
  }
}

export function saveFloorState(state: FloorState): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(FLOOR_STORAGE_KEY, JSON.stringify(state))
    const bc = getBroadcastChannel()
    if (bc) {
      bc.postMessage({ type: 'FLOOR_STATE_UPDATED', payload: state })
    }
    window.dispatchEvent(new CustomEvent('fornello_floor_updated', { detail: state }))
  } catch {
    // ignore in restricted private browsing
  }
}

function postFloorMutation(payload: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  fetch('/api/floor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store',
  })
    .then(async (res) => {
      if (!res.ok) return
      const json = (await res.json()) as { ok?: boolean; state?: FloorState }
      if (json?.state && typeof json.state === 'object') {
        const currentRaw = localStorage.getItem(FLOOR_STORAGE_KEY)
        const remoteRaw = JSON.stringify(json.state)
        if (currentRaw !== remoteRaw) {
          saveFloorState(json.state)
        }
      }
    })
    .catch(() => {
      // Offline fallback: localStorage + BroadcastChannel remain active
    })
}

export async function syncRemoteFloorState(): Promise<FloorState | null> {
  if (typeof window === 'undefined') return null
  try {
    const res = await fetch('/api/floor', { cache: 'no-store' })
    if (!res.ok) return null
    const remote = (await res.json()) as FloorState
    if (remote && typeof remote === 'object' && remote.tables && remote.activeCalls) {
      const currentRaw = localStorage.getItem(FLOOR_STORAGE_KEY)
      const remoteRaw = JSON.stringify(remote)
      if (currentRaw !== remoteRaw) {
        saveFloorState(remote)
      }
      return remote
    }
  } catch {
    // Offline fallback
  }
  return null
}

// -------------------------------------------------------------
// Live Service Call Dispatch & Handlers
// -------------------------------------------------------------

export function dispatchTableCall(table: number, type: TableCallType, deviceId?: string): void {
  const current = getInitialFloorState()
  const now = new Date()
  const activeDeviceId = deviceId ?? getOrCreateDeviceId()
  const call: ActiveTableCall = {
    type,
    time: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    timestamp: Date.now(),
    deviceId: activeDeviceId,
  }

  const existingTable = current.tables[table]
  const updatedTable: TableOrderRecord | undefined = existingTable
    ? { ...existingTable, call }
    : undefined

  const nextState: FloorState = {
    ...current,
    activeCalls: {
      ...current.activeCalls,
      [table]: call,
    },
    tables: updatedTable ? { ...current.tables, [table]: updatedTable } : current.tables,
  }

  saveFloorState(nextState)
  postFloorMutation({
    action: 'set_table',
    table,
    call,
    ...(updatedTable ? { record: updatedTable } : {}),
  })
}

export function acknowledgeTableCall(table: number): void {
  const current = getInitialFloorState()
  const existingTable = current.tables[table]

  const nextCalls = { ...current.activeCalls }
  delete nextCalls[table]

  const nextTables = { ...current.tables }
  if (existingTable) {
    const { call: _discard, ...rest } = existingTable
    nextTables[table] = rest
  }

  const nextState: FloorState = {
    ...current,
    activeCalls: nextCalls,
    tables: nextTables,
  }

  saveFloorState(nextState)
  postFloorMutation({ action: 'ack_call', table })
}

// -------------------------------------------------------------
// Table Order Management
// -------------------------------------------------------------

export function bindTableOrder(
  table: number,
  orderRef: string,
  lines: CartLine[],
  total: number,
  deviceId?: string,
): void {
  const current = getInitialFloorState()
  const now = new Date()
  const activeDeviceId = deviceId ?? getOrCreateDeviceId()
  const prevRecord = current.tables[table]
  const existingCall = current.activeCalls[table]

  // Per-Phone Isolation:
  // - If the SAME customer phone (same deviceId) at this table orders a second round, merge their items into their active table bill.
  // - If a DIFFERENT customer phone (new deviceId) orders at this table, isolate it completely and replace any un-cleared previous guest's record!
  const isSamePhoneSession = Boolean(prevRecord && prevRecord.deviceId && prevRecord.deviceId === activeDeviceId)

  const mergedLines: CartLine[] = isSamePhoneSession && prevRecord ? [...prevRecord.lines] : []
  for (const incoming of lines) {
    const sig = JSON.stringify(incoming.selections)
    const matchIdx = mergedLines.findIndex(
      (l) => l.itemId === incoming.itemId && JSON.stringify(l.selections) === sig && l.notes === incoming.notes,
    )
    if (matchIdx >= 0) {
      mergedLines[matchIdx] = {
        ...mergedLines[matchIdx],
        qty: mergedLines[matchIdx].qty + incoming.qty,
      }
    } else {
      mergedLines.push(incoming)
    }
  }

  const finalTotal = isSamePhoneSession && prevRecord ? prevRecord.total + total : total
  const finalCall =
    existingCall && (!existingCall.deviceId || existingCall.deviceId === activeDeviceId)
      ? existingCall
      : undefined

  const nextCalls = { ...current.activeCalls }
  if (!finalCall) {
    delete nextCalls[table]
  }

  const record: TableOrderRecord = {
    table,
    orderRef: isSamePhoneSession && prevRecord ? prevRecord.orderRef : orderRef,
    timestamp: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    createdAt: Date.now(),
    lines: mergedLines,
    total: finalTotal,
    deviceId: activeDeviceId,
    call: finalCall,
    status: 'active',
  }

  const nextState: FloorState = {
    ...current,
    activeCalls: nextCalls,
    tables: {
      ...current.tables,
      [table]: record,
    },
  }

  saveFloorState(nextState)
  postFloorMutation({
    action: 'set_table',
    table,
    record,
    call: finalCall ?? null,
  })
}

export function updateTableStatus(table: number, status: 'active' | 'served' | 'paid'): void {
  const current = getInitialFloorState()
  const existing = current.tables[table]
  if (!existing) return

  if (status === 'paid') {
    // Clear table from active floor
    clearTable(table)
    return
  }

  const updatedRecord: TableOrderRecord = { ...existing, status }
  const nextState: FloorState = {
    ...current,
    tables: {
      ...current.tables,
      [table]: updatedRecord,
    },
  }

  saveFloorState(nextState)
  postFloorMutation({
    action: 'set_table',
    table,
    record: updatedRecord,
  })
}

export function clearTable(table: number): void {
  const current = getInitialFloorState()
  const nextTables = { ...current.tables }
  delete nextTables[table]

  const nextCalls = { ...current.activeCalls }
  delete nextCalls[table]

  saveFloorState({ tables: nextTables, activeCalls: nextCalls })
  postFloorMutation({ action: 'clear_table', table })
}

export function resetAllFloor(): void {
  saveFloorState({ tables: {}, activeCalls: {} })
  postFloorMutation({ action: 'reset_all' })
}

// -------------------------------------------------------------
// Zero-Backend Cross-Device Portable QR Sync
// Encodes table order payload into a compact verifiable string
// so staff can scan customer's screen with camera in 0.5s.
// -------------------------------------------------------------

export type PortableTablePayload = {
  table: number
  ref: string
  lines: CartLine[]
  total: number
  ts: number
}

export function encodeTableSyncPayload(
  table: number,
  ref: string,
  lines: CartLine[],
  total: number,
): string {
  const payload: PortableTablePayload = {
    table,
    ref,
    lines,
    total,
    ts: Date.now(),
  }
  return 'FORNELLO-ORDER:' + btoa(encodeURIComponent(JSON.stringify(payload)))
}

export function decodeTableSyncPayload(raw: string): PortableTablePayload | null {
  try {
    if (!raw.startsWith('FORNELLO-ORDER:')) return null
    const b64 = raw.slice('FORNELLO-ORDER:'.length)
    const json = decodeURIComponent(atob(b64))
    const parsed = JSON.parse(json) as PortableTablePayload
    if (parsed && typeof parsed.table === 'number' && Array.isArray(parsed.lines)) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

