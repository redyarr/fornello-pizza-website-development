import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { ActiveTableCall, FloorState, TableOrderRecord } from '@/lib/floor'

const FLOOR_JSON_PATH = path.join(os.tmpdir(), 'fornello-floor-state-v2.json')
const STALE_TABLE_TTL_MS = 90 * 60 * 1000
const STALE_CALL_TTL_MS = 30 * 60 * 1000

let memoryFloorState: FloorState = { tables: {}, activeCalls: {} }

function pruneStaleFloor(state: FloorState): FloorState {
  const now = Date.now()
  const tables: Record<number, TableOrderRecord | undefined> = {}
  const activeCalls: Record<number, ActiveTableCall | undefined> = {}

  for (const [k, record] of Object.entries(state.tables || {})) {
    if (record && now - (record.createdAt || 0) < STALE_TABLE_TTL_MS) {
      tables[Number(k)] = record
    }
  }
  for (const [k, call] of Object.entries(state.activeCalls || {})) {
    if (call && now - (call.timestamp || 0) < STALE_CALL_TTL_MS) {
      activeCalls[Number(k)] = call
    }
  }
  return { tables, activeCalls }
}

async function readFloorState(): Promise<FloorState> {
  try {
    const raw = await fs.readFile(FLOOR_JSON_PATH, 'utf-8')
    const parsed = JSON.parse(raw) as FloorState
    if (parsed && typeof parsed === 'object') {
      memoryFloorState = pruneStaleFloor(parsed)
    }
  } catch {
    memoryFloorState = pruneStaleFloor(memoryFloorState)
  }
  return memoryFloorState
}

async function writeFloorState(state: FloorState): Promise<FloorState> {
  const pruned = pruneStaleFloor(state)
  memoryFloorState = pruned
  try {
    await fs.writeFile(FLOOR_JSON_PATH, JSON.stringify(pruned), 'utf-8')
  } catch {
    // Ignore write error if tmpdir is restricted
  }
  return pruned
}

export async function GET() {
  const state = await readFloorState()
  return Response.json(state, {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  })
}

type FloorMutationPayload =
  | { action: 'set_table'; table: number; record?: TableOrderRecord; call?: ActiveTableCall | null }
  | { action: 'ack_call'; table: number }
  | { action: 'clear_table'; table: number }
  | { action: 'reset_all' }
  | FloorState

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FloorMutationPayload
    if (!body || typeof body !== 'object') {
      return Response.json({ error: 'Invalid floor payload' }, { status: 400 })
    }

    const current = await readFloorState()

    if ('action' in body) {
      const nextTables = { ...current.tables }
      const nextCalls = { ...current.activeCalls }

      if (body.action === 'set_table') {
        if (body.record) {
          nextTables[body.table] = body.record
        }
        if (body.call !== undefined) {
          if (body.call === null) {
            delete nextCalls[body.table]
          } else {
            nextCalls[body.table] = body.call
          }
        }
      } else if (body.action === 'ack_call') {
        delete nextCalls[body.table]
        if (nextTables[body.table]) {
          const { call: _discard, ...rest } = nextTables[body.table]!
          nextTables[body.table] = rest
        }
      } else if (body.action === 'clear_table') {
        delete nextTables[body.table]
        delete nextCalls[body.table]
      } else if (body.action === 'reset_all') {
        const empty = await writeFloorState({ tables: {}, activeCalls: {} })
        return Response.json({ ok: true, state: empty })
      }

      const saved = await writeFloorState({ tables: nextTables, activeCalls: nextCalls })
      return Response.json({ ok: true, state: saved })
    }

    // Fallback full-state merge
    const saved = await writeFloorState({
      tables: { ...current.tables, ...(body.tables || {}) },
      activeCalls: { ...current.activeCalls, ...(body.activeCalls || {}) },
    })
    return Response.json({ ok: true, state: saved })
  } catch {
    return Response.json({ error: 'Failed to update floor state' }, { status: 500 })
  }
}
