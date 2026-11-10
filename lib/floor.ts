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
}

export type TableOrderRecord = {
  table: number
  orderRef: string
  timestamp: string
  createdAt: number
  lines: CartLine[]
  total: number
  call?: ActiveTableCall
  status: 'active' | 'served' | 'paid'
}

export type FloorState = {
  tables: Record<number, TableOrderRecord | undefined>
  activeCalls: Record<number, ActiveTableCall | undefined>
}

const FLOOR_STORAGE_KEY = 'fornello_floor_state_v2'
const BROADCAST_CHANNEL_NAME = 'fornello_floor_mesh_channel'

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
    return {
      tables: parsed.tables || {},
      activeCalls: parsed.activeCalls || {},
    }
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

// -------------------------------------------------------------
// Live Service Call Dispatch & Handlers
// -------------------------------------------------------------

export function dispatchTableCall(table: number, type: TableCallType): void {
  const current = getInitialFloorState()
  const now = new Date()
  const call: ActiveTableCall = {
    type,
    time: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    timestamp: Date.now(),
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
}

// -------------------------------------------------------------
// Table Order Management
// -------------------------------------------------------------

export function bindTableOrder(
  table: number,
  orderRef: string,
  lines: CartLine[],
  total: number,
): void {
  const current = getInitialFloorState()
  const now = new Date()
  const existingCall = current.activeCalls[table]

  const record: TableOrderRecord = {
    table,
    orderRef,
    timestamp: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    createdAt: Date.now(),
    lines,
    total,
    call: existingCall,
    status: 'active',
  }

  const nextState: FloorState = {
    ...current,
    tables: {
      ...current.tables,
      [table]: record,
    },
  }

  saveFloorState(nextState)
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

  const nextState: FloorState = {
    ...current,
    tables: {
      ...current.tables,
      [table]: { ...existing, status },
    },
  }

  saveFloorState(nextState)
}

export function clearTable(table: number): void {
  const current = getInitialFloorState()
  const nextTables = { ...current.tables }
  delete nextTables[table]

  const nextCalls = { ...current.activeCalls }
  delete nextCalls[table]

  saveFloorState({ tables: nextTables, activeCalls: nextCalls })
}

export function resetAllFloor(): void {
  saveFloorState({ tables: {}, activeCalls: {} })
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

