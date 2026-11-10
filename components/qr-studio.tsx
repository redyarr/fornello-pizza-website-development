'use client'

import { ArrowLeft, Check, Copy, Lock, Printer, ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { flushSync } from 'react-dom'
import {
  getLockoutStatus,
  isPasskeyEnrolled,
  isSessionAuthorized,
  isTotpEnabled,
  isWebAuthnSupported,
  verifyKeyfileToken,
  verifyPasskey,
  verifyPassphrase,
  verifyTotpCode,
  type LockoutStatus,
} from '@/lib/auth'
import { SITE, STRINGS } from '@/lib/i18n'
import type { Lang } from '@/lib/menu'
import { orderQuery, padTable } from '@/lib/order'
import { buildVerifiedTableUrl } from '@/lib/table-token'
import { cn } from '@/lib/utils'
import { Tricolor } from './tricolor'

type Target = 'takeaway' | number

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

export function QrStudio({ embedded = false }: { embedded?: boolean }) {
  const origin = useSyncExternalStore(
    subscribeNoop,
    () => window.location.origin,
    () => '',
  )
  const [authed, setAuthed] = useState(embedded)
  const [authTab, setAuthTab] = useState<'passkey' | 'passphrase' | 'totp' | 'keyfile'>('passphrase')
  const [passphrase, setPassphrase] = useState('')
  const [totpInput, setTotpInput] = useState('')
  const [keyfileText, setKeyfileText] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [lockout, setLockout] = useState<LockoutStatus>(() => getLockoutStatus())
  const [lockoutRemaining, setLockoutRemaining] = useState(0)

  const [customBase, setCustomBase] = useState<string | null>(null)
  const [target, setTarget] = useState<Target>(1)
  const [lang, setLang] = useState<Lang>('en')
  const [printAll, setPrintAll] = useState(false)
  const [copied, setCopied] = useState(false)

  const t = STRINGS[lang]
  const base = customBase ?? origin
  const url = targetUrl(base, target, lang)
  const fieldClass =
    'h-12 rounded-xl border border-input bg-secondary px-4 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

  useEffect(() => {
    if (embedded || isSessionAuthorized()) {
      setAuthed(true)
    }
  }, [embedded])

  useEffect(() => {
    if (isPasskeyEnrolled() && isWebAuthnSupported()) {
      setAuthTab('passkey')
    } else if (isTotpEnabled()) {
      setAuthTab('totp')
    }
  }, [])

  useEffect(() => {
    if (embedded || authed) return
    const updateCountdown = () => {
      const status = getLockoutStatus()
      setLockout(status)
      const diff = Math.max(0, Math.ceil((status.lockedUntil - Date.now()) / 1000))
      setLockoutRemaining(diff)
    }
    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)
    return () => clearInterval(timer)
  }, [embedded, authed])

  const handlePasskeyLogin = async () => {
    if (lockoutRemaining > 0 || isVerifying) return
    setIsVerifying(true)
    setAuthError(null)
    try {
      const ok = await verifyPasskey()
      if (ok) setAuthed(true)
      else {
        setAuthError(t.passkeyError)
        setLockout(getLockoutStatus())
      }
    } finally {
      setIsVerifying(false)
    }
  }

  const handleTotpLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (lockoutRemaining > 0 || isVerifying || totpInput.trim().length !== 6) return
    setIsVerifying(true)
    setAuthError(null)
    try {
      const ok = await verifyTotpCode(totpInput)
      if (ok) {
        setAuthed(true)
        setTotpInput('')
      } else {
        setAuthError(t.totpInvalid)
        setLockout(getLockoutStatus())
      }
    } finally {
      setIsVerifying(false)
    }
  }

  const handlePassphraseLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (lockoutRemaining > 0 || isVerifying || !passphrase.trim()) return
    setIsVerifying(true)
    setAuthError(null)
    try {
      const ok = await verifyPassphrase(passphrase)
      if (ok) {
        setAuthed(true)
        setPassphrase('')
      } else {
        setAuthError(t.authFailed)
        setLockout(getLockoutStatus())
      }
    } finally {
      setIsVerifying(false)
    }
  }

  const handleKeyfilePasteLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!keyfileText.trim()) return
    const ok = verifyKeyfileToken(keyfileText)
    if (ok) {
      setAuthed(true)
      setAuthError(null)
      setKeyfileText('')
    } else {
      setAuthError(t.authFailed)
      setLockout(getLockoutStatus())
    }
  }

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

  if (!embedded && !authed) {
    const isLocked = lockoutRemaining > 0 || lockout.permanentlyLocked

    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
        <div className="flex flex-col items-center gap-6 rounded-3xl border border-border bg-card p-7 text-center shadow-2xl">
          <div className="grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <Lock className="size-7" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-3xl font-semibold tracking-wide uppercase">Table QR Studio</h1>
            <Tricolor />
            <p className="mt-2 text-xs text-muted-foreground">Protected Staff Table QR Generator</p>
          </div>

          {isLocked ? (
            <div className="flex w-full items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/15 p-4 text-start text-destructive">
              <ShieldAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <div className="text-xs leading-relaxed">
                <p className="text-sm font-semibold">Security Lockout Active</p>
                <p className="mt-1">
                  {lockout.permanentlyLocked ? t.permanentlyLockedMessage : t.lockedOutMessage(lockoutRemaining)}
                </p>
              </div>
            </div>
          ) : null}

          <div className="grid w-full grid-cols-2 gap-1 rounded-2xl border border-border p-1 text-xs font-medium sm:grid-cols-4 sm:rounded-full">
            <button
              type="button"
              onClick={() => {
                setAuthTab('passkey')
                setAuthError(null)
              }}
              className={cn(
                'rounded-full py-1.5 transition-colors',
                authTab === 'passkey' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Passkey
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthTab('totp')
                setAuthError(null)
              }}
              className={cn(
                'rounded-full py-1.5 transition-colors',
                authTab === 'totp' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              2FA Code
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthTab('passphrase')
                setAuthError(null)
              }}
              className={cn(
                'rounded-full py-1.5 transition-colors',
                authTab === 'passphrase' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Passphrase
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthTab('keyfile')
                setAuthError(null)
              }}
              className={cn(
                'rounded-full py-1.5 transition-colors',
                authTab === 'keyfile' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Keyfile
            </button>
          </div>

          {authTab === 'passkey' ? (
            <button
              type="button"
              disabled={isLocked || isVerifying}
              onClick={handlePasskeyLogin}
              className="h-12 w-full rounded-full bg-primary text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {isVerifying ? 'Authenticating…' : t.passkeySignIn}
            </button>
          ) : null}

          {authTab === 'totp' ? (
            <form onSubmit={handleTotpLogin} className="flex w-full flex-col gap-3">
              <input
                type="text"
                maxLength={6}
                value={totpInput}
                onChange={(e) => setTotpInput(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="000 000"
                className="h-12 w-full rounded-xl border border-input bg-secondary px-3 text-center font-mono text-xl tracking-widest"
              />
              <button
                type="submit"
                disabled={isLocked || isVerifying || totpInput.length !== 6}
                className="h-12 w-full rounded-full bg-primary text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {isVerifying ? 'Verifying 2FA…' : t.totpVerifyBtn}
              </button>
            </form>
          ) : null}

          {authTab === 'passphrase' ? (
            <form onSubmit={handlePassphraseLogin} className="flex w-full flex-col gap-3">
              <input
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder={t.passphrasePlaceholder}
                className="h-12 w-full rounded-xl border border-input bg-secondary px-4 text-sm"
              />
              <button
                type="submit"
                disabled={isLocked || isVerifying || !passphrase.trim()}
                className="h-12 w-full rounded-full bg-primary text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {isVerifying ? 'Deriving Keys…' : t.unlock}
              </button>
            </form>
          ) : null}

          {authTab === 'keyfile' ? (
            <form onSubmit={handleKeyfilePasteLogin} className="flex w-full flex-col gap-3">
              <input
                type="text"
                value={keyfileText}
                onChange={(e) => setKeyfileText(e.target.value)}
                placeholder="Paste FORNELLO-STAFF-KEY-..."
                className="h-11 rounded-xl border border-input bg-secondary px-3 font-mono text-xs"
              />
              <button
                type="submit"
                disabled={!keyfileText.trim()}
                className="h-11 rounded-full border border-primary text-xs font-medium text-primary hover:bg-primary hover:text-primary-foreground"
              >
                Unlock with Key Token
              </button>
            </form>
          ) : null}

          {authError ? <p className="text-xs text-destructive">{authError}</p> : null}

          <Link href="/" className="mt-2 text-sm text-muted-foreground hover:text-foreground">
            ← {t.seeMenu}
          </Link>
        </div>
      </main>
    )
  }

  const Wrapper = embedded ? 'div' : 'main'

  return (
    <Wrapper
      className={cn(
        embedded ? 'mt-6 print:mt-0' : 'mx-auto min-h-dvh max-w-5xl px-4 py-8',
        'print:max-w-none print:p-0',
      )}
    >
      <div className="print:hidden">
        {!embedded ? (
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
        ) : null}
        <div className={cn(embedded ? 'rounded-3xl border border-border bg-card p-6' : 'mt-6')}>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-wide uppercase">
            Table QR Studio
          </h2>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Pick a table or the takeaway counter, then print the card. Guests who scan it land on the menu already set to
            that table with cryptographic verification.
          </p>
        </div>
      </div>

      <div className={cn('mt-6 grid gap-8 md:grid-cols-[1fr_auto] print:mt-0 print:block', embedded && 'rounded-3xl border border-border bg-card p-6 print:border-0 print:bg-transparent print:p-0')}>
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
    </Wrapper>
  )
}
