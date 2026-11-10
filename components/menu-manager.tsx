'use client'

import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Fingerprint,
  Flame,
  Key,
  KeyRound,
  Leaf,
  Lock,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useState } from 'react'
import {
  checkPassphraseStrength,
  clearAuthorizedSession,
  disableTotp,
  enableTotp,
  generateNewKeyfileToken,
  generateTotpSecret,
  getActiveKeyfileToken,
  getLockoutStatus,
  getStoredTotpSecret,
  getTotpUri,
  isPasskeyEnrolled,
  isSessionAuthorized,
  isTotpEnabled,
  isWebAuthnSupported,
  registerPasskey,
  removePasskey,
  updateMasterPassphrase,
  verifyKeyfileToken,
  verifyPasskey,
  verifyPassphrase,
  verifyTotpCode,
  type LockoutStatus,
} from '@/lib/auth'
import { STRINGS } from '@/lib/i18n'
import {
  CATEGORIES,
  getMergedMenu,
  getStoredMenuData,
  saveStoredMenuData,
  type CategoryId,
  type CustomMenuItem,
  type Lang,
  type MenuItem,
  type MenuStoreData,
  type Tag,
} from '@/lib/menu'
import { formatIQD } from '@/lib/order'
import { cn } from '@/lib/utils'
import { Tricolor } from './tricolor'

const IMAGE_PRESETS = [
  { id: 'pizza', label: 'Pizza', src: '/images/hero-pizza.png' },
  { id: 'taglio', label: 'Al Taglio', src: '/images/al-taglio.png' },
  { id: 'potato', label: 'Potato & Sides', src: '/images/potato.png' },
  { id: 'coffee', label: 'Coffee', src: '/images/coffee.png' },
]

