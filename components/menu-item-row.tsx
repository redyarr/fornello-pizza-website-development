'use client'

import { Flame, Leaf, Plus } from 'lucide-react'
import { MODIFIER_GROUPS, type MenuItem } from '@/lib/menu'
import { formatIQD } from '@/lib/order'
import { useOrder } from './order-provider'

export function MenuItemRow({ item, onSelect }: { item: MenuItem; onSelect: (item: MenuItem) => void }) {
  const { lang, t } = useOrder()
  const hasPricedSize = item.groups.some(
    (id) => MODIFIER_GROUPS[id].min > 0 && MODIFIER_GROUPS[id].options.some((o) => o.price > 0),
  )

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(item)}
        className="group flex w-full items-center gap-4 py-4 text-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span lang="en" className="font-display text-lg leading-snug font-medium tracking-wide uppercase">
              {item.name}
            </span>
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
              {lang === 'en' ? (
                <bdi lang="ckb" className="ms-2 text-foreground/70">
                  {item.description.ckb}
                </bdi>
              ) : null}
            </span>
          ) : null}
        </span>
        <span className="shrink-0 text-end text-sm font-medium tabular-nums">
          {hasPricedSize ? <span className="block text-xs font-normal text-muted-foreground">{t.from}</span> : null}
          {formatIQD(item.price)}
        </span>
        <span className="grid size-9 shrink-0 place-items-center rounded-full border border-primary/70 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          <Plus className="size-4" aria-hidden="true" />
          <span className="sr-only">{t.customize}</span>
        </span>
      </button>
    </li>
  )
}
