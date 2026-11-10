'use client'

import { Lock, Share2, ShoppingBag, Utensils } from 'lucide-react'
import { SITE } from '@/lib/i18n'
import { padTable, type Mode } from '@/lib/order'
import { buildVerifiedTableUrl } from '@/lib/table-token'
import { cn } from '@/lib/utils'
import { useOrder } from './order-provider'

const MODES: { id: Mode; Icon: typeof Utensils }[] = [
  { id: 'dine-in', Icon: Utensils },
  { id: 'takeaway', Icon: ShoppingBag },
]

export function ModeSwitcher({ id: _id }: { id: string }) {
  const { lang, mode, table, isTableVerified, setMode, t, showToast } = useOrder()

  const handleShareTable = async () => {
    if (!table || typeof window === 'undefined') return
    const url = buildVerifiedTableUrl(window.location.origin, table, lang)
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${SITE.name} — Table ${padTable(table)}`,
          text: `Order with me at Table ${padTable(table)} at Fornello Pizza!`,
          url,
        })
        return
      } catch {
        // Fallback to clipboard
      }
    }
    await navigator.clipboard.writeText(url)
    showToast(t.tableCopied)
  }

  const handleModeClick = (modeId: Mode) => {
    if (modeId === 'dine-in' && !isTableVerified && !table) {
      showToast(t.dineInQrOnly)
      return
    }
    setMode(modeId)
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        role="radiogroup"
        aria-label={t.orderType}
        className="grid grid-cols-2 gap-1 rounded-full border border-border bg-background/70 p-1"
      >
        {MODES.map(({ id: modeId, Icon }) => {
          const isSelected = mode === modeId
          const isDineInDisabled = modeId === 'dine-in' && !isTableVerified && !table

          return (
            <button
              key={modeId}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => handleModeClick(modeId)}
              className={cn(
                'flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                isSelected
                  ? 'bg-primary text-primary-foreground'
                  : isDineInDisabled
                    ? 'text-muted-foreground/60 hover:text-foreground'
                    : 'text-foreground hover:bg-foreground/10',
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              <span>{modeId === 'dine-in' ? t.dineIn : t.takeaway}</span>
              {modeId === 'dine-in' && table && isTableVerified ? (
                <span className="grid size-4 place-items-center rounded-full bg-emerald-500/20 text-emerald-300">
                  <Lock className="size-2.5" aria-hidden="true" />
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      {mode === 'dine-in' && table ? (
        <div className="flex flex-col gap-2 rounded-2xl border border-primary/30 bg-primary/10 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="grid size-7 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm">
                <Lock className="size-3.5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-display text-base font-semibold uppercase tracking-wide">
                  {`${t.table} ${padTable(table)}`}
                </p>
                <p className="text-[11px] font-medium text-emerald-400">{t.tableVerifiedBadge}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleShareTable}
              className="flex h-8 items-center gap-1.5 rounded-full border border-primary/40 bg-background/70 px-2.5 text-xs font-medium hover:bg-background transition-colors"
              title={t.shareTable}
            >
              <Share2 className="size-3.5 text-primary" aria-hidden="true" />
              <span className="text-[11px] font-semibold">{t.shareTable}</span>
            </button>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground border-t border-primary/20 pt-2">
            {t.tableChangeHint}
          </p>
        </div>
      ) : mode === 'dine-in' && !table ? (
        <div className="rounded-2xl border border-border bg-secondary/40 p-3.5 text-xs leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">{t.dineIn}</p>
          <p className="mt-1">{t.dineInQrOnly}</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-secondary/40 p-3.5 text-xs leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">{t.takeaway}</p>
          <p className="mt-1">{t.pickupAtCounter}</p>
          {!table ? <p className="mt-1 text-[11px] text-primary">{t.dineInNoticeOnline}</p> : null}
        </div>
      )}
    </div>
  )
}
