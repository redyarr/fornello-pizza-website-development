import { SITE, type Strings } from './i18n'
import { getItem, MODIFIER_GROUPS, PREP_MINUTES, type CategoryId, type Lang, type MenuItem } from './menu'
import { generateTableSignature, verifyTableSignature } from './table-token'

export type Mode = 'dine-in' | 'takeaway'
export type Pacing = 'now' | 'together' | 'after'
export type Selections = Record<string, string[]>
export type CartLine = {
  uid: string
  itemId: string
  qty: number
  selections: Selections
  notes?: string
  itemName?: string
  itemCategory?: CategoryId
  unitPriceSnapshot?: number
  selectionDetails?: { en: string[]; ckb: string[] }
}
export type OrderParams = { mode: Mode; table: number | null; lang: Lang }

export function formatIQD(amount: number): string {
  return `${amount.toLocaleString('en-US')} IQD`
}

export function padTable(table: number): string {
  return String(table).padStart(2, '0')
}

export function parseOrderParams(sp: Record<string, string | string[] | undefined>): OrderParams {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
  const tableNumber = Number.parseInt(first(sp.table) ?? '', 10)
  const sig = first(sp.sig)
  const isVerified = verifyTableSignature(tableNumber, sig)
  const table = isVerified && tableNumber >= 1 && tableNumber <= SITE.tableCount ? tableNumber : null
  const mode: Mode = first(sp.mode) === 'dine-in' && table ? 'dine-in' : 'takeaway'
  return { mode, table: mode === 'dine-in' ? table : null, lang: first(sp.lang) === 'ckb' ? 'ckb' : 'en' }
}

export function orderQuery({ mode, table, lang }: OrderParams): string {
  const params = new URLSearchParams({ mode })
  if (mode === 'dine-in' && table) {
    params.set('table', padTable(table))
    params.set('sig', generateTableSignature(table))
  }
  if (lang === 'ckb') params.set('lang', 'ckb')
  return `?${params.toString()}`
}

export function defaultSelections(item: MenuItem): Selections {
  return Object.fromEntries(
    item.groups.map((id) => {
      const group = MODIFIER_GROUPS[id]
      if (!group || group.options.length === 0) return [id, []]
      const validDefaults = (group.defaults ?? []).filter((d) => group.options.some((o) => o.id === d))
      if (validDefaults.length === 0 && group.min === 1 && group.max === 1) {
        return [id, [group.options[0].id]]
      }
      return [id, validDefaults]
    }),
  )
}

export function isComplete(item: MenuItem, selections: Selections): boolean {
  return item.groups.every((id) => {
    const group = MODIFIER_GROUPS[id]
    if (!group || group.options.length === 0) return true
    const count = (selections[id] ?? []).filter((optId) => group.options.some((o) => o.id === optId)).length
    const effectiveMin = Math.min(group.min, group.options.length)
    return count >= effectiveMin && count <= group.max
  })
}

export function unitPrice(item: MenuItem, selections: Selections): number {
  return item.groups.reduce((sum, id) => {
    const group = MODIFIER_GROUPS[id]
    if (!group) return sum
    const picked = selections[id] ?? []
    return sum + group.options.filter((o) => picked.includes(o.id)).reduce((s, o) => s + o.price, 0)
  }, item.price)
}

export function describeSelections(item: MenuItem, selections: Selections, lang: Lang): string[] {
  return item.groups.flatMap((id) => {
    const group = MODIFIER_GROUPS[id]
    if (!group || group.options.length === 0) return []
    const picked = (selections[id] ?? []).filter((optId) => group.options.some((o) => o.id === optId))
    if (picked.length === 0) return []
    const validDefaults = (group.defaults ?? []).filter((d) => group.options.some((o) => o.id === d))
    const isDefault =
      validDefaults.length === picked.length && validDefaults.every((d) => picked.includes(d))
    if (isDefault && !group.alwaysShow) return []
    const labels = group.options.filter((o) => picked.includes(o.id)).map((o) => o.label[lang] || o.label.en)
    const separator = lang === 'ckb' ? '، ' : ', '
    return [`${group.label[lang] || group.label.en}: ${labels.join(separator)}`]
  })
}

