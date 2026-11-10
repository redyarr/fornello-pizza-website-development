'use client'

import { Minus, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { MODIFIER_GROUPS, type MenuItem, type ModifierGroup } from '@/lib/menu'
import { defaultSelections, formatIQD, isComplete, unitPrice, type Selections } from '@/lib/order'
import { cn } from '@/lib/utils'
import { useOrder } from './order-provider'
import { Sheet } from './sheet'

export function ItemSheet({ item, onClose }: { item: MenuItem | null; onClose: () => void }) {
  return (
    <Sheet open={item !== null} onClose={onClose} label={item?.name ?? ''}>
      {item ? <ItemForm key={item.id} item={item} onClose={onClose} /> : null}
    </Sheet>
  )
}

function ItemForm({ item, onClose }: { item: MenuItem; onClose: () => void }) {
  const { lang, t, addLine } = useOrder()
  const [selections, setSelections] = useState<Selections>(() => defaultSelections(item))
  const [qty, setQty] = useState(1)
  const complete = isComplete(item, selections)

  const toggle = (group: ModifierGroup, optionId: string) => {
    setSelections((prev) => {
      const current = prev[group.id] ?? []
      if (group.max === 1) return { ...prev, [group.id]: [optionId] }
      if (current.includes(optionId)) return { ...prev, [group.id]: current.filter((id) => id !== optionId) }
      if (current.length >= group.max) return prev
      return { ...prev, [group.id]: [...current, optionId] }
    })
  }

  return (
    <>
      <div className="flex items-start justify-between gap-4 border-b border-dashed border-foreground/30 px-5 py-4">
        <div className="min-w-0">
          <h2 lang="en" className="font-display text-2xl leading-tight font-medium tracking-wide uppercase">
            {item.name}
          </h2>
          {item.description ? (
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.description[lang]}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t.close}
          className="grid size-9 shrink-0 place-items-center rounded-full border border-border hover:bg-foreground/10"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-5 py-5 [&>*]:shrink-0">
        {item.groups.map((groupId) => {
          const group = MODIFIER_GROUPS[groupId]
          const picked = selections[group.id] ?? []
          const single = group.max === 1
          const hint = single
            ? t.pickOne
            : group.min === group.max
              ? t.chooseExactly(group.max, picked.length)
              : t.upTo(group.max)
          return (
            <fieldset key={group.id} className="flex flex-col gap-3">
              <legend className="flex w-full items-baseline justify-between gap-3">
                <span className="font-display text-lg tracking-wide uppercase">{group.label[lang]}</span>
                <span className="text-xs text-muted-foreground">{hint}</span>
              </legend>
              <div className={cn('grid gap-2', group.options.length > 3 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1')}>
                {group.options.map((option) => {
                  const checked = picked.includes(option.id)
                  return (
                    <label
                      key={option.id}
                      className="flex min-h-12 cursor-pointer items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-sm transition-colors has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground has-disabled:cursor-not-allowed has-disabled:opacity-50 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring"
                    >
                      <input
                        type={single ? 'radio' : 'checkbox'}
                        name={`${item.id}-${group.id}`}
                        checked={checked}
                        disabled={!single && !checked && picked.length >= group.max}
                        onChange={() => toggle(group, option.id)}
                        className="sr-only"
                      />
                      <span className="font-medium">{option.label[lang]}</span>
                      {option.price > 0 ? (
                        <span className="shrink-0 text-xs tabular-nums">{`+${option.price.toLocaleString('en-US')}`}</span>
                      ) : null}
                    </label>
                  )
                })}
              </div>
            </fieldset>
          )
        })}
      </div>

      <div className="flex shrink-0 items-center gap-3 border-t border-border bg-card px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div role="group" aria-label={t.quantity} className="flex h-12 items-center rounded-full border border-border">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={qty === 1}
            aria-label={t.decrease}
            className="grid h-12 w-10 place-items-center rounded-full disabled:opacity-40"
          >
            <Minus className="size-4" aria-hidden="true" />
          </button>
          <span aria-live="polite" className="w-6 text-center font-medium tabular-nums">
            {qty}
          </span>
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(20, q + 1))}
            aria-label={t.increase}
            className="grid h-12 w-10 place-items-center rounded-full"
          >
            <Plus className="size-4" aria-hidden="true" />
          </button>
        </div>
        <button
          type="button"
          disabled={!complete}
          onClick={() => {
            addLine(item, selections, qty)
            onClose()
          }}
          className="flex h-12 min-w-0 flex-1 items-center justify-between gap-2 rounded-full bg-accent px-4 text-sm font-medium whitespace-nowrap text-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="truncate">{t.addToOrder}</span>
          <span className="tabular-nums">{formatIQD(unitPrice(item, selections) * qty)}</span>
        </button>
      </div>
    </>
  )
}
