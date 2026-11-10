import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { MenuStoreData } from '@/lib/menu'
import publishedDefault from '@/lib/menu-published.json'

const PUBLISHED_JSON_PATH = path.join(process.cwd(), 'lib', 'menu-published.json')
const LIVE_MENU_JSON_PATH = path.join(process.cwd(), '.fornello-menu-live.json')
const TMP_MENU_JSON_PATH = path.join(os.tmpdir(), 'fornello-menu-live-v1.json')

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
  for (const candidatePath of [TMP_MENU_JSON_PATH, LIVE_MENU_JSON_PATH, PUBLISHED_JSON_PATH]) {
    try {
      const raw = await fs.readFile(candidatePath, 'utf-8')
      const parsed = JSON.parse(raw) as MenuStoreData
      if (parsed && typeof parsed === 'object') {
        const parsedTime = typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0
        if (parsedTime >= (memoryMenuStore.updatedAt ?? 0)) {
          memoryMenuStore = {
            customItems: Array.isArray(parsed.customItems) ? parsed.customItems : [],
            overrides: typeof parsed.overrides === 'object' && parsed.overrides ? parsed.overrides : {},
            modifierGroups: parsed.modifierGroups,
            categoryOverrides: parsed.categoryOverrides,
            updatedAt: parsedTime || Date.now(),
          }
        }
      }
    } catch {
      // Ignore missing candidate file
    }
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
    const payload = `${JSON.stringify(sanitized, null, 2)}\n`
    try {
      await fs.writeFile(TMP_MENU_JSON_PATH, payload, 'utf-8')
    } catch {}
    try {
      await fs.writeFile(LIVE_MENU_JSON_PATH, payload, 'utf-8')
    } catch {}
    try {
      await fs.writeFile(PUBLISHED_JSON_PATH, payload, 'utf-8')
    } catch {}
    return Response.json({ ok: true, data: sanitized })
  } catch {
    return Response.json({ error: 'Failed to process menu update' }, { status: 500 })
  }
}