export function resolveLineItem(line: CartLine): MenuItem {
  const found = getItem(line.itemId)
  if (found) return found
  return {
    id: line.itemId,
    category: line.itemCategory ?? 'pizza',
    name: line.itemName ?? 'Custom Item',
    price: line.unitPriceSnapshot ?? 0,
    tags: [],
    groups: Object.keys(line.selections ?? {}),
  }
}

export function describeLineSelections(line: CartLine, lang: Lang): string[] {
  const found = getItem(line.itemId)
  if (found) {
    const liveDetails = describeSelections(found, line.selections, lang)
    if (liveDetails.length > 0) return liveDetails
  }
  const snap = line.selectionDetails?.[lang]
  if (Array.isArray(snap) && snap.length > 0) return snap
  if (found) return []
  const fallbackItem = resolveLineItem(line)
  return describeSelections(fallbackItem, line.selections, lang)
}

export function lineTotal(line: CartLine): number {
  const item = getItem(line.itemId)
  if (item) {
    const computed = unitPrice(item, line.selections)
    const unit = line.unitPriceSnapshot !== undefined ? Math.max(computed, line.unitPriceSnapshot) : computed
    return unit * line.qty
  }
  if (line.unitPriceSnapshot !== undefined) {
    return line.unitPriceSnapshot * line.qty
  }
  const fallback = resolveLineItem(line)
  return unitPrice(fallback, line.selections) * line.qty
}

export function cartTotal(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + lineTotal(line), 0)
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.qty, 0)
}

export function needsPacing(lines: CartLine[]): boolean {
  const categories = lines.map((line) => resolveLineItem(line).category)
  return categories.includes('coffee') && categories.some((c) => c && c !== 'coffee')
}

export function prepEstimate(lines: CartLine[]): [number, number] {
  const items = lines.map((line) => ({ line, item: resolveLineItem(line) }))
  const base = Math.max(0, ...items.map(({ item }) => (item ? PREP_MINUTES[item.category] ?? 10 : 0)))
  const pizzas = items.reduce((n, { line, item }) => n + (item?.category === 'pizza' ? line.qty : 0), 0)
  const low = Math.ceil((base + Math.min(10, Math.max(0, pizzas - 1) * 2)) / 5) * 5
  return [low, low + 5]
}

export type ReceiptInput = {
  lang: Lang
  t: Strings
  mode: Mode
  table: number | null
  lines: CartLine[]
  pacing: Pacing
  customerName: string
  customerPhone?: string
  note: string
  orderRef?: string
}

export function buildReceipt({
  lang,
  t,
  mode,
  table,
  lines,
  pacing,
  customerName,
  customerPhone,
  note,
  orderRef,
}: ReceiptInput): string {
  const siteTitle = lang === 'ckb' ? `${SITE.nameCkb} (${SITE.name})` : SITE.name
  const refHeader = orderRef ? ` [${orderRef}]` : ''
  const out: string[] = [`*${siteTitle} — ${t.newOrder}${refHeader}*`]
  if (mode === 'dine-in') {
    const tableDisplay = table ? padTable(table) : lang === 'ckb' ? '؟' : '?'
    out.push(`${t.dineIn} · ${t.table} ${tableDisplay}`)
    if (needsPacing(lines)) out.push(`${t.coffeeService}: ${t.pacing[pacing]}`)
  } else {
    const name = customerName.trim()
    const phone = customerPhone?.trim()
    const customerInfo = [name, phone].filter(Boolean).join(' · ')
    out.push(customerInfo ? `${t.takeaway} · ${customerInfo}` : t.takeaway)
    const [low, high] = prepEstimate(lines)
    out.push(t.readyIn(low, high))
  }
  out.push('')
  for (const line of lines) {
    const item = resolveLineItem(line)
    out.push(`${line.qty}× ${item.name} — ${formatIQD(lineTotal(line))}`)
    for (const detail of describeLineSelections(line, lang)) out.push(`   · ${detail}`)
    if (line.notes?.trim()) out.push(`   · 📝 ${line.notes.trim()}`)
  }
  if (note.trim()) out.push('', `${t.note}: ${note.trim()}`)
  out.push('', `*${t.total}: ${formatIQD(cartTotal(lines))}*`)
  return out.join('\n')
}

export function whatsappUrl(receipt: string): string {
  return `https://wa.me/${SITE.whatsappNumber}?text=${encodeURIComponent(receipt)}`
}
