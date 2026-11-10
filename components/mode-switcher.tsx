'use client'

import { FlaskConical, Lock, QrCode, Share2, ShoppingBag, Smartphone, Utensils } from 'lucide-react'
import { useState } from 'react'
import { SITE } from '@/lib/i18n'
import { padTable, type Mode } from '@/lib/order'
import { buildVerifiedTableUrl } from '@/lib/table-token'
import { cn } from '@/lib/utils'
import { useOrder } from './order-provider'

const MODES: { id: Mode; Icon: typeof Utensils }[] = [
  { id: 'dine-in', Icon: Utensils },
  { id: 'takeaway', Icon: ShoppingBag },
]

const IS_DEV = process.env.NODE_ENV === 'development'

export function ModeSwitcher({ id }: { id: string }) {
  const {
    lang,
    mode,
    table,
    deviceId,
    verifiedTable,
    isTableVerified,
    setMode,
    simulateTableScan,
    simulateNewCustomerPhone,
    t,
    showToast,
  } = useOrder()
  const [showQrHint, setShowQrHint] = useState(false)
  const hasVerifiedTable = Boolean(verifiedTable || (table && isTableVerified))

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
    if (modeId === 'dine-in' && !hasVerifiedTable) {
      if (IS_DEV) {
        // In developer mode, immediately simulate scanning Table 01 so testing is 1-click!
        simulateTableScan(1)
        setShowQrHint(false)
        return
      }
      setShowQrHint(true)
      return
    }
    setShowQrHint(false)
    setMode(modeId)
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        role="radiogroup"
        aria-label={t.orderType}
        className="grid grid-cols-2 gap-1.5 rounded-full border border-border bg-background/80 p-1.5 backdrop-blur-xs"
      >
        {MODES.map(({ id: modeId, Icon }) => {
          const isSelected = mode === modeId && !(modeId === 'takeaway' && showQrHint)
          const isHintActive = modeId === 'dine-in' && showQrHint && !hasVerifiedTable

          return (
            <button
              key={modeId}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => handleModeClick(modeId)}
              className={cn(
                'flex min-h-11 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                isSelected
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : isHintActive
                    ? 'border border-primary/50 bg-primary/15 text-primary'
                    : 'text-foreground/85 hover:bg-foreground/10 hover:text-foreground',
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{modeId === 'dine-in' ? t.dineIn : t.takeaway}</span>
              {modeId === 'dine-in' && hasVerifiedTable ? (
                <span className="grid size-4 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <Lock className="size-2.5" aria-hidden="true" />
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      {showQrHint && !hasVerifiedTable ? (
        <div className="flex items-start gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-3.5 text-sm leading-relaxed text-foreground animate-in fade-in-0 slide-in-from-top-1 duration-150">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/20 text-primary">
            <QrCode className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-primary">{t.scanPlacardHint}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">{t.dineInQrOnly}</p>
          </div>
        </div>
      ) : mode === 'dine-in' && table ? (
        <div className="flex flex-col gap-2.5 rounded-2xl border border-primary/35 bg-primary/10 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-xs">
                <Lock className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="font-display text-base font-semibold tracking-wide uppercase">
                  {`${t.table} ${padTable(table)}`}
                </p>
                <p className="text-xs font-medium text-emerald-400">{t.tableVerifiedBadge}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleShareTable}
              className="flex h-9 items-center gap-1.5 rounded-full border border-primary/40 bg-background/70 px-3 text-xs font-semibold hover:bg-background transition-colors"
              title={t.shareTable}
            >
              <Share2 className="size-3.5 text-primary" aria-hidden="true" />
              <span>{t.shareTable}</span>
            </button>
          </div>
          <p className="border-t border-primary/20 pt-2 text-xs leading-relaxed text-muted-foreground">
            {t.tableChangeHint}
          </p>
        </div>
      ) : (
        <p className="px-1 text-sm leading-relaxed text-muted-foreground">{t.pickupAtCounter}</p>
      )}

      {IS_DEV ? (
        <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-amber-500/40 bg-amber-500/10 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor={`${id}-dev-sim`} className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
              <FlaskConical className="size-3.5 shrink-0" aria-hidden="true" />
              <span>{lang === 'ckb' ? 'دۆخی گەشەپێدەر · تاقیکردنەوەی مێزەکان' : 'Dev Mode · Simulate Table QR'}</span>
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={simulateNewCustomerPhone}
                title="Simulate a brand-new customer phone scanning this table"
                className="flex h-8 items-center gap-1.5 rounded-full border border-amber-400/50 bg-amber-400/15 px-2.5 text-[11px] font-semibold text-amber-200 hover:bg-amber-400 hover:text-amber-950 transition-colors"
              >
                <Smartphone className="size-3.5 shrink-0" aria-hidden="true" />
                <span>{lang === 'ckb' ? `مۆبایلی نوێ (${deviceId})` : `New Phone (${deviceId})`}</span>
              </button>
              <select
                id={`${id}-dev-sim`}
                value={mode === 'dine-in' && table ? String(table) : ''}
                onChange={(e) => {
                  const val = e.target.value
                  simulateTableScan(val ? Number(val) : null)
                  setShowQrHint(false)
                }}
                className="h-8 rounded-full border border-amber-500/40 bg-background px-3 text-xs font-semibold text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              >
                <option value="">{lang === 'ckb' ? 'سەفەری (ماڵەوە / دەرەوە)' : 'Takeaway (Home / Outside)'}</option>
                {Array.from({ length: SITE.tableCount }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {`${t.table} ${padTable(n)}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="no-scrollbar flex items-center gap-1 overflow-x-auto pt-0.5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  simulateTableScan(n)
                  setShowQrHint(false)
                }}
                className={cn(
                  'h-7 shrink-0 rounded-full px-2.5 text-xs font-semibold tabular-nums transition-colors',
                  mode === 'dine-in' && table === n
                    ? 'bg-amber-400 text-amber-950'
                    : 'border border-amber-500/30 bg-background/60 text-amber-200 hover:bg-amber-500/20',
                )}
              >
                {padTable(n)}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
