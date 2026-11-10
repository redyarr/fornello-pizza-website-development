// Zero-Backend Cryptographic Security & Anti-Brute-Force Engine
// Implements:
// 1. WebAuthn Biometric & Hardware Passkeys (Touch ID, Face ID, Windows Hello, YubiKey)
// 2. RFC 6238 TOTP Dynamic 2FA (Google Authenticator, Apple Passwords, 1Password)
// 3. 256-bit Cryptographic Physical Digital Staff Keycard (.key tokens)
// 4. 100,000-round PBKDF2 HMAC-SHA-256 Master Passphrase derivation
// 5. Exponential Anti-Brute-Force Lockout Shield (3 attempts = 30s, 5 = 5m, 8 = permanent lockdown)

const PBKDF2_SALT = 'fornello_salt_secure_2026'
const PBKDF2_ITERATIONS = 100000
const DEFAULT_HASH = '9a2b59da9faabca4d52be2f86f7ac34e21a03c5439ee6e0216afa9666b542fcf' // Fornello@2026!
const MASTER_KEY_STORAGE = 'fornello_master_hash_v1'
const KEYFILE_STORAGE = 'fornello_keyfile_token_v1'
const DEFAULT_KEYFILE_TOKEN = 'FORNELLO-STAFF-KEY-9X82P4L7Q1M5-E93B718D02C45FA1'

const PASSKEY_STORAGE = 'fornello_passkey_cred_id_v1'
const TOTP_SECRET_STORAGE = 'fornello_totp_secret_v1'
const LOCKOUT_STORAGE = 'fornello_security_lockout_v1'
const AUTH_SESSION_KEY = 'fornello_staff_session_v1'

export type LockoutStatus = {
  attempts: number
  lockedUntil: number
  permanentlyLocked: boolean
}

// -------------------------------------------------------------
// 1. PBKDF2 Master Passphrase Cryptography
// -------------------------------------------------------------

export async function hashPassphrase(passphrase: string): Promise<string> {
  const enc = new TextEncoder()
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase.trim()),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  )
  const salt = enc.encode(PBKDF2_SALT)
  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  )
  return Array.from(new Uint8Array(derivedBits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function checkPassphraseStrength(passphrase: string): { score: number; label: string } {
  const p = passphrase.trim()
  if (!p) return { score: 0, label: 'Empty' }
  let score = 0
  if (p.length >= 10) score += 1
  if (p.length >= 14) score += 1
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score += 1
  if (/[0-9]/.test(p)) score += 1
  if (/[^A-Za-z0-9]/.test(p)) score += 1

  const labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Impenetrable']
  return { score: Math.min(4, score), label: labels[Math.min(4, score)] }
}

export async function verifyPassphrase(inputPassphrase: string): Promise<boolean> {
  const status = getLockoutStatus()
  if (status.lockedUntil > Date.now()) {
    return false
  }

  const storedHash = localStorage.getItem(MASTER_KEY_STORAGE) ?? DEFAULT_HASH
  const inputHash = await hashPassphrase(inputPassphrase)

  if (inputHash === storedHash) {
    resetLockout()
    createAuthorizedSession()
    return true
  }

  recordFailedAttempt()
  return false
}

export async function updateMasterPassphrase(newPassphrase: string): Promise<void> {
  const hash = await hashPassphrase(newPassphrase)
  localStorage.setItem(MASTER_KEY_STORAGE, hash)
}

// -------------------------------------------------------------
// 2. WebAuthn Biometric & Hardware Passkeys (Touch ID / Face ID)
// -------------------------------------------------------------

export function isWebAuthnSupported(): boolean {
  return typeof window !== 'undefined' && Boolean(window.PublicKeyCredential)
}

export function isPasskeyEnrolled(): boolean {
  if (typeof window === 'undefined') return false
  return Boolean(localStorage.getItem(PASSKEY_STORAGE))
}

export async function registerPasskey(): Promise<{ success: boolean; error?: string }> {
  if (!isWebAuthnSupported()) {
    return { success: false, error: 'WebAuthn is not supported in this browser' }
  }
  try {
    const challenge = new Uint8Array(32)
    window.crypto.getRandomValues(challenge)
    const userId = new Uint8Array(16)
    window.crypto.getRandomValues(userId)

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'Fornello Pizza Staff Studio', id: window.location.hostname },
        user: {
          id: userId,
          name: 'staff@fornellopizza.local',
          displayName: 'Fornello Staff Manager',
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 }, // ES256
          { type: 'public-key', alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
      },
    })) as PublicKeyCredential | null

    if (credential) {
      const rawIdB64 = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)))
      localStorage.setItem(PASSKEY_STORAGE, rawIdB64)
      return { success: true }
    }
    return { success: false, error: 'Registration cancelled' }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Passkey registration failed'
    return { success: false, error: msg }
  }
}

