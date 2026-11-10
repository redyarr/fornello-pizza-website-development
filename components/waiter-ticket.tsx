'use client'

import { ArrowLeft, Bell, Check, CheckCircle2, MessageCircle, Printer } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useState } from 'react'
import { dispatchTableCall, ENABLE_WAITER_QR_SYNC, encodeTableSyncPayload } from '@/lib/floor'
import { SITE } from '@/lib/i18n'
import {
  buildReceipt,
  cartTotal,
  describeLineSelections,
  formatIQD,
  lineTotal,
  needsPacing,
  padTable,
  prepEstimate,
  resolveLineItem,
  whatsappUrl,
} from '@/lib/order'
import { playBellChime } from '@/lib/sound'
import { useOrder } from './order-provider'
import { Sheet } from './sheet'
import { Tricolor } from './tricolor'

type WaiterTicketProps = { open: boolean; time: string; onBack: () => void; onFinish: () => void }

export function WaiterTicket({ open, time, onBack, onFinish }: WaiterTicketProps) {
  const {
    lang,
    t,
    mode,
    table,
    deviceId,
    lines,
    pacing,
    customerName,
    note,
    orderRef,
    clearOrder,
    activePlacedOrder,
    clearActivePlacedOrder,
  } = useOrder()
  const [waiterCalled, setWaiterCalled] = useState(false)
  const [staffConfirmed, setStaffConfirmed] = useState(false)

  const activeLines = activePlacedOrder?.lines && activePlacedOrder.lines.length > 0 ? activePlacedOrder.lines : lines
  const activeMode = activePlacedOrder?.mode ?? mode
  const activeTable = activePlacedOrder?.table ?? table
  const activePacing = activePlacedOrder?.pacing ?? pacing
  const activeName = (activePlacedOrder?.customerName ?? customerName).trim()
  const activeNote = (activePlacedOrder?.note ?? note).trim()
  const activeRef = activePlacedOrder?.orderRef ?? orderRef
  const activeTime = activePlacedOrder?.timestamp ?? time

  const dineIn = activeMode === 'dine-in'
  const [low, high] = prepEstimate(activeLines)

  const handleCallWaiter = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([40, 60, 40])
    }
    if (activeTable) {
      dispatchTableCall(activeTable, 'waiter', deviceId)
      playBellChime()
    }
    setWaiterCalled(true)
    setTimeout(() => setWaiterCalled(false), 8000)
  }

  return (
    <Sheet open={open} onClose={onBack} label={dineIn ? t.ticketHintWaiter : t.ticketHintCounter} variant="full">
      <div className="mx-auto flex h-full w-full max-w-xl flex-col">
        <div className="flex items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-5 sm:py-4">
          <button
            type="button"
            onClick={onBack}
            className="flex h-9 sm:h-10 shrink-0 items-center gap-1.5 sm:gap-2 rounded-full border border-background/30 px-3 sm:px-4 text-xs sm:text-sm font-medium hover:bg-background/10"
          >
            <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
            <span>{t.backToOrder}</span>
          </button>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex h-9 items-center gap-1.5 rounded-full border border-background/30 px-2.5 sm:px-3 text-xs font-medium hover:bg-background/10 print:hidden"
              title={t.printThermalTicket}
            >
              <Printer className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">{t.printThermalTicket}</span>
            </button>
            <span className="rounded-full border border-background/30 px-2.5 py-0.5 text-xs font-mono font-semibold tracking-wider">
              {activeRef}
            </span>
            <p className="text-xs sm:text-sm tabular-nums">{activeTime}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6 sm:px-5">
          <div className="flex flex-col items-center gap-2 border-b-2 border-dashed border-background/40 pb-5 text-center">
            {activePlacedOrder ? (
              <div className="w-full mb-2 flex items-center justify-center gap-3 rounded-2xl border-2 border-emerald-500/80 bg-emerald-500/20 py-3.5 px-4 text-emerald-100 print:hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="grid size-8 place-items-center rounded-full bg-emerald-500 text-emerald-950 shrink-0">
                  <CheckCircle2 className="size-5" aria-hidden="true" />
                </div>
                <div className="text-start">
                  <p className="text-sm font-bold tracking-wide">
                    {dineIn ? t.orderSentTitle : t.orderSentCounterTitle}
                  </p>
                  <p className="text-xs opacity-90">{t.orderSentSubtitle}</p>
                </div>
              </div>
            ) : null}

            <p lang="en" className="font-display text-2xl font-semibold tracking-[0.18em]">
              FORNELLO
            </p>
            <Tricolor className="[&>span:nth-child(2)]:bg-background/20" />
            <p className="text-sm">{dineIn ? t.ticketHintWaiter : t.ticketHintCounter}</p>
            <p className="font-display text-4xl sm:text-5xl md:text-6xl leading-tight font-semibold tracking-wide uppercase break-words">
              {dineIn ? `${t.table} ${activeTable ? padTable(activeTable) : ''}` : t.takeaway}
            </p>
            {!dineIn && activeName ? <p className="text-2xl font-semibold">{activeName}</p> : null}
            {!dineIn ? <p className="text-sm">{t.readyIn(low, high)}</p> : null}

            {!dineIn ? (
              <a
                href={whatsappUrl(
                  buildReceipt({
                    lang,
                    t,
                    mode: 'takeaway',
                    table: null,
                    lines: activeLines,
                    pacing: activePacing,
                    customerName: activeName,
                    customerPhone: '',
                    note: activeNote,
                    orderRef: activeRef,
                  }),
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-2 rounded-full border border-background/40 px-4 py-2 text-xs font-semibold hover:bg-background/10 print:hidden"
              >
                <MessageCircle className="size-3.5" aria-hidden="true" />
                <span>{t.sendWhatsApp}</span>
              </a>
            ) : null}

            {ENABLE_WAITER_QR_SYNC && dineIn && activeTable ? (
              <div className="my-2 flex flex-col items-center gap-1 rounded-2xl bg-white p-3 shadow-md print:hidden">
                <QRCodeSVG
                  value={encodeTableSyncPayload(activeTable, activeRef, activeLines, cartTotal(activeLines))}
                  size={120}
                  level="M"
                />
                <span className="font-mono text-[10px] text-zinc-700">Scan for live floor monitor</span>
              </div>
            ) : null}
            {dineIn && needsPacing(activeLines) ? (
              <p className="rounded-full bg-background px-4 py-1.5 text-sm font-medium text-foreground">
                {`${t.coffeeService}: ${t.pacing[activePacing]}`}
              </p>
            ) : null}

            {staffConfirmed ? (
              <div className="mt-2 flex items-center gap-2 rounded-full border-2 border-emerald-500 bg-emerald-500/10 px-4 py-1.5 text-sm font-semibold text-emerald-800 dark:text-emerald-400">
                <CheckCircle2 className="size-4" aria-hidden="true" />
                {t.ticketReceived}
              </div>
            ) : null}
          </div>

          <ul className="divide-y divide-dashed divide-background/40">
            {activeLines.map((line) => {
              const item = resolveLineItem(line)
              return (
                <li key={line.uid} className="flex items-start gap-4 py-4">
                  <span className="w-10 shrink-0 font-display text-3xl leading-none font-semibold tabular-nums">
                    {`${line.qty}×`}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p lang="en" className="font-display text-2xl leading-tight font-medium tracking-wide uppercase">
                      {item.name}
                    </p>
                    {describeLineSelections(line, lang).map((detail) => (
                      <p key={detail} className="leading-relaxed">
                        {detail}
                      </p>
                    ))}
                    {line.notes ? (
                      <p className="mt-1 text-sm font-medium italic opacity-90">
                        📝 {line.notes}
                      </p>
                    ) : null}
                  </div>
                  <p className="shrink-0 font-medium tabular-nums">{formatIQD(lineTotal(line))}</p>
                </li>
              )
            })}
          </ul>

          {activeNote.trim() ? (
            <p className="mt-4 rounded-xl border-2 border-background/40 px-4 py-3 leading-relaxed">
              <span className="font-semibold">{`${t.note}: `}</span>
              {activeNote.trim()}
            </p>
          ) : null}

          {dineIn ? (
            <div className="mt-6 flex flex-col items-center gap-2 border-t border-dashed border-background/30 pt-5">
              <button
                type="button"
                onClick={handleCallWaiter}
                disabled={waiterCalled}
                className="flex h-11 items-center gap-2 rounded-full border border-background/40 px-5 text-sm font-medium hover:bg-background/10 disabled:opacity-60"
              >
                {waiterCalled ? <Check className="size-4 text-emerald-600" aria-hidden="true" /> : <Bell className="size-4" aria-hidden="true" />}
                {waiterCalled ? t.waiterCalled : t.callWaiter}
              </button>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2.5 border-t-2 border-background px-4 pt-3.5 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5 sm:pt-4">
          <div className="flex items-baseline justify-between">
            <span className="font-display text-xl tracking-wide uppercase">{t.total}</span>
            <span className="text-2xl sm:text-3xl font-semibold tabular-nums">{formatIQD(cartTotal(activeLines))}</span>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onBack}
              className="h-11 sm:h-12 flex-1 rounded-full bg-background px-4 text-sm font-semibold text-foreground hover:opacity-90 transition-opacity"
            >
              {t.backToMenu}
            </button>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-1">
              {!staffConfirmed ? (
                <button
                  type="button"
                  onClick={() => setStaffConfirmed(true)}
                  className="flex h-11 sm:h-12 flex-1 items-center justify-center gap-1.5 rounded-full border border-background/40 px-3 text-xs sm:text-sm font-medium text-background hover:bg-background/10 transition-colors"
                >
                  <Check className="size-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{t.markReceived}</span>
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  clearOrder()
                  clearActivePlacedOrder()
                  onFinish()
                }}
                className="h-11 sm:h-12 flex-1 rounded-full border border-background/40 px-3 text-xs sm:text-sm font-medium text-background hover:bg-background/10 transition-colors truncate"
              >
                {t.startNewOrder}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Sheet>
  )
}
