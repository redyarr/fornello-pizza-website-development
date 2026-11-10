'use client'

import {
  ArrowLeft,
  Bell,
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
  DEFAULT_CATEGORIES,
  DEFAULT_MODIFIER_GROUPS,
  getMergedMenu,
  getMergedModifierGroups,
  getStoredMenuData,
  MODIFIER_GROUPS,
  saveStoredMenuData,
  type CategoryId,
  type CustomMenuItem,
  type Lang,
  type MenuItem,
  type MenuStoreData,
  type ModifierGroup,
  type ModifierOption,
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
  const [studioTab, setStudioTab] = useState<'items' | 'modifiers' | 'categories'>('items')
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
      <main lang={lang} dir={lang === 'ckb' ? 'rtl' : 'ltr'} className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
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
    <main lang={lang} dir={lang === 'ckb' ? 'rtl' : 'ltr'} className="mx-auto min-h-dvh max-w-5xl px-4 py-8 pb-32">
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
          <Link
            href="/floor"
            className="flex h-9 items-center gap-1.5 rounded-full border border-accent/60 bg-accent/15 px-3 text-xs font-semibold text-accent hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Bell className="size-3.5" aria-hidden="true" />
            <span>{t.waiterFloor}</span>
          </Link>
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

      {/* Studio Section Switcher Tabs */}
      <div className="mt-6 flex flex-col gap-1.5 rounded-2xl border border-border bg-card/70 p-1.5 sm:flex-row sm:items-center sm:gap-2">
        <button
          type="button"
          onClick={() => setStudioTab('items')}
          className={cn(
            'flex h-10 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors',
            studioTab === 'items'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-foreground/75 hover:bg-foreground/10 hover:text-foreground',
          )}
        >
          <span>{t.adminTabItems}</span>
          <span className="rounded-full bg-black/15 px-2 py-0.5 text-xs tabular-nums">{merged.length}</span>
        </button>
        <button
          type="button"
          onClick={() => setStudioTab('modifiers')}
          className={cn(
            'flex h-10 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors',
            studioTab === 'modifiers'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-foreground/75 hover:bg-foreground/10 hover:text-foreground',
          )}
        >
          <SlidersHorizontal className="size-4 shrink-0" aria-hidden="true" />
          <span>{t.adminTabModifiers}</span>
        </button>
        <button
          type="button"
          onClick={() => setStudioTab('categories')}
          className={cn(
            'flex h-10 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors',
            studioTab === 'categories'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-foreground/75 hover:bg-foreground/10 hover:text-foreground',
          )}
        >
          <span>{t.adminTabCategories}</span>
        </button>
      </div>

      {studioTab === 'items' ? (
        <>
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
                    {item.groups.length > 0 ? (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {item.groups.map((gid) => {
                          const g = MODIFIER_GROUPS[gid]
                          if (!g) return null
                          return (
                            <span
                              key={gid}
                              className="rounded-full border border-border/80 bg-secondary/70 px-2.5 py-0.5 text-[11px] font-medium text-foreground/80"
                            >
                              {g.label[lang] || g.label.en} ({g.options.length})
                            </span>
                          )
                        })}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 w-full sm:w-auto sm:justify-end sm:self-center">
                    <span className="text-base font-semibold tabular-nums">{formatIQD(item.price)}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleSoldOut(item.id, isSoldOut)}
                        className={cn(
                          'h-9 rounded-full px-3 text-xs font-medium transition-colors',
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
                        className="grid size-9 shrink-0 place-items-center rounded-full border border-border text-foreground/80 hover:bg-foreground/10"
                        aria-label={t.editItem}
                      >
                        <SlidersHorizontal className="size-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        className="grid size-9 shrink-0 place-items-center rounded-full border border-destructive/40 text-destructive hover:bg-destructive/10"
                        aria-label={t.deleteItem}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      ) : null}

      {studioTab === 'modifiers' ? (
        <SaucesAndModifiersStudio
          lang={lang}
          menuData={menuData}
          onSaveData={(next) => {
            setMenuData(next)
            saveStoredMenuData(next)
            notifySync(t.syncSuccess)
          }}
        />
      ) : null}

      {studioTab === 'categories' ? (
        <CategoryHeadersStudio
          lang={lang}
          menuData={menuData}
          onSaveData={(next) => {
            setMenuData(next)
            saveStoredMenuData(next)
            notifySync(t.syncSuccess)
          }}
        />
      ) : null}

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
// SAUCES, TOPPINGS & MODIFIER GROUPS STUDIO
// -------------------------------------------------------------
function SaucesAndModifiersStudio({
  lang,
  menuData,
  onSaveData,
}: {
  lang: Lang
  menuData: MenuStoreData
  onSaveData: (next: MenuStoreData) => void
}) {
  const t = STRINGS[lang]
  const groupsMap = getMergedModifierGroups(menuData)
  const orderedIds = [
    'dips',
    'extras',
    'crust',
    'potatoSize',
    'milk',
    'shots',
    'sweetness',
    'temperature',
    'myFornello',
    ...Object.keys(groupsMap).filter(
      (k) =>
        ![
          'dips',
          'extras',
          'crust',
          'potatoSize',
          'milk',
          'shots',
          'sweetness',
          'temperature',
          'myFornello',
        ].includes(k),
    ),
  ].filter((k) => Boolean(groupsMap[k]))

  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [syncMyFornello, setSyncMyFornello] = useState(true)
  const [isNewGroupOpen, setIsNewGroupOpen] = useState(false)
  const [newGroupEn, setNewGroupEn] = useState('')
  const [newGroupCkb, setNewGroupCkb] = useState('')
  const [newGroupRequired, setNewGroupRequired] = useState(false)
  const [newGroupMax, setNewGroupMax] = useState(3)

  // Per-group quick-add state
  const [draftOptionEn, setDraftOptionEn] = useState<Record<string, string>>({})
  const [draftOptionCkb, setDraftOptionCkb] = useState<Record<string, string>>({})
  const [draftOptionPrice, setDraftOptionPrice] = useState<Record<string, string>>({
    dips: '500',
    extras: '1000',
  })

  const updateGroup = (groupId: string, updater: (prev: ModifierGroup) => ModifierGroup, alsoUpdateMyFornello?: (prev: ModifierGroup) => ModifierGroup) => {
    const current = groupsMap[groupId]
    if (!current) return
    const updated = updater(current)
    const nextGroups: Record<string, ModifierGroup> = {
      ...groupsMap,
      [groupId]: updated,
    }
    if (alsoUpdateMyFornello && groupsMap.myFornello) {
      nextGroups.myFornello = alsoUpdateMyFornello(groupsMap.myFornello)
    }
    onSaveData({
      ...menuData,
      modifierGroups: nextGroups,
    })
  }

  const handleAddOption = (groupId: string) => {
    const enLabel = (draftOptionEn[groupId] ?? '').trim()
    const ckbLabel = (draftOptionCkb[groupId] ?? '').trim()
    if (!enLabel && !ckbLabel) return

    const finalEn = enLabel || ckbLabel
    const finalCkb = ckbLabel || enLabel
    const defaultPrice = groupId === 'dips' ? 500 : groupId === 'extras' ? 1000 : 0
    const rawPrice = draftOptionPrice[groupId] ?? String(defaultPrice)
    const numPrice = Math.max(0, Number(rawPrice.replace(/[^0-9]/g, '')) || 0)
    const slug = finalEn.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'opt'
    const newOpt: ModifierOption = {
      id: `${slug}-${Date.now().toString().slice(-3)}`,
      label: { en: finalEn, ckb: finalCkb },
      price: numPrice,
    }

    updateGroup(
      groupId,
      (prev) => ({
        ...prev,
        options: [...prev.options, newOpt],
      }),
      groupId === 'extras' && syncMyFornello
        ? (prevMy) => ({
            ...prevMy,
            options: [...prevMy.options, { ...newOpt, price: 0 }],
          })
        : undefined,
    )

    setDraftOptionEn((prev) => ({ ...prev, [groupId]: '' }))
    setDraftOptionCkb((prev) => ({ ...prev, [groupId]: '' }))
  }

  const handleRemoveOption = (groupId: string, optionId: string) => {
    updateGroup(
      groupId,
      (prev) => ({
        ...prev,
        defaults: prev.defaults?.filter((d) => d !== optionId),
        options: prev.options.filter((o) => o.id !== optionId),
      }),
      groupId === 'extras' && syncMyFornello
        ? (prevMy) => ({
            ...prevMy,
            options: prevMy.options.filter((o) => o.id !== optionId),
          })
        : undefined,
    )
  }

  const handleUpdateOptionField = (
    groupId: string,
    optionId: string,
    patch: { en?: string; ckb?: string; price?: number },
  ) => {
    updateGroup(
      groupId,
      (prev) => ({
        ...prev,
        options: prev.options.map((o) =>
          o.id === optionId
            ? {
                ...o,
                label: {
                  en: patch.en !== undefined ? patch.en : o.label.en,
                  ckb: patch.ckb !== undefined ? patch.ckb : o.label.ckb,
                },
                price: patch.price !== undefined ? patch.price : o.price,
              }
            : o,
        ),
      }),
      groupId === 'extras' && syncMyFornello && (patch.en !== undefined || patch.ckb !== undefined)
        ? (prevMy) => ({
            ...prevMy,
            options: prevMy.options.map((o) =>
              o.id === optionId
                ? {
                    ...o,
                    label: {
                      en: patch.en !== undefined ? patch.en : o.label.en,
                      ckb: patch.ckb !== undefined ? patch.ckb : o.label.ckb,
                    },
                  }
                : o,
            ),
          })
        : undefined,
    )
  }

  const handleToggleDefaultOption = (groupId: string, optionId: string) => {
    updateGroup(groupId, (prev) => {
      const currentDefaults = prev.defaults ?? []
      if (prev.max === 1) {
        return {
          ...prev,
          defaults: currentDefaults.includes(optionId) && prev.min === 0 ? [] : [optionId],
        }
      }
      const nextDefaults = currentDefaults.includes(optionId)
        ? currentDefaults.filter((d) => d !== optionId)
        : [...currentDefaults, optionId].slice(0, prev.max)
      return {
        ...prev,
        defaults: nextDefaults,
      }
    })
  }

  const handleResetGroup = (groupId: string) => {
    const factory = DEFAULT_MODIFIER_GROUPS[groupId]
    if (!factory) {
      // Custom group: delete it
      const nextGroups = { ...groupsMap }
      delete nextGroups[groupId]
      onSaveData({
        ...menuData,
        modifierGroups: nextGroups,
      })
      return
    }
    const nextGroups: Record<string, ModifierGroup> = {
      ...groupsMap,
      [groupId]: {
        ...factory,
        label: { ...factory.label },
        defaults: factory.defaults ? [...factory.defaults] : undefined,
        options: factory.options.map((o) => ({ ...o, label: { ...o.label } })),
      },
    }
    onSaveData({
      ...menuData,
      modifierGroups: nextGroups,
    })
  }

  const handleCreateCustomGroup = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGroupEn.trim() && !newGroupCkb.trim()) return
    const enLabel = newGroupEn.trim() || newGroupCkb.trim()
    const ckbLabel = newGroupCkb.trim() || newGroupEn.trim()
    const slug = enLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'group'
    const id = `custom-${slug}-${Date.now().toString().slice(-3)}`
    const newGroup: ModifierGroup = {
      id,
      label: { en: enLabel, ckb: ckbLabel },
      min: newGroupRequired ? 1 : 0,
      max: Math.max(1, newGroupMax),
      options: [],
    }
    onSaveData({
      ...menuData,
      modifierGroups: {
        ...groupsMap,
        [id]: newGroup,
      },
    })
    setNewGroupEn('')
    setNewGroupCkb('')
    setIsNewGroupOpen(false)
    setActiveFilter(id)
  }

  const visibleGroupIds =
    activeFilter === 'all' ? orderedIds : orderedIds.filter((id) => id === activeFilter)

  return (
    <div className="mt-6 flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-wide uppercase">
            {t.saucesAndOptionsTitle}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t.saucesAndOptionsSubtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => setIsNewGroupOpen((v) => !v)}
          className="flex h-10 shrink-0 items-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-accent-foreground hover:opacity-90"
        >
          <Plus className="size-4" aria-hidden="true" />
          <span>{t.createNewGroupBtn}</span>
        </button>
      </div>

      {isNewGroupOpen ? (
        <form
          onSubmit={handleCreateCustomGroup}
          className="flex flex-col gap-4 rounded-3xl border border-primary/50 bg-card p-5 shadow-lg"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold uppercase">{t.newGroupTitle}</h3>
            <button
              type="button"
              onClick={() => setIsNewGroupOpen(false)}
              className="grid size-8 place-items-center rounded-full border border-border hover:bg-foreground/10"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="text"
              required
              value={newGroupEn}
              onChange={(e) => setNewGroupEn(e.target.value)}
              placeholder={t.groupTitleEnPlaceholder}
              className="h-11 rounded-xl border border-input bg-secondary px-3.5 text-sm"
            />
            <input
              type="text"
              dir="rtl"
              value={newGroupCkb}
              onChange={(e) => setNewGroupCkb(e.target.value)}
              placeholder={t.groupTitleCkbPlaceholder}
              className="h-11 rounded-xl border border-input bg-secondary px-3.5 text-sm"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={newGroupRequired}
                  onChange={(e) => setNewGroupRequired(e.target.checked)}
                  className="size-4 rounded accent-primary"
                />
                <span>{t.groupRuleRequired}</span>
              </label>
              <div className="flex items-center gap-2 text-xs font-medium">
                <span>{t.groupMaxChoices}:</span>
                <select
                  value={newGroupMax}
                  onChange={(e) => setNewGroupMax(Number(e.target.value))}
                  className="h-9 rounded-lg border border-input bg-secondary px-2.5 text-xs"
                >
                  {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="h-10 rounded-full bg-primary px-5 text-xs font-semibold text-primary-foreground hover:opacity-90"
            >
              {t.createNewGroupBtn}
            </button>
          </div>
        </form>
      ) : null}

      {/* Quick Filter Pills for Sauces, Toppings, Crust, etc. */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        <button
          type="button"
          onClick={() => setActiveFilter('all')}
          className={cn(
            'h-9 shrink-0 rounded-full border px-4 text-xs font-semibold transition-colors',
            activeFilter === 'all'
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-card hover:bg-foreground/10',
          )}
        >
          All ({orderedIds.length})
        </button>
        {orderedIds.map((id) => {
          const g = groupsMap[id]
          if (!g) return null
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveFilter(id)}
              className={cn(
                'h-9 shrink-0 rounded-full border px-3.5 text-xs font-medium transition-colors',
                activeFilter === id
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card hover:bg-foreground/10',
              )}
            >
              {g.label[lang] || g.label.en} ({g.options.length})
            </button>
          )
        })}
      </div>

      {/* Group Cards */}
      <div className="flex flex-col gap-6">
        {visibleGroupIds.map((groupId) => {
          const group = groupsMap[groupId]
          if (!group) return null
          const isDips = groupId === 'dips'
          const isExtras = groupId === 'extras'
          const defaultAddPrice = isDips ? '500' : isExtras ? '1000' : '0'
          const currentDraftPrice = draftOptionPrice[groupId] ?? defaultAddPrice

          return (
            <div
              key={groupId}
              className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-sm"
            >
              {/* Group Header & Rule Controls */}
              <div className="flex flex-col gap-3 border-b border-dashed border-foreground/20 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <input
                    type="text"
                    value={group.label.en}
                    onChange={(e) =>
                      updateGroup(groupId, (prev) => ({
                        ...prev,
                        label: { ...prev.label, en: e.target.value },
                      }))
                    }
                    aria-label="Group English Title"
                    className="h-9 rounded-xl border border-transparent bg-transparent px-2 font-display text-xl font-semibold tracking-wide uppercase hover:border-border focus:border-input focus:bg-secondary"
                  />
                  <input
                    type="text"
                    dir="rtl"
                    value={group.label.ckb}
                    onChange={(e) =>
                      updateGroup(groupId, (prev) => ({
                        ...prev,
                        label: { ...prev.label, ckb: e.target.value },
                      }))
                    }
                    aria-label="Group Kurdish Title"
                    className="h-9 rounded-xl border border-transparent bg-secondary/50 px-3 text-sm font-medium text-primary hover:border-border focus:border-input focus:bg-secondary"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Required vs Optional toggle */}
                  <button
                    type="button"
                    onClick={() =>
                      updateGroup(groupId, (prev) => ({
                        ...prev,
                        min: prev.min > 0 ? 0 : 1,
                      }))
                    }
                    className={cn(
                      'h-8 rounded-full border px-3 text-xs font-medium transition-colors',
                      group.min > 0
                        ? 'border-primary/60 bg-primary/15 text-primary'
                        : 'border-border text-muted-foreground hover:bg-foreground/10',
                    )}
                  >
                    {group.min > 0 ? t.groupRuleRequired : t.groupRuleOptional}
                  </button>

                  {/* Max choices selector */}
                  <div className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs">
                    <span className="text-muted-foreground">{t.groupMaxChoices}:</span>
                    <select
                      value={group.max}
                      onChange={(e) => {
                        const nextMax = Number(e.target.value)
                        updateGroup(groupId, (prev) => ({
                          ...prev,
                          max: nextMax,
                          min: Math.min(prev.min, nextMax),
                        }))
                      }}
                      className="bg-transparent font-semibold text-foreground focus:outline-none"
                    >
                      {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                        <option key={n} value={n} className="bg-card text-foreground">
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Reset Group button */}
                  <button
                    type="button"
                    onClick={() => handleResetGroup(groupId)}
                    className="h-8 rounded-full border border-border px-3 text-xs text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
                  >
                    {DEFAULT_MODIFIER_GROUPS[groupId] ? t.resetGroupBtn : t.deleteItem}
                  </button>
                </div>
              </div>

              {/* Sync checkbox for Pizza Extra Toppings -> My Fornello */}
              {isExtras ? (
                <label className="flex items-center gap-2.5 rounded-2xl border border-primary/30 bg-primary/10 px-3.5 py-2.5 text-xs font-medium text-primary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncMyFornello}
                    onChange={(e) => setSyncMyFornello(e.target.checked)}
                    className="size-4 rounded accent-primary"
                  />
                  <span>{t.syncMyFornelloLabel}</span>
                </label>
              ) : null}

              {/* Quick Add New Sauce / Topping / Option Row */}
              <div className="flex flex-col gap-2.5 rounded-2xl border border-accent/35 bg-secondary/60 p-3.5 sm:flex-row sm:items-center">
                <input
                  type="text"
                  value={draftOptionEn[groupId] ?? ''}
                  onChange={(e) =>
                    setDraftOptionEn((prev) => ({ ...prev, [groupId]: e.target.value }))
                  }
                  placeholder={t.optionNameEnPlaceholder}
                  className="h-10 flex-1 rounded-xl border border-input bg-card px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"
                />
                <input
                  type="text"
                  dir="rtl"
                  value={draftOptionCkb[groupId] ?? ''}
                  onChange={(e) =>
                    setDraftOptionCkb((prev) => ({ ...prev, [groupId]: e.target.value }))
                  }
                  placeholder={t.optionNameCkbPlaceholder}
                  className="h-10 flex-1 rounded-xl border border-input bg-card px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="250"
                    min="0"
                    value={currentDraftPrice}
                    onChange={(e) =>
                      setDraftOptionPrice((prev) => ({ ...prev, [groupId]: e.target.value }))
                    }
                    placeholder={t.optionPricePlaceholder}
                    className="h-10 w-28 rounded-xl border border-input bg-card px-3 text-sm tabular-nums focus-visible:outline-2 focus-visible:outline-ring"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddOption(groupId)}
                    className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-accent px-4 text-xs font-semibold text-accent-foreground hover:opacity-90"
                  >
                    <Plus className="size-4" aria-hidden="true" />
                    <span>{t.addOptionBtn}</span>
                  </button>
                </div>
              </div>

              {/* Existing Options List */}
              <div className="divide-y divide-dashed divide-foreground/15">
                {group.options.map((opt) => {
                  const isDefault = Boolean(group.defaults?.includes(opt.id))
                  return (
                    <div
                      key={opt.id}
                      className="flex flex-col gap-2.5 py-3 first:pt-1 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="grid flex-1 gap-2 sm:grid-cols-2">
                        <input
                          type="text"
                          value={opt.label.en}
                          onChange={(e) =>
                            handleUpdateOptionField(groupId, opt.id, { en: e.target.value })
                          }
                          aria-label="English option name"
                          className="h-9 rounded-xl border border-input/70 bg-secondary/50 px-3 text-sm font-medium focus:border-primary focus:bg-secondary focus:outline-none"
                        />
                        <input
                          type="text"
                          dir="rtl"
                          value={opt.label.ckb}
                          onChange={(e) =>
                            handleUpdateOptionField(groupId, opt.id, { ckb: e.target.value })
                          }
                          aria-label="Kurdish option name"
                          className="h-9 rounded-xl border border-input/70 bg-secondary/50 px-3 text-sm font-medium focus:border-primary focus:bg-secondary focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        <div className="relative flex items-center">
                          <input
                            type="number"
                            step="250"
                            min="0"
                            value={opt.price}
                            onChange={(e) =>
                              handleUpdateOptionField(groupId, opt.id, {
                                price: Math.max(0, Number(e.target.value) || 0),
                              })
                            }
                            aria-label="Price in IQD"
                            className="h-9 w-28 rounded-xl border border-input/70 bg-secondary/50 ps-3 pe-10 text-end text-sm font-semibold tabular-nums focus:border-primary focus:outline-none"
                          />
                          <span className="pointer-events-none absolute end-2.5 text-[10px] font-medium text-muted-foreground">
                            IQD
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleDefaultOption(groupId, opt.id)}
                          className={cn(
                            'h-9 rounded-full border px-3 text-xs font-medium transition-colors',
                            isDefault
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border text-muted-foreground hover:bg-foreground/10',
                          )}
                        >
                          {isDefault ? t.defaultOptionBadge : t.setDefaultOption}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveOption(groupId, opt.id)}
                          aria-label={t.remove}
                          className="grid size-9 shrink-0 place-items-center rounded-full border border-destructive/40 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// -------------------------------------------------------------
// CATEGORY HEADERS & SUBTITLES STUDIO
// -------------------------------------------------------------
function CategoryHeadersStudio({
  lang,
  menuData,
  onSaveData,
}: {
  lang: Lang
  menuData: MenuStoreData
  onSaveData: (next: MenuStoreData) => void
}) {
  const t = STRINGS[lang]

  const handleUpdateCategory = (
    catId: CategoryId,
    field: 'title' | 'subtitle',
    locale: Lang,
    value: string,
  ) => {
    const baseCat = DEFAULT_CATEGORIES.find((c) => c.id === catId)!
    const existingOverride = menuData.categoryOverrides?.[catId] ?? {}
    const currentField = existingOverride[field] ?? baseCat[field]
    const nextOverrides = {
      ...menuData.categoryOverrides,
      [catId]: {
        ...existingOverride,
        [field]: {
          ...currentField,
          [locale]: value,
        },
      },
    }
    onSaveData({
      ...menuData,
      categoryOverrides: nextOverrides,
    })
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      <div className="rounded-3xl border border-border bg-card p-6">
        <h2 className="font-display text-2xl font-semibold tracking-wide uppercase">
          {t.categoryHeadersTitle}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t.categoryHeadersSubtitle}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {CATEGORIES.map((cat) => (
          <div key={cat.id} className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-5">
            <div className="flex items-center justify-between border-b border-dashed border-foreground/20 pb-2.5">
              <span className="font-display text-lg font-semibold uppercase text-primary">
                {cat.title[lang]}
              </span>
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-mono text-muted-foreground">
                #{cat.id}
              </span>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Title (English)</label>
                <input
                  type="text"
                  value={cat.title.en}
                  onChange={(e) => handleUpdateCategory(cat.id, 'title', 'en', e.target.value)}
                  className="h-9 rounded-xl border border-input bg-secondary px-3 text-sm font-medium"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">ناونیشان (کوردی)</label>
                <input
                  type="text"
                  dir="rtl"
                  value={cat.title.ckb}
                  onChange={(e) => handleUpdateCategory(cat.id, 'title', 'ckb', e.target.value)}
                  className="h-9 rounded-xl border border-input bg-secondary px-3 text-sm font-medium"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Subtitle / Price Banner (English)</label>
              <input
                type="text"
                value={cat.subtitle.en}
                onChange={(e) => handleUpdateCategory(cat.id, 'subtitle', 'en', e.target.value)}
                className="h-9 rounded-xl border border-input bg-secondary px-3 text-sm"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">ژێرنووس و تێبینیی نرخ (کوردی)</label>
              <input
                type="text"
                dir="rtl"
                value={cat.subtitle.ckb}
                onChange={(e) => handleUpdateCategory(cat.id, 'subtitle', 'ckb', e.target.value)}
                className="h-9 rounded-xl border border-input bg-secondary px-3 text-sm"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
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
  const defaultGroupsByCategory: Record<CategoryId, string[]> = {
    pizza: ['crust', 'extras', 'dips'],
    taglio: ['dips'],
    coffee: ['temperature', 'milk', 'shots', 'sweetness'],
    potato: ['potatoSize', 'dips'],
  }

  const [name, setName] = useState('')
  const [descEn, setDescEn] = useState('')
  const [descCkb, setDescCkb] = useState('')
  const [category, setCategory] = useState<CategoryId>('pizza')
  const [price, setPrice] = useState('6500')
  const [tags, setTags] = useState<Tag[]>([])
  const [groups, setGroups] = useState<string[]>(defaultGroupsByCategory.pizza)
  const [image, setImage] = useState(IMAGE_PRESETS[0].src)

  const tagOptions: Tag[] = ['signature', 'spicy', 'vegetarian', 'caffeine']
  const allModifierGroupIds = Object.keys(MODIFIER_GROUPS)

  const handleCategoryChange = (nextCat: CategoryId) => {
    setCategory(nextCat)
    setGroups(defaultGroupsByCategory[nextCat] ?? [])
  }

  const toggleTag = (tag: Tag) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  const toggleGroup = (gid: string) => {
    setGroups((prev) => (prev.includes(gid) ? prev.filter((g) => g !== gid) : [...prev, gid]))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const numPrice = Number(price.replace(/[^0-9]/g, '')) || 5000
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const id = `custom-${slug}-${Date.now().toString().slice(-4)}`

    const newItem: CustomMenuItem = {
      id,
      category,
      name: name.trim(),
      description: descEn.trim() || descCkb.trim() ? { en: descEn.trim(), ckb: descCkb.trim() } : undefined,
      price: numPrice,
      tags,
      image,
      groups,
      custom: true,
      soldOut: false,
    }

    onAdd(newItem)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto">
      <div className="my-auto w-full max-w-lg rounded-3xl bg-card p-6 border border-border shadow-2xl max-h-[92dvh] overflow-y-auto">
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
                onChange={(e) => handleCategoryChange(e.target.value as CategoryId)}
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

          {/* Customization Option Groups Selector */}
          <div className="flex flex-col gap-1.5 rounded-2xl border border-border bg-secondary/40 p-3.5">
            <label className="text-sm font-semibold">{t.itemCustomizationGroups}</label>
            <p className="text-xs text-muted-foreground">{t.itemCustomizationHint}</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {allModifierGroupIds.map((gid) => {
                const g = MODIFIER_GROUPS[gid]
                if (!g) return null
                const active = groups.includes(gid)
                return (
                  <button
                    key={gid}
                    type="button"
                    onClick={() => toggleGroup(gid)}
                    className={cn(
                      'flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors',
                      active
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card hover:bg-foreground/10',
                    )}
                  >
                    {active ? <Check className="size-3.5" aria-hidden="true" /> : null}
                    <span>{g.label[lang] || g.label.en}</span>
                    <span className="opacity-70">({g.options.length})</span>
                  </button>
                )
              })}
            </div>
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
  const [groups, setGroups] = useState<string[]>(item.groups ?? [])
  const [soldOut, setSoldOut] = useState(Boolean(item.soldOut))
  const [image, setImage] = useState(item.image ?? IMAGE_PRESETS[0].src)

  const tagOptions: Tag[] = ['signature', 'spicy', 'vegetarian', 'caffeine']
  const allModifierGroupIds = Object.keys(MODIFIER_GROUPS)

  const toggleTag = (tag: Tag) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  const toggleGroup = (gid: string) => {
    setGroups((prev) => (prev.includes(gid) ? prev.filter((g) => g !== gid) : [...prev, gid]))
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
      groups,
      image,
      soldOut,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto">
      <div className="my-auto w-full max-w-lg rounded-3xl bg-card p-6 border border-border shadow-2xl max-h-[92dvh] overflow-y-auto">
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

          {/* Customization Option Groups Selector */}
          <div className="flex flex-col gap-1.5 rounded-2xl border border-border bg-secondary/40 p-3.5">
            <label className="text-sm font-semibold">{t.itemCustomizationGroups}</label>
            <p className="text-xs text-muted-foreground">{t.itemCustomizationHint}</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {allModifierGroupIds.map((gid) => {
                const g = MODIFIER_GROUPS[gid]
                if (!g) return null
                const active = groups.includes(gid)
                return (
                  <button
                    key={gid}
                    type="button"
                    onClick={() => toggleGroup(gid)}
                    className={cn(
                      'flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors',
                      active
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card hover:bg-foreground/10',
                    )}
                  >
                    {active ? <Check className="size-3.5" aria-hidden="true" /> : null}
                    <span>{g.label[lang] || g.label.en}</span>
                    <span className="opacity-70">({g.options.length})</span>
                  </button>
                )
              })}
            </div>
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
            <button
              type="button"
              onClick={onDelete}
              className="h-12 px-4 rounded-full border border-destructive/50 text-destructive text-sm font-medium hover:bg-destructive/10"
            >
              {t.deleteItem}
            </button>
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
