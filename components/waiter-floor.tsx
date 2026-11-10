'use client'

import {
  ArrowLeft,
  Bell,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Droplets,
  Lock,
  Printer,
  QrCode,
  Receipt,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  Sparkles,
  UtensilsCrossed,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {
  clearAuthorizedSession,
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
import {
  acknowledgeTableCall,
  bindTableOrder,
  clearTable,
  decodeTableSyncPayload,
  ENABLE_WAITER_QR_SYNC,
  getInitialFloorState,
  updateTableStatus,
  type ActiveTableCall,
  type FloorState,
  type TableOrderRecord,
} from '@/lib/floor'
import { SITE, STRINGS } from '@/lib/i18n'
import { getItem, type Lang } from '@/lib/menu'
import { describeSelections, formatIQD, lineTotal, padTable } from '@/lib/order'
import { playBellChime } from '@/lib/sound'
import { cn } from '@/lib/utils'
import { Sheet } from './sheet'
import { Tricolor } from './tricolor'

const TABLES = Array.from({ length: SITE.tableCount }, (_, i) => i + 1)

export function WaiterFloor() {
  const [lang, setLang] = useState<Lang>('en')
  const [authed, setAuthed] = useState(false)
  const [authTab, setAuthTab] = useState<'passkey' | 'passphrase' | 'totp' | 'keyfile'>('passphrase')
  const [passphrase, setPassphrase] = useState('')
  const [totpInput, setTotpInput] = useState('')
  const [keyfileText, setKeyfileText] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [lockout, setLockout] = useState<LockoutStatus>(() => getLockoutStatus())
  const [lockoutRemaining, setLockoutRemaining] = useState(0)

  // Live floor state
  const [floorState, setFloorState] = useState<FloorState>(() => getInitialFloorState())
  const [selectedTable, setSelectedTable] = useState<number | null>(null)
  const [filter, setFilter] = useState<'all' | 'calling' | 'occupied' | 'available'>('all')
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [isScanOpen, setIsScanOpen] = useState(false)
  const [scanInput, setScanInput] = useState('')
  const [scanNotice, setScanNotice] = useState<string | null>(null)
  const [activeCallBanner, setActiveCallBanner] = useState<{ table: number; call: ActiveTableCall } | null>(null)

  const t = STRINGS[lang]
  const prevCallsCountRef = useRef(0)

  // Ephemeral Auth check
  useEffect(() => {
    if (isSessionAuthorized()) {
      setAuthed(true)
    }
  }, [])

  // Auto-detect best auth method
  useEffect(() => {
    if (isPasskeyEnrolled() && isWebAuthnSupported()) {
      setAuthTab('passkey')
    } else if (isTotpEnabled()) {
      setAuthTab('totp')
    }
  }, [])

  // Lockout countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      const status = getLockoutStatus()
      setLockout(status)
      const diff = Math.max(0, Math.ceil((status.lockedUntil - Date.now()) / 1000))
      setLockoutRemaining(diff)
    }

    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)
    return () => clearInterval(timer)
  }, [])

  // Live Floor Synchronization (BroadcastChannel + LocalStorage Events)
  useEffect(() => {
    const handleUpdate = () => {
      const fresh = getInitialFloorState()
      setFloorState(fresh)
    }

    let bc: BroadcastChannel | null = null
    if (typeof window !== 'undefined' && typeof window.BroadcastChannel !== 'undefined') {
      bc = new BroadcastChannel('fornello_floor_mesh_channel')
      bc.onmessage = (event) => {
        if (event.data?.payload) {
          setFloorState(event.data.payload as FloorState)
        } else {
          handleUpdate()
        }
      }
    }

    window.addEventListener('fornello_floor_updated', handleUpdate)
    window.addEventListener('storage', handleUpdate)

    return () => {
      if (bc) bc.close()
      window.removeEventListener('fornello_floor_updated', handleUpdate)
      window.removeEventListener('storage', handleUpdate)
    }
  }, [])

  // Monitor for incoming calls & trigger audible chime + banner alert
  useEffect(() => {
    const callsList = Object.entries(floorState.activeCalls)
      .filter(([_, call]) => Boolean(call))
      .map(([tableStr, call]) => ({ table: Number(tableStr), call: call as ActiveTableCall }))

    if (callsList.length > prevCallsCountRef.current) {
      if (soundEnabled) {
        playBellChime()
      }
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([60, 100, 60, 100])
      }
      const newest = callsList[callsList.length - 1]
      if (newest) {
        setActiveCallBanner(newest)
      }
    }

    prevCallsCountRef.current = callsList.length
  }, [floorState.activeCalls, soundEnabled])

  // Login handlers
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

  const handleLogout = () => {
    clearAuthorizedSession()
    setAuthed(false)
  }

  // QR / Code Payload Scanner handler
  const handleProcessScan = (raw: string) => {
    const decoded = decodeTableSyncPayload(raw.trim())
    if (!decoded) {
      setScanNotice('Invalid Fornello order QR code or sync string')
      return
    }

    bindTableOrder(decoded.table, decoded.ref, decoded.lines, decoded.total)
    setScanNotice(t.scanSuccess)
    setTimeout(() => {
      setIsScanOpen(false)
      setScanNotice(null)
      setScanInput('')
    }, 1500)
  }

  // Compute metrics
  const occupiedTablesList = Object.values(floorState.tables).filter(Boolean) as TableOrderRecord[]
  const activeCallsList = Object.entries(floorState.activeCalls)
    .filter(([_, call]) => Boolean(call))
    .map(([num, call]) => ({ table: Number(num), call: call as ActiveTableCall }))

  const totalFloorSales = occupiedTablesList.reduce((sum, item) => sum + item.total, 0)

  // Filtered tables list
  const filteredTables = TABLES.filter((num) => {
    const isCalling = Boolean(floorState.activeCalls[num])
    const isOccupied = Boolean(floorState.tables[num])

    if (filter === 'calling') return isCalling
    if (filter === 'occupied') return isOccupied
    if (filter === 'available') return !isOccupied && !isCalling
    return true
  })

  // Selected table order record
  const currentTableOrder = selectedTable ? floorState.tables[selectedTable] : null
  const currentTableCall = selectedTable ? floorState.activeCalls[selectedTable] : null

  // -------------------------------------------------------------
  // SECURE LOGIN VIEW
  // -------------------------------------------------------------
  if (!authed) {
    const isLocked = lockoutRemaining > 0 || lockout.permanentlyLocked

    return (
      <main lang={lang} dir={lang === 'ckb' ? 'rtl' : 'ltr'} className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
        <div className="flex flex-col items-center gap-6 rounded-3xl bg-card p-7 text-center border border-border shadow-2xl">
          <div className="grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <Lock className="size-7" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-3xl font-semibold tracking-wide uppercase">{t.waiterFloor}</h1>
            <Tricolor />
            <p className="mt-2 text-xs text-muted-foreground">{t.waiterFloorSubtitle}</p>
          </div>

          {isLocked ? (
            <div className="w-full flex items-start gap-3 rounded-2xl bg-destructive/15 border border-destructive/30 p-4 text-start text-destructive">
              <ShieldAlert className="size-5 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="text-xs leading-relaxed">
                <p className="font-semibold text-sm">Security Lockout Active</p>
                <p className="mt-1">
                  {lockout.permanentlyLocked
                    ? t.permanentlyLockedMessage
                    : t.lockedOutMessage(lockoutRemaining)}
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
            <div className="flex w-full flex-col gap-3">
              <button
                type="button"
                disabled={isLocked || isVerifying}
                onClick={handlePasskeyLogin}
                className="h-12 w-full rounded-full bg-primary font-medium text-xs text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {isVerifying ? 'Authenticating…' : t.passkeySignIn}
              </button>
            </div>
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
                className="h-12 w-full rounded-full bg-primary font-medium text-xs text-primary-foreground hover:opacity-90 disabled:opacity-50"
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
                className="h-12 w-full rounded-full bg-primary font-medium text-xs text-primary-foreground hover:opacity-90 disabled:opacity-50"
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
                className="h-11 rounded-xl border border-input bg-secondary px-3 text-xs font-mono"
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

  // -------------------------------------------------------------
  // AUTHENTICATED LIVE WAITER FLOOR SCREEN
  // -------------------------------------------------------------
  return (
    <main lang={lang} dir={lang === 'ckb' ? 'rtl' : 'ltr'} className="mx-auto min-h-dvh max-w-6xl px-4 py-8 pb-32">
      {/* Top Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/" className="flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
              {t.seeMenu}
            </Link>
            <span className="text-muted-foreground">·</span>
            <Link href="/admin" className="text-sm font-medium text-primary hover:underline">
              {t.staffMenu}
            </Link>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="font-display text-3xl font-semibold tracking-wide uppercase sm:text-4xl">{t.waiterFloor}</h1>
            <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-3 py-0.5 text-xs font-semibold text-emerald-300">
              Live Mesh Sync
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{t.waiterFloorSubtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSoundEnabled((prev) => !prev)}
            className={cn(
              'flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors',
              soundEnabled ? 'border-primary/60 bg-primary/10 text-primary' : 'border-border text-muted-foreground',
            )}
            title={t.floorAudioToggle}
          >
            {soundEnabled ? <Volume2 className="size-3.5" aria-hidden="true" /> : <VolumeX className="size-3.5" aria-hidden="true" />}
            <span>{soundEnabled ? t.audioOn : t.audioOff}</span>
          </button>

          {ENABLE_WAITER_QR_SYNC ? (
            <button
              type="button"
              onClick={() => setIsScanOpen(true)}
              className="flex h-9 items-center gap-1.5 rounded-full bg-accent px-3.5 text-xs font-semibold text-accent-foreground hover:opacity-90 transition-opacity"
            >
              <Camera className="size-3.5" aria-hidden="true" />
              <span>{t.scanGuestQr}</span>
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => setLang(lang === 'en' ? 'ckb' : 'en')}
            className="h-9 rounded-full border border-border px-3 text-xs font-medium hover:bg-foreground/10"
          >
            {t.switchLanguage}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="h-9 rounded-full border border-border px-3 text-xs font-medium hover:bg-foreground/10"
          >
            {t.close}
          </button>
        </div>
      </div>

      {/* Live Incoming Alert Banner */}
      {activeCallBanner ? (
        <aside
          role="status"
          aria-live="polite"
          className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-accent text-accent-foreground px-5 py-3.5 shadow-xl animate-in fade-in-0 slide-in-from-top-4"
        >
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-black/20">
              <Bell className="size-5 animate-bounce" aria-hidden="true" />
            </div>
            <div>
              <p className="font-display text-lg font-bold tracking-wide uppercase">
                {`${t.table} ${padTable(activeCallBanner.table)} · ${t.tableCallingAlert}`}
              </p>
              <p className="text-xs opacity-90">
                Service request: <span className="font-semibold uppercase">{activeCallBanner.call.type}</span> at {activeCallBanner.call.time}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                acknowledgeTableCall(activeCallBanner.table)
                setActiveCallBanner(null)
              }}
              className="flex h-9 items-center gap-1.5 rounded-full bg-black/30 hover:bg-black/40 px-3.5 text-xs font-bold uppercase transition-colors"
            >
              <Check className="size-3.5" aria-hidden="true" />
              <span>{t.acknowledgeCall}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveCallBanner(null)}
              className="grid size-9 place-items-center rounded-full hover:bg-black/20"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        </aside>
      ) : null}

      {/* Metric Cards Bar */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-3xl bg-card border border-border p-5">
          <div className={cn('grid size-12 place-items-center rounded-2xl', activeCallsList.length > 0 ? 'bg-destructive/20 text-destructive animate-pulse' : 'bg-primary/10 text-primary')}>
            <Bell className="size-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t.filterCalling}</p>
            <p className="font-display text-2xl font-bold tracking-wide uppercase">
              {t.activeCallsCount(activeCallsList.length)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-3xl bg-card border border-border p-5">
          <div className="grid size-12 place-items-center rounded-2xl bg-basil/20 text-basil">
            <UtensilsCrossed className="size-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t.tableOccupied}</p>
            <p className="font-display text-2xl font-bold tracking-wide uppercase">
              {t.activeTablesCount(occupiedTablesList.length)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-3xl bg-card border border-border p-5">
          <div className="grid size-12 place-items-center rounded-2xl bg-primary/20 text-primary">
            <Receipt className="size-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t.totalFloorSales}</p>
            <p className="font-display text-2xl font-bold tracking-wide uppercase tabular-nums">
              {formatIQD(totalFloorSales)}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Tabs Bar */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={cn(
              'h-9 rounded-full px-4 text-xs font-semibold tracking-wide uppercase transition-colors',
              filter === 'all' ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {t.filterAllTables}
          </button>

          <button
            type="button"
            onClick={() => setFilter('calling')}
            className={cn(
              'flex items-center gap-1.5 h-9 rounded-full px-4 text-xs font-semibold tracking-wide uppercase transition-colors',
              filter === 'calling'
                ? 'bg-destructive text-destructive-foreground'
                : 'border border-border text-muted-foreground hover:text-foreground',
            )}
          >
            <Bell className="size-3" aria-hidden="true" />
            <span>{t.filterCalling} ({activeCallsList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('occupied')}
            className={cn(
              'h-9 rounded-full px-4 text-xs font-semibold tracking-wide uppercase transition-colors',
              filter === 'occupied' ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {t.filterOccupied} ({occupiedTablesList.length})
          </button>

          <button
            type="button"
            onClick={() => setFilter('available')}
            className={cn(
              'h-9 rounded-full px-4 text-xs font-semibold tracking-wide uppercase transition-colors',
              filter === 'available' ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {t.filterAvailable} ({25 - occupiedTablesList.length})
          </button>
        </div>
      </div>

      {/* 25-Table Interactive Floor Grid */}
      <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5">
        {filteredTables.map((tableNum) => {
          const call = floorState.activeCalls[tableNum]
          const order = floorState.tables[tableNum]
          const isCalling = Boolean(call)
          const isOccupied = Boolean(order)

          return (
            <div
              key={tableNum}
              className={cn(
                'relative flex flex-col justify-between rounded-3xl p-3.5 sm:p-4 transition-all border',
                isCalling
                  ? 'border-accent bg-accent/15 ring-2 ring-accent shadow-xl animate-pulse'
                  : isOccupied
                    ? 'border-primary/60 bg-card shadow-md'
                    : 'border-border/60 bg-secondary/30 opacity-75 hover:opacity-100',
              )}
            >
              <div>
                <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-display text-xl sm:text-2xl font-bold tracking-tight">
                    {`${t.table} ${padTable(tableNum)}`}
                  </span>
                  {call ? (
                    <span className="flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground uppercase">
                      <Bell className="size-3" aria-hidden="true" />
                      <span>{call.type}</span>
                    </span>
                  ) : order ? (
                    <span
                      onClick={(e) => {
                        e.stopPropagation()
                        const nextStatus = order.status === 'active' ? 'served' : 'active'
                        updateTableStatus(tableNum, nextStatus)
                      }}
                      className={cn(
                        'cursor-pointer rounded-full px-2 py-0.5 text-[10px] font-bold uppercase transition-colors',
                        order.status === 'served' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-primary/20 text-primary',
                      )}
                    >
                      {order.status === 'served' ? t.markServedStatus : t.orderActiveStatus}
                    </span>
                  ) : (
                    <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {t.tableAvailable}
                    </span>
                  )}
                </div>

                {/* Table Content Summary */}
                {order ? (
                  <div className="mt-2.5 flex flex-col gap-1 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                      <span>{order.orderRef}</span>
                      <span>{order.timestamp}</span>
                    </div>

                    <p className="line-clamp-2 text-foreground font-medium text-xs leading-snug">
                      {order.lines.map((l) => `${l.qty}× ${getItem(l.itemId)?.name || 'Item'}`).join(', ')}
                    </p>

                    <p className="mt-1 font-semibold text-sm tabular-nums text-primary">
                      {formatIQD(order.total)}
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground italic">
                    {lang === 'ckb' ? 'ئامادەیە بۆ میوان' : 'Ready for guests'}
                  </p>
                )}
              </div>

              {/* Table Action Buttons */}
              <div className="mt-3.5 flex flex-col gap-1.5 border-t border-dashed border-foreground/20 pt-3">
                {isCalling ? (
                  <button
                    type="button"
                    onClick={() => acknowledgeTableCall(tableNum)}
                    className="flex h-8 w-full items-center justify-center gap-1.5 rounded-full bg-accent text-[11px] font-bold text-accent-foreground uppercase hover:opacity-90"
                  >
                    <Check className="size-3" aria-hidden="true" />
                    <span>{t.acknowledgeCall}</span>
                  </button>
                ) : null}

                {isOccupied ? (
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedTable(tableNum)}
                      className="flex-1 h-8 rounded-full border border-primary/50 px-2 text-[11px] font-medium truncate hover:bg-foreground/10"
                    >
                      {t.viewTicket}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(t.tableCleanConfirm(tableNum))) {
                          clearTable(tableNum)
                        }
                      }}
                      className="h-8 shrink-0 px-2.5 rounded-full border border-destructive/40 text-[10px] font-semibold text-destructive hover:bg-destructive/10"
                      title={t.clearAndPaid}
                    >
                      ✓
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>

      {/* FULL TABLE DETAIL SHEET */}
      {selectedTable && currentTableOrder ? (
        <Sheet
          open={Boolean(selectedTable)}
          onClose={() => setSelectedTable(null)}
          label={`${t.table} ${padTable(selectedTable)} Details`}
          variant="sheet"
        >
          <div className="flex max-h-[88dvh] flex-col justify-between overflow-y-auto p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6">
            <div>
              <div className="flex items-center justify-between border-b border-dashed border-foreground/30 pb-4">
                <div>
                  <h2 className="font-display text-3xl font-semibold tracking-wide uppercase">
                    {`${t.table} ${padTable(selectedTable)}`}
                  </h2>
                  <p className="font-mono text-xs text-primary font-semibold">
                    {currentTableOrder.orderRef} · {currentTableOrder.timestamp}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTable(null)}
                  className="grid size-9 place-items-center rounded-full border border-border hover:bg-foreground/10"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>

              {currentTableCall ? (
                <div className="mt-4 flex items-center justify-between rounded-2xl bg-accent text-accent-foreground p-3">
                  <div className="flex items-center gap-2">
                    <Bell className="size-4" aria-hidden="true" />
                    <span className="text-xs font-bold uppercase">{t.tableCallingAlert}: {currentTableCall.type}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => acknowledgeTableCall(selectedTable)}
                    className="h-7 rounded-full bg-black/20 px-3 text-[10px] font-bold uppercase hover:bg-black/30"
                  >
                    {t.acknowledgeCall}
                  </button>
                </div>
              ) : null}

              {/* Order Items Breakdown */}
              <ul className="mt-5 divide-y divide-dashed divide-foreground/20 max-h-[50vh] overflow-y-auto pe-1">
                {currentTableOrder.lines.map((line) => {
                  const item = getItem(line.itemId)
                  if (!item) return null
                  return (
                    <li key={line.uid} className="py-3 first:pt-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-display text-base font-semibold uppercase">
                            {line.qty}× {item.name}
                          </p>
                          {describeSelections(item, line.selections, lang).map((s) => (
                            <p key={s} className="text-xs text-muted-foreground">{s}</p>
                          ))}
                          {line.notes ? (
                            <p className="mt-1 text-xs italic text-primary">📝 {line.notes}</p>
                          ) : null}
                        </div>
                        <span className="font-semibold text-sm tabular-nums">{formatIQD(lineTotal(line))}</span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>

            <div className="border-t-2 border-foreground/30 pt-4 flex flex-col gap-3">
              <div className="flex items-baseline justify-between">
                <span className="font-display text-lg tracking-wide uppercase">{t.total}</span>
                <span className="font-display text-3xl font-bold tabular-nums text-primary">
                  {formatIQD(currentTableOrder.total)}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full border border-border text-xs font-semibold uppercase hover:bg-foreground/10"
                >
                  <Printer className="size-4" aria-hidden="true" />
                  <span>{t.printThermalTicket}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    clearTable(selectedTable)
                    setSelectedTable(null)
                  }}
                  className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-primary text-xs font-semibold text-primary-foreground uppercase hover:opacity-90"
                >
                  <Check className="size-4" aria-hidden="true" />
                  <span>{t.clearAndPaid}</span>
                </button>
              </div>
            </div>
          </div>
        </Sheet>
      ) : null}

      {/* SCAN GUEST QR / PASTE PAYLOAD MODAL */}
      {isScanOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-3xl bg-card p-6 border border-border shadow-2xl">
            <div className="flex items-center justify-between border-b border-dashed border-foreground/30 pb-4">
              <div className="flex items-center gap-2">
                <Camera className="size-5 text-accent" aria-hidden="true" />
                <h2 className="font-display text-xl font-semibold uppercase">{t.scanGuestQr}</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsScanOpen(false)}
                className="grid size-9 place-items-center rounded-full border border-border hover:bg-foreground/10"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-5 flex flex-col gap-4 text-center">
              <p className="text-xs text-muted-foreground">{t.scanQrHint}</p>

              <div className="flex flex-col gap-2">
                <textarea
                  rows={3}
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  placeholder="Paste customer QR string (FORNELLO-ORDER:...)"
                  className="rounded-xl border border-input bg-secondary p-3 text-xs font-mono"
                />
                <button
                  type="button"
                  disabled={!scanInput.trim()}
                  onClick={() => handleProcessScan(scanInput)}
                  className="h-11 rounded-full bg-accent font-semibold text-xs text-accent-foreground hover:opacity-90 disabled:opacity-40"
                >
                  Link Table Order
                </button>
              </div>

              {scanNotice ? (
                <p className="text-xs font-semibold text-emerald-400">{scanNotice}</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
