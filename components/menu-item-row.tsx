'use client'

import { Flame, Leaf, Plus, SlidersHorizontal } from 'lucide-react'
import { MODIFIER_GROUPS, type MenuItem } from '@/lib/menu'
import { defaultSelections, formatIQD, isComplete } from '@/lib/order'
import { cn } from '@/lib/utils'
import { useOrder } from './order-provider'

export function MenuItemRow({
  item,
  onSelect,
}: {
  item: MenuItem & { soldOut?: boolean; custom?: boolean }
  onSelect: (item: MenuItem) => void
}) {
  const { lang, t, lines, addLine } = useOrder()
  const isSoldOut = Boolean(item.soldOut)
  const hasPricedSize = item.groups.some(
    (id) => MODIFIER_GROUPS[id]?.min > 0 && MODIFIER_GROUPS[id]?.options.some((o) => o.price > 0),
  )
  const inCartQty = lines.filter((l) => l.itemId === item.id).reduce((sum, l) => sum + l.qty, 0)
  const defaults = defaultSelections(item)
  const canQuickAdd = isComplete(item, defaults)

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isSoldOut) return
    if (!canQuickAdd) {
      onSelect(item)
      return
    }
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([15])
    }
    addLine(item, defaults, 1)
  }

  return (
    <li className="flex items-center justify-between gap-3 py-3.5 sm:gap-4 sm:py-4">
      <button
        type="button"
        disabled={isSoldOut}
        onClick={() => !isSoldOut && onSelect(item)}
        className={cn(
          'group -ms-2 flex min-w-0 flex-1 items-center justify-between gap-3 rounded-2xl px-2 py-1.5 text-start transition-colors hover:bg-background/30 active:bg-background/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:gap-4 sm:px-3',
          isSoldOut && 'cursor-not-allowed opacity-50 hover:bg-transparent',
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span lang="en" className="font-display text-lg leading-snug font-medium tracking-wide uppercase">
              {item.name}
            </span>
            {inCartQty > 0 ? (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground tabular-nums">
                {`${inCartQty}×`}
              </span>
            ) : null}
            {isSoldOut ? (
              <span className="rounded-full bg-destructive/20 px-2.5 py-0.5 text-xs font-medium text-destructive">
                {t.soldOut}
              </span>
            ) : null}
            {item.tags.includes('spicy') ? (
              <span className="text-destructive">
                <Flame className="size-4" aria-hidden="true" />
                <span className="sr-only">{t.tags.spicy}</span>
              </span>
            ) : null}
            {item.tags.includes('vegetarian') ? (
              <span className="text-basil brightness-150">
                <Leaf className="size-4" aria-hidden="true" />
                <span className="sr-only">{t.tags.vegetarian}</span>
              </span>
            ) : null}
          </span>
          {item.description ? (
            <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
              {item.description[lang]}
            </span>
          ) : null}
          {!isSoldOut && item.groups.length > 0 ? (
            <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary/80 group-hover:text-primary">
              <SlidersHorizontal className="size-3" aria-hidden="true" />
              <span>{t.customize}</span>
            </span>
          ) : null}
        </span>

        <span className="shrink-0 text-end text-sm font-semibold tabular-nums">
          {hasPricedSize ? <span className="block text-xs font-normal text-muted-foreground">{t.from}</span> : null}
          {formatIQD(item.price)}
        </span>
      </button>

      <button
        type="button"
        disabled={isSoldOut}
        onClick={handleQuickAdd}
        aria-label={`${t.addToOrder}: ${item.name}`}
        title={canQuickAdd ? t.addToOrder : t.customize}
        className={cn(
          'grid size-10 shrink-0 place-items-center rounded-full border transition-all active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          isSoldOut
            ? 'cursor-not-allowed border-border text-muted-foreground opacity-50'
            : inCartQty > 0
              ? 'border-primary bg-primary text-primary-foreground shadow-sm hover:opacity-90'
              : 'border-primary/70 text-primary hover:bg-primary hover:text-primary-foreground',
        )}
      >
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </li>
  )
}
