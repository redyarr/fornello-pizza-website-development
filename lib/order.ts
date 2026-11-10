import { SITE, type Strings } from './i18n'
import { getItem, MODIFIER_GROUPS, PREP_MINUTES, type Lang, type MenuItem } from './menu'

export type Mode = 'dine-in' | 'takeaway'
export type Pacing = 'now' | 'together' | 'after'
export type Selections = Record<string, string[]>
export type CartLine = { uid: string; itemId: string; qty: number; selections: Selections }
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
  const table = tableNumber >= 1 && tableNumber <= SITE.tableCount ? tableNumber : null
  const mode: Mode = first(sp.mode) === 'dine-in' || (first(sp.mode) === undefined && table) ? 'dine-in' : 'takeaway'
  return { mode, table: mode === 'dine-in' ? table : null, lang: first(sp.lang) === 'ckb' ? 'ckb' : 'en' }
}

export function orderQuery({ mode, table, lang }: OrderParams): string {
  const params = new URLSearchParams({ mode })
  if (mode === 'dine-in' && table) params.set('table', padTable(table))
  if (lang === 'ckb') params.set('lang', 'ckb')
  return `?${params.toString()}`
}

export function defaultSelections(item: MenuItem): Selections {
  return Object.fromEntries(item.groups.map((id) => [id, [...(MODIFIER_GROUPS[id].defaults ?? [])]]))
}

export function isComplete(item: MenuItem, selections: Selections): boolean {
  return item.groups.every((id) => {
    const count = selections[id]?.length ?? 0
    return count >= MODIFIER_GROUPS[id].min && count <= MODIFIER_GROUPS[id].max
  })
}

export function unitPrice(item: MenuItem, selections: Selections): number {
  return item.groups.reduce((sum, id) => {
    const group = MODIFIER_GROUPS[id]
    const picked = selections[id] ?? []
    return sum + group.options.filter((o) => picked.includes(o.id)).reduce((s, o) => s + o.price, 0)
  }, item.price)
}

export function describeSelections(item: MenuItem, selections: Selections, lang: Lang): string[] {
  return item.groups.flatMap((id) => {
    const group = MODIFIER_GROUPS[id]
    const picked = selections[id] ?? []
    if (picked.length === 0) return []
    const isDefault =
      group.defaults?.length === picked.length && group.defaults.every((d) => picked.includes(d))
    if (isDefault && !group.alwaysShow) return []
    const labels = group.options.filter((o) => picked.includes(o.id)).map((o) => o.label[lang])
    return [`${group.label[lang]}: ${labels.join(', ')}`]
  })
}

export function lineTotal(line: CartLine): number {
  const item = getItem(line.itemId)
  return item ? unitPrice(item, line.selections) * line.qty : 0
}

export function cartTotal(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + lineTotal(line), 0)
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.qty, 0)
}

export function needsPacing(lines: CartLine[]): boolean {
  const categories = lines.map((line) => getItem(line.itemId)?.category)
  return categories.includes('coffee') && categories.some((c) => c && c !== 'coffee')
}

export function prepEstimate(lines: CartLine[]): [number, number] {
  const items = lines.map((line) => ({ line, item: getItem(line.itemId) }))
  const base = Math.max(0, ...items.map(({ item }) => (item ? PREP_MINUTES[item.category] : 0)))
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
  note: string
}

export function buildReceipt({ lang, t, mode, table, lines, pacing, customerName, note }: ReceiptInput): string {
  const out: string[] = [`*${SITE.name} — ${t.newOrder}*`]
  if (mode === 'dine-in') {
    out.push(`${t.dineIn} · ${t.table} ${table ? padTable(table) : '?'}`)
    if (needsPacing(lines)) out.push(`${t.coffeeService}: ${t.pacing[pacing]}`)
  } else {
    const name = customerName.trim()
    out.push(name ? `${t.takeaway} · ${name}` : t.takeaway)
    const [low, high] = prepEstimate(lines)
    out.push(t.readyIn(low, high))
  }
  out.push('')
  for (const line of lines) {
    const item = getItem(line.itemId)
    if (!item) continue
    out.push(`${line.qty}× ${item.name} — ${formatIQD(lineTotal(line))}`)
    for (const detail of describeSelections(item, line.selections, lang)) out.push(`   · ${detail}`)
  }
  if (note.trim()) out.push('', `${t.note}: ${note.trim()}`)
  out.push('', `*${t.total}: ${formatIQD(cartTotal(lines))}*`)
  return out.join('\n')
}

export function whatsappUrl(receipt: string): string {
  return `https://wa.me/${SITE.whatsappNumber}?text=${encodeURIComponent(receipt)}`
}