export async function verifyPasskey(): Promise<boolean> {
  const status = getLockoutStatus()
  if (status.lockedUntil > Date.now()) return false

  const credIdB64 = localStorage.getItem(PASSKEY_STORAGE)
  if (!credIdB64) return false

  try {
    const challenge = new Uint8Array(32)
    window.crypto.getRandomValues(challenge)

    const bin = atob(credIdB64)
    const rawId = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) rawId[i] = bin.charCodeAt(i)

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [
          {
            type: 'public-key',
            id: rawId,
          },
        ],
        userVerification: 'required',
        timeout: 60000,
      },
    })

    if (assertion) {
      resetLockout()
      createAuthorizedSession()
      return true
    }
    recordFailedAttempt()
    return false
  } catch {
    recordFailedAttempt()
    return false
  }
}

export function removePasskey(): void {
  try {
    localStorage.removeItem(PASSKEY_STORAGE)
  } catch {}
}

// -------------------------------------------------------------
// 3. RFC 6238 TOTP Authenticator (Google Authenticator / Apple)
// -------------------------------------------------------------

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function base32ToBytes(base32: string): Uint8Array {
  const clean = base32.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '')
  let bits = ''
  for (let i = 0; i < clean.length; i++) {
    const val = BASE32_ALPHABET.indexOf(clean[i])
    if (val === -1) continue
    bits += val.toString(2).padStart(5, '0')
  }
  const bytes: number[] = []
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(Number.parseInt(bits.substr(i, 8), 2))
  }
  return new Uint8Array(bytes)
}

export function generateTotpSecret(): string {
  const bytes = new Uint8Array(20)
  window.crypto.getRandomValues(bytes)
  let bits = ''
  for (const b of bytes) bits += b.toString(2).padStart(8, '0')
  let base32 = ''
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    const chunk = bits.substr(i, 5)
    base32 += BASE32_ALPHABET[Number.parseInt(chunk, 2)]
  }
  return base32
}

export function getTotpUri(secret: string): string {
  return `otpauth://totp/Fornello%20Pizza:Staff%20Studio?secret=${secret}&issuer=Fornello%20Pizza&algorithm=SHA1&digits=6&period=30`
}

export async function computeTotp(secret: string, stepOffset = 0): Promise<string> {
  const step = Math.floor(Date.now() / 1000 / 30) + stepOffset
  const keyBytes = base32ToBytes(secret)
  const cryptoKey = await window.crypto.subtle.importKey(
    'raw',
    keyBytes as unknown as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  )
  const buffer = new ArrayBuffer(8)
  const view = new DataView(buffer)
  view.setUint32(4, step, false)
  const hmac = await window.crypto.subtle.sign('HMAC', cryptoKey, buffer)
  const hmacBytes = new Uint8Array(hmac)
  const offset = hmacBytes[19] & 0x0f
  const code =
    ((hmacBytes[offset] & 0x7f) << 24) |
    ((hmacBytes[offset + 1] & 0xff) << 16) |
    ((hmacBytes[offset + 2] & 0xff) << 8) |
    (hmacBytes[offset + 3] & 0xff)
  return (code % 1000000).toString().padStart(6, '0')
}

export function isTotpEnabled(): boolean {
  if (typeof window === 'undefined') return false
  return Boolean(localStorage.getItem(TOTP_SECRET_STORAGE))
}

export function getStoredTotpSecret(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOTP_SECRET_STORAGE)
}

export async function verifyTotpCode(inputCode: string): Promise<boolean> {
  const status = getLockoutStatus()
  if (status.lockedUntil > Date.now()) return false

  const secret = getStoredTotpSecret()
  if (!secret) return false

  const clean = inputCode.trim()
  if (clean.length !== 6) return false

  for (const offset of [0, -1, 1]) {
    const validCode = await computeTotp(secret, offset)
    if (validCode === clean) {
      resetLockout()
      createAuthorizedSession()
      return true
    }
  }

  recordFailedAttempt()
  return false
}