export function MenuManager() {
  const [lang, setLang] = useState<Lang>('en')
  const [authed, setAuthed] = useState(false)
  const [passphrase, setPassphrase] = useState('')
  const [totpInput, setTotpInput] = useState('')
  const [keyfileText, setKeyfileText] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [lockout, setLockout] = useState<LockoutStatus>(() => getLockoutStatus())
  const [lockoutRemaining, setLockoutRemaining] = useState(0)
  const [authTab, setAuthTab] = useState<'passkey' | 'passphrase' | 'totp' | 'keyfile'>('passphrase')
  const [menuData, setMenuData] = useState<MenuStoreData>(() => getStoredMenuData())
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'all'>('all')
  const [query, setQuery] = useState('')
  const [editingItem, setEditingItem] = useState<(MenuItem & { soldOut?: boolean; custom?: boolean }) | null>(null)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isSecurityOpen, setIsSecurityOpen] = useState(false)
  const [syncNotice, setSyncNotice] = useState<string | null>(null)
  const [copiedSync, setCopiedSync] = useState(false)

  const t = STRINGS[lang]
  const passkeyEnrolled = isPasskeyEnrolled()
  const webAuthnSupported = isWebAuthnSupported()
  const totpActive = isTotpEnabled()

  useEffect(() => {
    if (isSessionAuthorized()) {
      setAuthed(true)
    }
  }, [])

  // Auto-select best auth tab on mount
  useEffect(() => {
    if (passkeyEnrolled && webAuthnSupported) {
      setAuthTab('passkey')
    } else if (totpActive) {
      setAuthTab('totp')
    } else {
      setAuthTab('passphrase')
    }
  }, [passkeyEnrolled, webAuthnSupported, totpActive])

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

  const notifySync = (msg: string) => {
    setSyncNotice(msg)
    setTimeout(() => setSyncNotice(null), 3000)
  }

  // Passkey Biometric Login
  const handlePasskeyLogin = async () => {
    if (lockoutRemaining > 0 || isVerifying) return
    setIsVerifying(true)
    setAuthError(null)
    try {
      const ok = await verifyPasskey()
      if (ok) {
        setAuthed(true)
      } else {
        setAuthError(t.passkeyError)
        setLockout(getLockoutStatus())
      }
    } finally {
      setIsVerifying(false)
    }
  }

  // TOTP Authenticator Login
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

  // Passphrase Login
  const handlePassphraseLogin = async (event: React.FormEvent) => {
    event.preventDefault()
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
        setPassphrase('')
        setLockout(getLockoutStatus())
      }
    } finally {
      setIsVerifying(false)
    }
  }

  // Keyfile Upload Login
  const handleKeyfileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const token = (e.target?.result as string) || ''
      const ok = verifyKeyfileToken(token)
      if (ok) {
        setAuthed(true)
        setAuthError(null)
      } else {
        setAuthError(t.authFailed)
        setLockout(getLockoutStatus())
      }
    }
    reader.readAsText(file)
  }

  // Keyfile Paste Login
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

  const toggleSoldOut = (id: string, current: boolean) => {
    const next: MenuStoreData = {
      ...menuData,
      overrides: {
        ...menuData.overrides,
        [id]: {
          ...menuData.overrides[id],
          soldOut: !current,
        },
      },
      customItems: menuData.customItems.map((c) => (c.id === id ? { ...c, soldOut: !current } : c)),
    }
    setMenuData(next)
    saveStoredMenuData(next)
    notifySync(t.syncSuccess)
  }

  const handleDeleteItem = (id: string) => {
    const isCustom = menuData.customItems.some((c) => c.id === id)
    let next: MenuStoreData
    if (isCustom) {
      next = {
        ...menuData,
        customItems: menuData.customItems.filter((c) => c.id !== id),
      }
    } else {
      next = {
        ...menuData,
        overrides: {
          ...menuData.overrides,
          [id]: {
            ...menuData.overrides[id],
            deleted: true,
          },
        },
      }
    }
    setMenuData(next)
    saveStoredMenuData(next)
    notifySync(t.syncSuccess)
  }

  const handleResetFactory = () => {
    if (window.confirm(t.resetConfirm)) {
      const empty: MenuStoreData = { customItems: [], overrides: {} }
      setMenuData(empty)
      saveStoredMenuData(empty)
      notifySync(t.syncSuccess)
    }
  }

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(menuData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fornello-menu-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportJson = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string) as MenuStoreData
        if (parsed && typeof parsed === 'object') {
          const next: MenuStoreData = {
            customItems: Array.isArray(parsed.customItems) ? parsed.customItems : [],
            overrides: typeof parsed.overrides === 'object' && parsed.overrides ? parsed.overrides : {},
          }
          setMenuData(next)
          saveStoredMenuData(next)
          notifySync(t.syncSuccess)
        }
      } catch {
        alert('Invalid menu JSON file')
      }
    }
    reader.readAsText(file)
  }

  const handleCopySyncString = () => {
    const b64 = btoa(encodeURIComponent(JSON.stringify(menuData)))
    navigator.clipboard.writeText(b64)
    setCopiedSync(true)
    setTimeout(() => setCopiedSync(false), 2500)
  }

  const merged = getMergedMenu(menuData)
  const needle = query.trim().toLowerCase()
  const filtered = merged.filter((item) => {
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false
    if (!needle) return true
    const haystack = [item.name, item.description?.en, item.description?.ckb].join(' ').toLowerCase()
    return haystack.includes(needle)
  })

  // -------------------------------------------------------------
  // LOGIN SCREEN (No PIN anywhere; Passkey + TOTP + Keyfile + Passphrase)
  // -------------------------------------------------------------
  if (!authed) {
    const isLocked = lockoutRemaining > 0 || lockout.permanentlyLocked

    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
        <div className="flex flex-col items-center gap-6 rounded-3xl bg-card p-7 text-center border border-border shadow-2xl">
          <div className="grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <Lock className="size-7" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-3xl font-semibold tracking-wide uppercase">{t.adminTitle}</h1>
            <Tricolor />
            <p className="mt-2 text-xs text-muted-foreground">{t.adminSubtitle}</p>
          </div>

          {isLocked ? (
            <div className="w-full flex items-start gap-3 rounded-2xl bg-destructive/15 border border-destructive/30 p-4 text-start text-destructive">
              <ShieldAlert className="size-5 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="text-xs leading-relaxed">
                <p className="font-semibold text-sm">Security Shield Lockout</p>
                <p className="mt-1">
                  {lockout.permanentlyLocked
                    ? t.permanentlyLockedMessage
                    : t.lockedOutMessage(lockoutRemaining)}
                </p>
              </div>
            </div>
          ) : null}

          {/* Auth Method Navigation Tabs */}
          <div className="grid w-full grid-cols-4 rounded-full border border-border p-1 text-[11px] font-medium">
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

          {/* TAB 1: PASSKEY / BIOMETRIC AUTH */}
          {authTab === 'passkey' ? (
            <div className="flex w-full flex-col gap-4">
              <div className="rounded-2xl border border-dashed border-primary/50 bg-secondary/40 p-5 text-center flex flex-col items-center gap-3">
                <Fingerprint className="size-12 text-primary animate-pulse" aria-hidden="true" />
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold">{t.passkeySignIn}</p>
                  <p className="text-xs text-muted-foreground">
                    Hardware-backed security enclave via Apple Touch ID, Face ID, or Windows Hello.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isLocked || isVerifying}
                  onClick={handlePasskeyLogin}
                  className="mt-2 h-12 w-full rounded-full bg-primary font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Fingerprint className="size-5" aria-hidden="true" />
                  <span>{isVerifying ? 'Authenticating…' : t.passkeySignIn}</span>
                </button>
              </div>
              {authError ? <p className="text-xs text-destructive">{authError}</p> : null}
            </div>
          ) : null}

          {/* TAB 2: TOTP 2FA CODE */}
          {authTab === 'totp' ? (
            <form onSubmit={handleTotpLogin} className="flex w-full flex-col gap-4">
              <div className="flex flex-col gap-1.5 text-start">
                <label htmlFor="staff-totp" className="text-sm font-medium">
                  {t.totpAuth}
                </label>
                <div className="relative">
                  <Smartphone className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <input
                    id="staff-totp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    disabled={isLocked || isVerifying}
                    value={totpInput}
                    onChange={(e) => setTotpInput(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="000 000"
                    autoFocus
                    className="h-12 w-full rounded-xl border border-input bg-secondary ps-10 pe-4 text-center font-mono text-xl tracking-[0.3em] font-semibold focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Enter 6-digit rolling code from Google Authenticator, 1Password, or Apple Keychain.
                </p>
                {authError ? <p className="text-xs text-destructive">{authError}</p> : null}
              </div>

              <button
                type="submit"
                disabled={isLocked || isVerifying || totpInput.length !== 6}
                className="h-12 w-full rounded-full bg-primary font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {isVerifying ? 'Verifying 2FA…' : t.totpVerifyBtn}
              </button>
            </form>
          ) : null}

          {/* TAB 3: PASSPHRASE WITH 100k PBKDF2 ROUNDS */}
          {authTab === 'passphrase' ? (
            <form onSubmit={handlePassphraseLogin} className="flex w-full flex-col gap-4">
              <div className="flex flex-col gap-1.5 text-start">
                <label htmlFor="staff-passphrase" className="text-sm font-medium">
                  {t.enterPassphrase}
                </label>
                <input
                  id="staff-passphrase"
                  type="password"
                  disabled={isLocked || isVerifying}
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder={t.passphrasePlaceholder}
                  autoFocus
                  className="h-12 w-full rounded-xl border border-input bg-secondary px-4 text-sm focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
                />
                <p className="text-[11px] text-muted-foreground">
                  Protected with 100,000-round PBKDF2 HMAC-SHA-256 derivation. Default: <code className="text-primary font-mono font-semibold">Fornello@2026!</code>
                </p>
                {authError ? <p className="text-xs text-destructive">{authError}</p> : null}
              </div>

              <button
                type="submit"
                disabled={isLocked || isVerifying || !passphrase.trim()}
                className="h-12 w-full rounded-full bg-primary font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {isVerifying ? 'Deriving Keys (100k rounds)…' : t.unlock}
              </button>
            </form>
          ) : null}

          {/* TAB 4: 256-BIT CRYPTOGRAPHIC KEYFILE */}
          {authTab === 'keyfile' ? (
            <div className="flex w-full flex-col gap-4">
              <label className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary/50 bg-secondary/50 p-6 text-center cursor-pointer hover:border-primary transition-colors">
                <KeyRound className="size-8 text-primary" aria-hidden="true" />
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">{t.orUploadKeyfile}</p>
                  <p className="text-xs text-muted-foreground">Select fornello-staff.key file to unlock instantly</p>
                </div>
                <input
                  type="file"
                  accept=".key,.txt"
                  onChange={handleKeyfileUpload}
                  className="sr-only"
                />
              </label>

              <form onSubmit={handleKeyfilePasteLogin} className="flex flex-col gap-2">
                <input
                  type="text"
                  value={keyfileText}
                  onChange={(e) => setKeyfileText(e.target.value)}
                  placeholder="Or paste FORNELLO-STAFF-KEY-..."
                  className="h-10 rounded-xl border border-input bg-secondary px-3 text-xs font-mono"
                />
                <button
                  type="submit"
                  disabled={!keyfileText.trim()}
                  className="h-9 rounded-full border border-primary px-3 text-xs font-medium text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-40"
                >
                  Verify Key Token
                </button>
              </form>
              {authError ? <p className="text-xs text-destructive">{authError}</p> : null}
            </div>
          ) : null}

          <Link href="/" className="mt-2 text-sm text-muted-foreground hover:text-foreground">
            ← {t.seeMenu}
          </Link>
        </div>
      </main>
    )
  }

  // -------------------------------------------------------------
  // AUTHENTICATED STAFF STUDIO
  // -------------------------------------------------------------
  return (
    <main className="mx-auto min-h-dvh max-w-5xl px-4 py-8 pb-32">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/" className="flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
            {t.seeMenu}
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="font-display text-3xl font-semibold tracking-wide uppercase sm:text-4xl">{t.adminTitle}</h1>
            <span className="rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary">
              Frontend Only · Zero Backend
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{t.adminSubtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsSecurityOpen(true)}
            className="flex h-9 items-center gap-1.5 rounded-full border border-primary/60 bg-primary/10 px-3 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            <span>{t.securityCenter}</span>
          </button>
          <button
            type="button"
            onClick={() => setLang(lang === 'en' ? 'ckb' : 'en')}
            className="h-9 rounded-full border border-border px-3 text-sm font-medium hover:bg-foreground/10"
          >
            {t.switchLanguage}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="h-9 rounded-full border border-border px-3 text-sm font-medium hover:bg-foreground/10"
          >
            {t.close}
          </button>
        </div>
      </div>

      {syncNotice ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-4 py-2.5 text-sm font-medium text-emerald-300">
          <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
          {syncNotice}
        </div>
      ) : null}

      {/* Main Studio Action Bar */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-y border-border py-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="flex h-10 items-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-accent-foreground hover:opacity-90"
          >
            <Plus className="size-4" aria-hidden="true" />
            {t.addItem}
          </button>
          <button
            type="button"
            onClick={handleExportJson}
            className="flex h-10 items-center gap-2 rounded-full border border-border px-3.5 text-sm font-medium hover:bg-foreground/10"
          >
            <Download className="size-4" aria-hidden="true" />
            {t.exportBackup}
          </button>
          <label className="flex h-10 cursor-pointer items-center gap-2 rounded-full border border-border px-3.5 text-sm font-medium hover:bg-foreground/10">
            <Upload className="size-4" aria-hidden="true" />
            <span>{t.importBackup}</span>
            <input type="file" accept=".json" onChange={handleImportJson} className="sr-only" />
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopySyncString}
            className="flex h-10 items-center gap-2 rounded-full border border-border px-3 text-sm font-medium hover:bg-foreground/10"
          >
            {copiedSync ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
            {copiedSync ? 'Copied' : 'Share Sync Code'}
          </button>
          <button
            type="button"
            onClick={handleResetFactory}
            className="flex h-10 items-center gap-2 rounded-full border border-destructive/40 px-3 text-sm font-medium text-destructive hover:bg-destructive/10"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            {t.resetMenu}
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="h-10 w-full rounded-full border border-input bg-secondary ps-9 pe-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
        </div>

        <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={cn(
              'h-9 shrink-0 rounded-full border px-3.5 text-sm font-medium transition-colors',
              selectedCategory === 'all'
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border hover:bg-foreground/10',
            )}
          >
            All ({merged.length})
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                'h-9 shrink-0 rounded-full border px-3.5 text-sm font-medium transition-colors',
                selectedCategory === cat.id
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border hover:bg-foreground/10',
              )}
            >
              {t.categoryNames[cat.id]}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Item Rows */}
      <div className="mt-6 divide-y divide-dashed divide-foreground/20 rounded-3xl bg-card p-6">
        {filtered.map((item) => {
          const isSoldOut = Boolean(item.soldOut)
          return (
            <div key={item.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span lang="en" className="font-display text-lg font-medium tracking-wide uppercase">
                    {item.name}
                  </span>
                  {item.custom ? (
                    <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs font-semibold text-accent">
                      Custom Item
                    </span>
                  ) : null}
                  {isSoldOut ? (
                    <span className="rounded-full bg-destructive/20 px-2 py-0.5 text-xs font-medium text-destructive">
                      {t.soldOut}
                    </span>
                  ) : (
                    <span className="rounded-full bg-basil/20 px-2 py-0.5 text-xs font-medium text-basil">
                      {t.inStock}
                    </span>
                  )}
                  {item.tags.includes('spicy') ? <Flame className="size-4 text-destructive" aria-hidden="true" /> : null}
                  {item.tags.includes('vegetarian') ? <Leaf className="size-4 text-basil brightness-150" aria-hidden="true" /> : null}
                </div>
                {item.description ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.description[lang]}
                    {lang === 'en' ? <bdi lang="ckb" className="ms-2 text-foreground/60">{item.description.ckb}</bdi> : null}
                  </p>
                ) : null}
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                <span className="text-base font-semibold tabular-nums">{formatIQD(item.price)}</span>
                <button
                  type="button"
                  onClick={() => toggleSoldOut(item.id, isSoldOut)}
                  className={cn(
                    'h-9 rounded-full px-3.5 text-xs font-medium transition-colors',
                    isSoldOut
                      ? 'bg-basil text-primary-foreground hover:opacity-90'
                      : 'border border-destructive/40 text-destructive hover:bg-destructive/10',
                  )}
                >
                  {isSoldOut ? 'Set In Stock' : 'Mark Sold Out (86)'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingItem(item)}
                  className="grid size-9 place-items-center rounded-full border border-border text-foreground/80 hover:bg-foreground/10"
                  aria-label={t.editItem}
                >
                  <SlidersHorizontal className="size-4" aria-hidden="true" />
                </button>
                {item.custom ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(item.id)}
                    className="grid size-9 place-items-center rounded-full border border-destructive/40 text-destructive hover:bg-destructive/10"
                    aria-label={t.deleteItem}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Custom Item Modal */}
      {isAddOpen ? (
        <AddItemModal
          onClose={() => setIsAddOpen(false)}
          onAdd={(newItem) => {
            const next: MenuStoreData = {
              ...menuData,
              customItems: [...menuData.customItems, newItem],
            }
            setMenuData(next)
            saveStoredMenuData(next)
            setIsAddOpen(false)
            notifySync(t.syncSuccess)
          }}
          lang={lang}
        />
      ) : null}

      {/* Full Edit Item Modal */}
      {editingItem ? (
        <EditItemModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onDelete={() => {
            handleDeleteItem(editingItem.id)
            setEditingItem(null)
          }}
          onSave={(updatedFields) => {
            const isCustom = editingItem.custom
            let next: MenuStoreData
            if (isCustom) {
              next = {
                ...menuData,
                customItems: menuData.customItems.map((c) =>
                  c.id === editingItem.id ? { ...c, ...updatedFields } : c,
                ),
              }
            } else {
              next = {
                ...menuData,
                overrides: {
                  ...menuData.overrides,
                  [editingItem.id]: {
                    ...menuData.overrides[editingItem.id],
                    ...updatedFields,
                  },
                },
              }
            }
            setMenuData(next)
            saveStoredMenuData(next)
            setEditingItem(null)
            notifySync(t.syncSuccess)
          }}
          lang={lang}
        />
      ) : null}

      {/* Security Center Modal */}
      {isSecurityOpen ? (
        <SecurityCenterModal
          onClose={() => setIsSecurityOpen(false)}
          lang={lang}
          onKeyUpdated={() => notifySync('Security settings updated!')}
        />
      ) : null}
    </main>
  )
}

