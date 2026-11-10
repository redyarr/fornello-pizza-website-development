'use client'

import { ShoppingBag, Utensils } from 'lucide-react'
import { SITE } from '@/lib/i18n'
import { padTable, type Mode } from '@/lib/order'
import { cn } from '@/lib/utils'
import { useOrder } from './order-provider'

const MODES: { id: Mode; Icon: typeof Utensils }[] = [
  { id: 'dine-in', Icon: Utensils },
  { id: 'takeaway', Icon: ShoppingBag },
]

export function ModeSwitcher({ id }: { id: string }) {
  const { mode, table, setMode, setTable, t } = useOrder()

  return (
    <div className="flex flex-col gap-3">
      <div
        role="radiogroup"
        aria-label={t.orderType}
        className="grid grid-cols-2 gap-1 rounded-full border border-border bg-background/70 p-1"
      >
        {MODES.map(({ id: modeId, Icon }) => (
          <button
            key={modeId}
            type="button"
            role="radio"
            aria-checked={mode === modeId}
            onClick={() => setMode(modeId)}
            className={cn(
              'flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              mode === modeId ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-foreground/10',
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {modeId === 'dine-in' ? t.dineIn : t.takeaway}
          </button>
        ))}
      </div>

      {mode === 'dine-in' ? (
        <div className="flex items-center gap-3">
          <label htmlFor={id} className="text-sm font-medium">
            {t.table}
          </label>
          <select
            id={id}
            value={table ?? ''}
            onChange={(event) => setTable(event.target.value ? Number(event.target.value) : null)}
            className="h-11 flex-1 rounded-full border border-input bg-background/70 px-4 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <option value="">{t.selectTable}</option>
            {Array.from({ length: SITE.tableCount }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {`${t.table} ${padTable(n)}`}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <p className="text-sm leading-relaxed text-muted-foreground">{t.pickupAtCounter}</p>
      )}
    </div>
  )
}