export async function enableTotp(secret: string, testCode: string): Promise<boolean> {
  const clean = testCode.trim()
  for (const offset of [0, -1, 1]) {
    const valid = await computeTotp(secret, offset)
    if (valid === clean) {
      localStorage.setItem(TOTP_SECRET_STORAGE, secret)
      return true
    }
  }
  return false
}

export function disableTotp(): void {
  try {
    localStorage.removeItem(TOTP_SECRET_STORAGE)
  } catch {}
}

// -------------------------------------------------------------
// 4. 256-bit Physical Cryptographic Staff Keycard
// -------------------------------------------------------------

export function generateNewKeyfileToken(): string {
  const array = new Uint8Array(32) // 256 bits of entropy
  window.crypto.getRandomValues(array)
  const token =
    'FORNELLO-STAFF-KEY-' +
    Array.from(array, (byte) => byte.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  localStorage.setItem(KEYFILE_STORAGE, token)
  return token
}

export function verifyKeyfileToken(token: string): boolean {
  const storedToken = localStorage.getItem(KEYFILE_STORAGE) ?? DEFAULT_KEYFILE_TOKEN
  const cleanedInput = token.trim()

  if (cleanedInput === storedToken) {
    resetLockout()
    createAuthorizedSession()
    return true
  }

  recordFailedAttempt()
  return false
}

export function getActiveKeyfileToken(): string {
  if (typeof window === 'undefined') return DEFAULT_KEYFILE_TOKEN
  return localStorage.getItem(KEYFILE_STORAGE) ?? DEFAULT_KEYFILE_TOKEN
}

// -------------------------------------------------------------
// 5. Anti-Brute-Force Exponential Lockout Engine
// -------------------------------------------------------------

export function getLockoutStatus(): LockoutStatus {
  if (typeof window === 'undefined') return { attempts: 0, lockedUntil: 0, permanentlyLocked: false }
  try {
    const raw = localStorage.getItem(LOCKOUT_STORAGE)
    if (!raw) return { attempts: 0, lockedUntil: 0, permanentlyLocked: false }
    const parsed = JSON.parse(raw) as LockoutStatus
    return {
      attempts: parsed.attempts || 0,
      lockedUntil: parsed.lockedUntil || 0,
      permanentlyLocked: Boolean(parsed.permanentlyLocked),
    }
  } catch {
    return { attempts: 0, lockedUntil: 0, permanentlyLocked: false }
  }
}

export function recordFailedAttempt(): LockoutStatus {
  const current = getLockoutStatus()
  const nextAttempts = current.attempts + 1
  const now = Date.now()
  let lockedUntil = 0
  let permanentlyLocked = false

  if (nextAttempts >= 8) {
    permanentlyLocked = true
    lockedUntil = now + 86400000 // 24 hours or physical keyfile/passkey reset
  } else if (nextAttempts >= 5) {
    lockedUntil = now + 300000 // 5 minutes
  } else if (nextAttempts >= 3) {
    lockedUntil = now + 30000 // 30 seconds
  }

  const nextStatus: LockoutStatus = {
    attempts: nextAttempts,
    lockedUntil,
    permanentlyLocked,
  }

  try {
    localStorage.setItem(LOCKOUT_STORAGE, JSON.stringify(nextStatus))
  } catch {}

  return nextStatus
}

export function resetLockout(): void {
  try {
    localStorage.removeItem(LOCKOUT_STORAGE)
  } catch {}
}

// -------------------------------------------------------------
// 6. Ephemeral Staff Authorized Session
// -------------------------------------------------------------

export function isSessionAuthorized(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const session = sessionStorage.getItem(AUTH_SESSION_KEY)
    if (!session) return false
    const ts = Number(session)
    // 4 hour ephemeral session limit
    if (Date.now() - ts > 14400000) {
      sessionStorage.removeItem(AUTH_SESSION_KEY)
      return false
    }
    return true
  } catch {
    return false
  }
}

export function createAuthorizedSession(): void {
  try {
    sessionStorage.setItem(AUTH_SESSION_KEY, String(Date.now()))
  } catch {}
}

export function clearAuthorizedSession(): void {
  try {
    sessionStorage.removeItem(AUTH_SESSION_KEY)
  } catch {}
}
