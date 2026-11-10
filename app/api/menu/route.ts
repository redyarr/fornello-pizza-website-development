import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { MenuStoreData } from '@/lib/menu'
import publishedDefault from '@/lib/menu-published.json'

const LIVE_MENU_JSON_PATH = path.join(process.cwd(), '.fornello-menu-live.json')

let memoryMenuStore: MenuStoreData = {
  customItems: Array.isArray((publishedDefault as MenuStoreData).customItems)
    ? (publishedDefault as MenuStoreData).customItems
    : [],
  overrides:
    typeof (publishedDefault as MenuStoreData).overrides === 'object' && (publishedDefault as MenuStoreData).overrides
      ? (publishedDefault as MenuStoreData).overrides
      : {},
  modifierGroups: (publishedDefault as MenuStoreData).modifierGroups,
  categoryOverrides: (publishedDefault as MenuStoreData).categoryOverrides,
  updatedAt: (publishedDefault as MenuStoreData).updatedAt ?? 0,
}

async function readMenuStore(): Promise<MenuStoreData> {
  try {
    const raw = await fs.readFile(LIVE_MENU_JSON_PATH, 'utf-8')
    const parsed = JSON.parse(raw) as MenuStoreData
    if (parsed && typeof parsed === 'object') {
      memoryMenuStore = {
        customItems: Array.isArray(parsed.customItems) ? parsed.customItems : [],
        overrides: typeof parsed.overrides === 'object' && parsed.overrides ? parsed.overrides : {},
        modifierGroups: parsed.modifierGroups,
        categoryOverrides: parsed.categoryOverrides,
        updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
      }
    }
  } catch {
    // Fallback to memoryMenuStore / publishedDefault when .fornello-menu-live.json doesn't exist yet
  }
  return memoryMenuStore
}

export async function GET() {
  const data = await readMenuStore()
  return Response.json(data, {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  })
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as MenuStoreData
    if (!body || typeof body !== 'object') {
      return Response.json({ error: 'Invalid menu store payload' }, { status: 400 })
    }
    const sanitized: MenuStoreData = {
      customItems: Array.isArray(body.customItems) ? body.customItems : [],
      overrides: typeof body.overrides === 'object' && body.overrides ? body.overrides : {},
      modifierGroups: body.modifierGroups,
      categoryOverrides: body.categoryOverrides,
      updatedAt: typeof body.updatedAt === 'number' && body.updatedAt > 0 ? body.updatedAt : Date.now(),
    }
    memoryMenuStore = sanitized
    try {
      await fs.writeFile(LIVE_MENU_JSON_PATH, `${JSON.stringify(sanitized, null, 2)}\n`, 'utf-8')
    } catch {
      // Ignore write error on read-only serverless edge; memoryMenuStore stays updated for warm instance
    }
    return Response.json({ ok: true, data: sanitized })
  } catch {
    return Response.json({ error: 'Failed to process menu update' }, { status: 500 })
  }
}