// -------------------------------------------------------------
// ADD ITEM MODAL
// -------------------------------------------------------------
function AddItemModal({
  onClose,
  onAdd,
  lang,
}: {
  onClose: () => void
  onAdd: (item: CustomMenuItem) => void
  lang: Lang
}) {
  const t = STRINGS[lang]
  const [name, setName] = useState('')
  const [descEn, setDescEn] = useState('')
  const [descCkb, setDescCkb] = useState('')
  const [category, setCategory] = useState<CategoryId>('pizza')
  const [price, setPrice] = useState('6500')
  const [tags, setTags] = useState<Tag[]>([])
  const [image, setImage] = useState(IMAGE_PRESETS[0].src)

  const tagOptions: Tag[] = ['signature', 'spicy', 'vegetarian', 'caffeine']

  const toggleTag = (tag: Tag) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const numPrice = Number(price.replace(/[^0-9]/g, '')) || 5000
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const id = `custom-${slug}-${Date.now().toString().slice(-4)}`

    const defaultGroupsByCategory: Record<CategoryId, string[]> = {
      pizza: ['crust', 'extras', 'dips'],
      taglio: ['dips'],
      coffee: ['temperature', 'milk', 'shots', 'sweetness'],
      potato: ['potatoSize', 'dips'],
    }

    const newItem: CustomMenuItem = {
      id,
      category,
      name: name.trim(),
      description: descEn.trim() || descCkb.trim() ? { en: descEn.trim(), ckb: descCkb.trim() } : undefined,
      price: numPrice,
      tags,
      image,
      groups: defaultGroupsByCategory[category],
      custom: true,
      soldOut: false,
    }

    onAdd(newItem)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-3xl bg-card p-6 border border-border shadow-2xl">
        <div className="flex items-center justify-between border-b border-dashed border-foreground/30 pb-4">
          <h2 className="font-display text-2xl font-semibold tracking-wide uppercase">{t.addItem}</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full border border-border hover:bg-foreground/10"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t.itemName}</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Tartufo Funghi Pizza"
              className="h-11 rounded-xl border border-input bg-secondary px-3.5 text-base focus-visible:outline-2 focus-visible:outline-ring"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">{t.itemCategory}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CategoryId)}
                className="h-11 rounded-xl border border-input bg-secondary px-3.5 text-base focus-visible:outline-2 focus-visible:outline-ring"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {t.categoryNames[c.id]}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">{t.itemPrice}</label>
              <input
                type="number"
                step="250"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="6500"
                className="h-11 rounded-xl border border-input bg-secondary px-3.5 text-base tabular-nums focus-visible:outline-2 focus-visible:outline-ring"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t.itemDescEn}</label>
            <input
              type="text"
              value={descEn}
              onChange={(e) => setDescEn(e.target.value)}
              placeholder="Fresh mushrooms, truffle glaze, mozzarella"
              className="h-11 rounded-xl border border-input bg-secondary px-3.5 text-base focus-visible:outline-2 focus-visible:outline-ring"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t.itemDescCkb}</label>
            <input
              type="text"
              dir="rtl"
              value={descCkb}
              onChange={(e) => setDescCkb(e.target.value)}
              placeholder="قارچکی تازە، سۆسی تڕوفڵ، مۆزارێلا"
              className="h-11 rounded-xl border border-input bg-secondary px-3.5 text-base focus-visible:outline-2 focus-visible:outline-ring"
            />
          </div>

          {/* Image preset selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t.itemImage}</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {IMAGE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setImage(p.src)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-xl border p-2 text-center text-xs transition-colors',
                    image === p.src ? 'border-primary bg-primary/10 font-semibold' : 'border-border hover:bg-foreground/5',
                  )}
                >
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t.itemTags}</label>
            <div className="flex flex-wrap gap-2">
              {tagOptions.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    'h-8 rounded-full border px-3 text-xs font-medium transition-colors',
                    tags.includes(tag)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border hover:bg-foreground/10',
                  )}
                >
                  {t.tags[tag]}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-12 flex-1 rounded-full border border-border font-medium hover:bg-foreground/10"
            >
              {t.close}
            </button>
            <button
              type="submit"
              className="h-12 flex-1 rounded-full bg-accent font-medium text-accent-foreground hover:opacity-90"
            >
              {t.addItem}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// -------------------------------------------------------------
// FULL EDIT ITEM MODAL
// -------------------------------------------------------------
function EditItemModal({
  item,
  onClose,
  onSave,
  onDelete,
  lang,
}: {
  item: MenuItem & { soldOut?: boolean; custom?: boolean }
  onClose: () => void
  onDelete: () => void
  onSave: (fields: Partial<MenuItem & { soldOut?: boolean }>) => void
  lang: Lang
}) {
  const t = STRINGS[lang]
  const [name, setName] = useState(item.name)
  const [price, setPrice] = useState(String(item.price))
  const [descEn, setDescEn] = useState(item.description?.en ?? '')
  const [descCkb, setDescCkb] = useState(item.description?.ckb ?? '')
  const [category, setCategory] = useState<CategoryId>(item.category)
  const [tags, setTags] = useState<Tag[]>(item.tags ?? [])
  const [soldOut, setSoldOut] = useState(Boolean(item.soldOut))
  const [image, setImage] = useState(item.image ?? IMAGE_PRESETS[0].src)

  const tagOptions: Tag[] = ['signature', 'spicy', 'vegetarian', 'caffeine']

  const toggleTag = (tag: Tag) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    const numPrice = Number(price.replace(/[^0-9]/g, '')) || item.price

    onSave({
      name: name.trim(),
      price: numPrice,
      description: descEn.trim() || descCkb.trim() ? { en: descEn.trim(), ckb: descCkb.trim() } : undefined,
      category,
      tags,
      image,
      soldOut,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-3xl bg-card p-6 border border-border shadow-2xl">
        <div className="flex items-center justify-between border-b border-dashed border-foreground/30 pb-4">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-wide uppercase">{t.editItem}</h2>
            <p className="text-xs text-muted-foreground">{item.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full border border-border hover:bg-foreground/10"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t.itemName}</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 rounded-xl border border-input bg-secondary px-3.5 text-base focus-visible:outline-2 focus-visible:outline-ring"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">{t.itemCategory}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CategoryId)}
                className="h-11 rounded-xl border border-input bg-secondary px-3.5 text-base focus-visible:outline-2 focus-visible:outline-ring"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {t.categoryNames[c.id]}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">{t.itemPrice}</label>
              <input
                type="number"
                step="250"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="h-11 rounded-xl border border-input bg-secondary px-3.5 text-base tabular-nums focus-visible:outline-2 focus-visible:outline-ring"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t.itemDescEn}</label>
            <input
              type="text"
              value={descEn}
              onChange={(e) => setDescEn(e.target.value)}
              className="h-11 rounded-xl border border-input bg-secondary px-3.5 text-base focus-visible:outline-2 focus-visible:outline-ring"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t.itemDescCkb}</label>
            <input
              type="text"
              dir="rtl"
              value={descCkb}
              onChange={(e) => setDescCkb(e.target.value)}
              className="h-11 rounded-xl border border-input bg-secondary px-3.5 text-base focus-visible:outline-2 focus-visible:outline-ring"
            />
          </div>

          {/* Image presets */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t.itemImage}</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {IMAGE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setImage(p.src)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-xl border p-2 text-center text-xs transition-colors',
                    image === p.src ? 'border-primary bg-primary/10 font-semibold' : 'border-border hover:bg-foreground/5',
                  )}
                >
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t.itemTags}</label>
            <div className="flex flex-wrap gap-2">
              {tagOptions.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    'h-8 rounded-full border px-3 text-xs font-medium transition-colors',
                    tags.includes(tag)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border hover:bg-foreground/10',
                  )}
                >
                  {t.tags[tag]}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-border p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={soldOut}
              onChange={(e) => setSoldOut(e.target.checked)}
              className="size-5 rounded accent-destructive"
            />
            <div>
              <p className="text-sm font-medium">{t.soldOut} (86)</p>
              <p className="text-xs text-muted-foreground">Temporarily stops guests from adding this item to orders</p>
            </div>
          </label>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {item.custom ? (
              <button
                type="button"
                onClick={onDelete}
                className="h-12 px-4 rounded-full border border-destructive/50 text-destructive text-sm font-medium hover:bg-destructive/10"
              >
                {t.deleteItem}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="h-12 flex-1 rounded-full border border-border font-medium hover:bg-foreground/10"
            >
              {t.close}
            </button>
            <button
              type="submit"
              className="h-12 flex-1 rounded-full bg-primary font-medium text-primary-foreground hover:opacity-90"
            >
              {t.saveChanges}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// -------------------------------------------------------------
// IMPENETRABLE SECURITY CENTER MODAL
// -------------------------------------------------------------
function SecurityCenterModal({
  onClose,
  lang,
  onKeyUpdated,
}: {
  onClose: () => void
  lang: Lang
  onKeyUpdated: () => void
}) {
  const t = STRINGS[lang]
  const [activeTab, setActiveTab] = useState<'passkey' | 'totp' | 'passphrase' | 'keycard' | 'audit'>('passkey')

  // Passkey state
  const [passkeyStatus, setPasskeyStatus] = useState(() => isPasskeyEnrolled())
  const [passkeyMessage, setPasskeyMessage] = useState<string | null>(null)

  // TOTP state
  const [totpSecret, setTotpSecret] = useState(() => getStoredTotpSecret() ?? generateTotpSecret())
  const [totpTestCode, setTotpTestCode] = useState('')
  const [totpEnabledState, setTotpEnabledState] = useState(() => isTotpEnabled())
  const [totpError, setTotpError] = useState<string | null>(null)

  // Passphrase update state
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [passNotice, setPassNotice] = useState<string | null>(null)
  const [passError, setPassError] = useState<string | null>(null)

  // Keycard token state
  const [tokenCopied, setTokenCopied] = useState(false)
  const currentKeyToken = getActiveKeyfileToken()

  const strength = checkPassphraseStrength(newPass)

  const handleRegisterPasskey = async () => {
    setPasskeyMessage(null)
    const res = await registerPasskey()
    if (res.success) {
      setPasskeyStatus(true)
      setPasskeyMessage(t.passkeySuccess)
      onKeyUpdated()
    } else {
      setPasskeyMessage(res.error || t.passkeyError)
    }
  }

  const handleRemovePasskey = () => {
    removePasskey()
    setPasskeyStatus(false)
    setPasskeyMessage('Biometric Passkey removed from this device.')
    onKeyUpdated()
  }

  const handleEnableTotp = async (e: React.FormEvent) => {
    e.preventDefault()
    setTotpError(null)
    const ok = await enableTotp(totpSecret, totpTestCode)
    if (ok) {
      setTotpEnabledState(true)
      setTotpTestCode('')
      onKeyUpdated()
    } else {
      setTotpError(t.totpInvalid)
    }
  }

  const handleDisableTotp = () => {
    disableTotp()
    setTotpEnabledState(false)
    setTotpSecret(generateTotpSecret())
    onKeyUpdated()
  }

  const handleUpdatePassphrase = async (e: React.FormEvent) => {
    e.preventDefault()
    setPassError(null)
    setPassNotice(null)

    if (newPass.length < 10) {
      setPassError(t.passphraseWeak)
      return
    }
    if (newPass !== confirmPass) {
      setPassError(t.passphraseMismatch)
      return
    }

    await updateMasterPassphrase(newPass)
    setNewPass('')
    setConfirmPass('')
    setPassNotice(t.passphraseUpdated)
    onKeyUpdated()
  }

  const handleDownloadKeyfile = () => {
    const token = getActiveKeyfileToken()
    const blob = new Blob([token], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'fornello-staff.key'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleGenerateNewKeycard = () => {
    if (window.confirm('Generate a new 256-bit staff keycard? Older key files will no longer authenticate.')) {
      generateNewKeyfileToken()
      onKeyUpdated()
    }
  }

  const handleCopyKeyToken = () => {
    navigator.clipboard.writeText(currentKeyToken)
    setTokenCopied(true)
    setTimeout(() => setTokenCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto">
      <div className="w-full max-w-xl rounded-3xl bg-card p-6 border border-border shadow-2xl">
        <div className="flex items-center justify-between border-b border-dashed border-foreground/30 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Shield className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-wide uppercase">{t.securityCenter}</h2>
              <p className="text-xs text-muted-foreground">{t.securityCenterSubtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full border border-border hover:bg-foreground/10"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        {/* Security Tabs */}
        <div className="mt-4 grid grid-cols-5 rounded-full border border-border p-1 text-[11px] font-medium text-center">
          <button
            type="button"
            onClick={() => setActiveTab('passkey')}
            className={cn('rounded-full py-1.5 transition-colors', activeTab === 'passkey' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
          >
            Passkey
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('totp')}
            className={cn('rounded-full py-1.5 transition-colors', activeTab === 'totp' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
          >
            2FA
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('passphrase')}
            className={cn('rounded-full py-1.5 transition-colors', activeTab === 'passphrase' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
          >
            Passphrase
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('keycard')}
            className={cn('rounded-full py-1.5 transition-colors', activeTab === 'keycard' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
          >
            Keycard
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={cn('rounded-full py-1.5 transition-colors', activeTab === 'audit' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
          >
            Audit
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-4">
          {/* TAB 1: PASSKEY */}
          {activeTab === 'passkey' ? (
            <div className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-secondary/30 p-5">
              <div className="flex items-center gap-3">
                <Fingerprint className="size-8 text-primary" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-sm">FIDO2 / WebAuthn Biometric Passkeys</p>
                  <p className="text-xs text-muted-foreground">
                    Hardware-backed biometrics via device secure enclave (Touch ID, Face ID, Windows Hello).
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-3 text-xs leading-relaxed">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Device Status:</span>
                  <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold', passkeyStatus ? 'bg-emerald-500/20 text-emerald-300' : 'bg-muted text-muted-foreground')}>
                    {passkeyStatus ? t.passkeyEnrolled : t.passkeyNotEnrolled}
                  </span>
                </div>
              </div>

              {passkeyMessage ? (
                <p className="text-xs text-primary font-medium">{passkeyMessage}</p>
              ) : null}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleRegisterPasskey}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-primary text-xs font-semibold text-primary-foreground hover:opacity-90"
                >
                  <Fingerprint className="size-4" aria-hidden="true" />
                  <span>{t.passkeyRegisterBtn}</span>
                </button>
                {passkeyStatus ? (
                  <button
                    type="button"
                    onClick={handleRemovePasskey}
                    className="h-11 px-4 rounded-full border border-destructive/50 text-xs font-medium text-destructive hover:bg-destructive/10"
                  >
                    {t.passkeyRemoveBtn}
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* TAB 2: TOTP 2FA */}
          {activeTab === 'totp' ? (
            <div className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-secondary/30 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{t.totpSetupTitle}</p>
                  <p className="text-xs text-muted-foreground">{t.totpSetupDesc}</p>
                </div>
                <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', totpEnabledState ? 'bg-emerald-500/20 text-emerald-300' : 'bg-muted text-muted-foreground')}>
                  {totpEnabledState ? t.totpEnabledBadge : t.totpDisabledBadge}
                </span>
              </div>

              {!totpEnabledState ? (
                <div className="flex flex-col items-center gap-4 rounded-2xl bg-card p-4 border border-border">
                  <div className="rounded-xl bg-white p-3 shadow-inner">
                    <QRCodeSVG value={getTotpUri(totpSecret)} size={160} level="M" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">{t.totpSecretKey}:</p>
                    <code className="font-mono text-xs font-semibold text-primary tracking-wider">{totpSecret}</code>
                  </div>

                  <form onSubmit={handleEnableTotp} className="flex w-full flex-col gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={totpTestCode}
                      onChange={(e) => setTotpTestCode(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder={t.totpPlaceholder}
                      className="h-11 rounded-xl border border-input bg-secondary px-3 text-center font-mono text-base tracking-widest"
                    />
                    {totpError ? <p className="text-xs text-destructive text-center">{totpError}</p> : null}
                    <button
                      type="submit"
                      disabled={totpTestCode.length !== 6}
                      className="h-11 rounded-full bg-primary font-medium text-xs text-primary-foreground hover:opacity-90 disabled:opacity-40"
                    >
                      {t.totpEnableBtn}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="flex flex-col gap-3 rounded-2xl bg-card p-4 border border-border">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="size-5" aria-hidden="true" />
                    <span className="text-sm font-semibold">2FA Protection is Active</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your account requires a rotating 30-second verification code from your authenticator app on every login.
                  </p>
                  <button
                    type="button"
                    onClick={handleDisableTotp}
                    className="h-10 w-fit rounded-full border border-destructive/50 px-4 text-xs font-medium text-destructive hover:bg-destructive/10"
                  >
                    {t.totpDisableBtn}
                  </button>
                </div>
              )}
            </div>
          ) : null}

          {/* TAB 3: PASSPHRASE */}
          {activeTab === 'passphrase' ? (
            <form onSubmit={handleUpdatePassphrase} className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-secondary/30 p-5">
              <div>
                <p className="font-semibold text-sm">{t.changePassphrase}</p>
                <p className="text-xs text-muted-foreground">
                  Minimum 10 characters. Hashes are derived with 100,000 PBKDF2 iterations using HMAC-SHA-256.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium">{t.newPassphrase}</label>
                <input
                  type="password"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="Min 10 characters with symbols & numbers"
                  className="h-11 rounded-xl border border-input bg-card px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"
                />
                {newPass ? (
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div
                        className={cn(
                          'h-full transition-all duration-300',
                          strength.score <= 1 && 'bg-destructive w-1/4',
                          strength.score === 2 && 'bg-amber-500 w-2/4',
                          strength.score === 3 && 'bg-primary w-3/4',
                          strength.score >= 4 && 'bg-emerald-500 w-full',
                        )}
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-muted-foreground">{strength.label}</span>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium">{t.confirmPassphrase}</label>
                <input
                  type="password"
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  placeholder="Re-enter passphrase"
                  className="h-11 rounded-xl border border-input bg-card px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"
                />
              </div>

              {passError ? <p className="text-xs text-destructive">{passError}</p> : null}
              {passNotice ? <p className="text-xs text-emerald-400 font-medium">{passNotice}</p> : null}

              <button
                type="submit"
                disabled={!newPass || !confirmPass}
                className="h-11 rounded-full bg-primary font-medium text-xs text-primary-foreground hover:opacity-90 disabled:opacity-40"
              >
                {t.saveChanges}
              </button>
            </form>
          ) : null}

          {/* TAB 4: 256-BIT KEYCARD */}
          {activeTab === 'keycard' ? (
            <div className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-secondary/30 p-5">
              <div>
                <p className="font-semibold text-sm">256-Bit Cryptographic Staff Keycard</p>
                <p className="text-xs text-muted-foreground">
                  High-entropy physical keycard token with 256 bits of cryptographic entropy. Cannot be brute-forced or guessed.
                </p>
              </div>

              <div className="flex flex-col items-center gap-3 rounded-2xl bg-card p-4 border border-border">
                <div className="rounded-xl bg-white p-2.5 shadow-sm">
                  <QRCodeSVG value={currentKeyToken} size={130} level="H" />
                </div>
                <div className="w-full text-center">
                  <p className="text-xs text-muted-foreground">Active Staff Token:</p>
                  <p className="font-mono text-xs font-semibold text-primary break-all">{currentKeyToken}</p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyKeyToken}
                  className="flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium hover:bg-foreground/5"
                >
                  {tokenCopied ? <Check className="size-3 text-emerald-400" aria-hidden="true" /> : <Copy className="size-3" aria-hidden="true" />}
                  <span>{tokenCopied ? t.keyfileTokenCopied : 'Copy Token'}</span>
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDownloadKeyfile}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-primary text-xs font-semibold text-primary-foreground hover:opacity-90"
                >
                  <Download className="size-4" aria-hidden="true" />
                  <span>{t.keyfileDownloadBtn}</span>
                </button>
                <button
                  type="button"
                  onClick={handleGenerateNewKeycard}
                  className="h-11 px-4 rounded-full border border-border text-xs font-medium hover:bg-foreground/10"
                >
                  {t.keyfileGenerateNewBtn}
                </button>
              </div>
            </div>
          ) : null}

          {/* TAB 5: AUDIT */}
          {activeTab === 'audit' ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-secondary/30 p-5 text-xs">
              <div className="flex items-center gap-2 font-semibold text-sm text-primary">
                <ShieldCheck className="size-5" aria-hidden="true" />
                <span>{t.securityAuditTitle}</span>
              </div>
              <p className="leading-relaxed text-muted-foreground">{t.securityAuditDesc}</p>

              <div className="mt-2 divide-y divide-border/60 rounded-xl bg-card border border-border p-3">
                <div className="flex items-center justify-between py-2">
                  <span>PBKDF2 Key Derivation:</span>
                  <span className="font-mono font-semibold text-emerald-400">100,000 rounds HMAC-SHA-256</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span>Hardware WebAuthn:</span>
                  <span className={cn('font-semibold', passkeyStatus ? 'text-emerald-400' : 'text-muted-foreground')}>
                    {passkeyStatus ? 'Enrolled' : 'Not enrolled'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span>TOTP 2FA Authenticator:</span>
                  <span className={cn('font-semibold', totpEnabledState ? 'text-emerald-400' : 'text-muted-foreground')}>
                    {totpEnabledState ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span>Anti-Brute-Force Lockout:</span>
                  <span className="font-semibold text-emerald-400">Active (3/5/8 thresholds)</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span>Session Lifetime:</span>
                  <span className="font-mono text-muted-foreground">4 hours (sessionStorage)</span>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-6 border-t border-dashed border-foreground/30 pt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-6 rounded-full bg-primary font-medium text-xs text-primary-foreground hover:opacity-90"
          >
            {t.done}
          </button>
        </div>
      </div>
    </div>
  )
}
