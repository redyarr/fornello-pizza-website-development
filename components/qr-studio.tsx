'use client'

import { ArrowLeft, Check, Copy, Printer } from 'lucide-react'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import { useState, useSyncExternalStore } from 'react'
import { flushSync } from 'react-dom'
import { SITE } from '@/lib/i18n'
import type { Lang } from '@/lib/menu'
import { orderQuery, padTable } from '@/lib/order'
import { Tricolor } from './tricolor'

type Target = 'takeaway' | number

import { buildVerifiedTableUrl } from '@/lib/table-token'

const TABLES = Array.from({ length: SITE.tableCount }, (_, i) => i + 1)
const ALL_TARGETS: Target[] = [...TABLES, 'takeaway']
const subscribeNoop = () => () => {}

function targetUrl(base: string, target: Target, lang: Lang): string {
  if (target === 'takeaway') {
    const query = orderQuery({ mode: 'takeaway', table: null, lang })
    return `${base.replace(/\/+$/, '')}/${query}`
  }
  return buildVerifiedTableUrl(base, target, lang)
}

function QrCard({ url, target }: { url: string; target: Target }) {
  return (
    <div className="flex w-full max-w-80 flex-col items-center gap-4 rounded-3xl bg-foreground px-6 py-8 text-center text-background sm:px-8 sm:py-9 [print-color-adjust:exact]">
      <p className="font-display text-4xl leading-none font-semibold tracking-[0.14em]">FORNELLO</p>
      <Tricolor className="[&>span:nth-child(2)]:bg-background/20" />
      <div className="rounded-2xl border-2 border-dashed border-background/50 p-3 sm:p-4">
        <QRCodeSVG value={url} size={192} level="M" bgColor="transparent" fgColor="#16211c" className="h-auto max-w-full" />
      </div>
      <p className="font-display text-4xl leading-none font-semibold tracking-wide uppercase">
        {target === 'takeaway' ? 'Takeaway' : `Table ${padTable(target)}`}
      </p>
      <div className="text-sm leading-relaxed">
        <p>Scan to see the menu and order</p>
        <p lang="ckb" dir="rtl">
          سکان بکە بۆ بینینی مینیۆ و داواکردن
        </p>
      </div>
      <p className="text-xs">{SITE.instagramHandle}</p>
    </div>
  )
}

export function QrStudio() {
  const origin = useSyncExternalStore(
    subscribeNoop,
    () => window.location.origin,
    () => '',
  )
  const [customBase, setCustomBase] = useState<string | null>(null)
  const [target, setTarget] = useState<Target>(1)
  const [lang, setLang] = useState<Lang>('en')
  const [printAll, setPrintAll] = useState(false)
  const [copied, setCopied] = useState(false)

  const base = customBase ?? origin
  const url = targetUrl(base, target, lang)
  const fieldClass =
    'h-12 rounded-xl border border-input bg-secondary px-4 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

  const print = (all: boolean) => {
    flushSync(() => setPrintAll(all))
    window.print()
    setPrintAll(false)
  }

  const copy = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <main className="mx-auto min-h-dvh max-w-5xl px-4 py-8 print:max-w-none print:p-0">
      <div className="print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to the menu
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/floor" className="text-sm font-medium text-accent hover:underline">
              Live Floor Monitor →
            </Link>
            <Link href="/admin" className="text-sm font-medium text-primary hover:underline">
              Staff Menu Studio →
            </Link>
          </div>
        </div>
        <h1 className="mt-6 font-display text-4xl font-medium tracking-wide uppercase">Table QR Studio</h1>
        <p className="mt-2 max-w-xl leading-relaxed text-muted-foreground">
          Pick a table or the takeaway counter, then print the card. Guests who scan it land on the menu already set to
          that table.
        </p>
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-[1fr_auto] print:mt-0 print:block">
        <form className="flex flex-col gap-5 print:hidden" onSubmit={(event) => event.preventDefault()}>
          <div className="flex flex-col gap-2">
            <label htmlFor="qr-target" className="text-sm font-medium">
              Card for
            </label>
            <select
              id="qr-target"
              value={String(target)}
              onChange={(event) =>
                setTarget(event.target.value === 'takeaway' ? 'takeaway' : Number(event.target.value))
              }
              className={fieldClass}
            >
              <option value="takeaway">Takeaway counter</option>
              {TABLES.map((n) => (
                <option key={n} value={n}>
                  {`Table ${padTable(n)}`}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="qr-lang" className="text-sm font-medium">
              Menu opens in
            </label>
            <select
              id="qr-lang"
              value={lang}
              onChange={(event) => setLang(event.target.value === 'ckb' ? 'ckb' : 'en')}
              className={fieldClass}
            >
              <option value="en">English</option>
              <option value="ckb">کوردی</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="qr-base" className="text-sm font-medium">
              Website address
            </label>
            <input
              id="qr-base"
              type="url"
              inputMode="url"
              value={base}
              onChange={(event) => setCustomBase(event.target.value)}
              placeholder="https://your-domain.com"
              aria-describedby="qr-base-hint"
              className={fieldClass}
            />
            <p id="qr-base-hint" className="text-sm leading-relaxed text-muted-foreground">
              Use your published domain before printing. A code printed with a preview address stops working when that
              address changes.
            </p>
          </div>

          <div className="flex flex-col gap-2 rounded-xl bg-secondary px-4 py-3">
            <p className="text-sm font-medium">Link in this code</p>
            <p className="text-sm break-all text-muted-foreground">{url}</p>
            <button
              type="button"
              onClick={copy}
              className="flex h-9 w-fit items-center gap-2 rounded-full border border-border px-3 text-sm font-medium hover:bg-foreground/10"
            >
              {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
              <span aria-live="polite">{copied ? 'Copied' : 'Copy link'}</span>
            </button>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => print(false)}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-5 font-medium text-primary-foreground hover:opacity-90"
            >
              <Printer className="size-4" aria-hidden="true" />
              Print this card
            </button>
            <button
              type="button"
              onClick={() => print(true)}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full border border-primary/70 px-5 font-medium text-primary hover:bg-primary hover:text-primary-foreground"
            >
              {`Print all ${ALL_TARGETS.length} cards`}
            </button>
          </div>
        </form>

        {printAll ? (
          <div className="hidden print:block">
            {ALL_TARGETS.map((t) => (
              <div key={t} className="flex h-screen break-after-page items-center justify-center">
                <QrCard url={targetUrl(base, t, lang)} target={t} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex justify-center md:justify-end print:h-screen print:items-center print:justify-center">
            <QrCard url={url} target={target} />
          </div>
        )}
      </div>
    </main>
  )
}
