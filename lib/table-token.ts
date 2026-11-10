// Cryptographic Table Verification & Anti-Tampering Engine
// Ensures customers can only dine-in at a table by scanning the physical QR stand.
// Prevents URL manipulation (?table=XX), cross-table griefing, and remote orders from home onto floor tables.

const TABLE_SECRET_SALT = 'fornello_table_secret_sulaymaniyah_2026_salt_v1'

/**
 * Fast, pure TypeScript SHA-256 implementation (0 dependencies).
 * Works identically in Node.js (SSR) and modern browsers.
 */
function sha256(ascii: string): string {
  const mathPow = Math.pow
  const maxWord = mathPow(2, 32)
  const lengthProperty = 'length'
  let i = 0
  let j = 0
  let result = ''

  const words: number[] = []
  const asciiBitLength = ascii[lengthProperty] * 8

  let hash: number[] = []
  const k: number[] = []
  let primeCounter = 0

  const isComposite: Record<number, boolean> = {}
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 300; i += candidate) {
        isComposite[i] = true
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0
    }
  }

  hash = hash.slice(0, 8)

  ascii += '\x80'
  while ((ascii[lengthProperty] % 64) - 56) ascii += '\x00'
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i)
    if (j >> 8) return '' // ASCII only
    words[i >> 2] |= j << (((3 - i) % 4) * 8)
  }
  words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0
  words[words[lengthProperty]] = asciiBitLength

  for (j = 0; j < words[lengthProperty]; ) {
    const w = words.slice(j, (j += 16))
    const oldHash = hash
    hash = hash.slice(0, 8)

    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15]
      const w2 = w[i - 2]

      const s0 = (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) >>> 0
      const s1 = (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10)) >>> 0

      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6])
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2])
      const temp1 = (hash[7] + (rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25)) + ch + k[i] + (w[i] = (i < 16) ? w[i] : (w[i - 16] + s0 + w[i - 7] + s1) | 0)) | 0
      const temp2 = ((rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22)) + maj) | 0

      hash = [(temp1 + temp2) | 0, hash[0], hash[1], hash[2], (hash[3] + temp1) | 0, hash[4], hash[5], hash[6]]
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0
    }
  }

  for (i = 0; i < 8; i++) {
    for (let b = 3; b >= 0; b--) {
      const byte = (hash[i] >> (b * 8)) & 255
      result += (byte < 16 ? '0' : '') + byte.toString(16)
    }
  }
  return result
}

function rightRotate(value: number, amount: number): number {
  return (value >>> amount) | (value << (32 - amount))
}

/**
 * Generate a 12-character cryptographic anti-tamper signature for a table number.
 */
export function generateTableSignature(table: number): string {
  const normalized = Math.floor(table)
  const payload = `fornello:table:${normalized}:${TABLE_SECRET_SALT}`
  const fullHash = sha256(payload)
  return fullHash.slice(0, 12)
}

/**
 * Verify whether a given table number matches the provided signature.
 */
export function verifyTableSignature(table: number | null | undefined, signature: string | null | undefined): boolean {
  if (typeof table !== 'number' || isNaN(table) || table < 1 || table > 25) {
    return false
  }
  if (!signature || typeof signature !== 'string') {
    return false
  }
  const cleanSig = signature.trim().toLowerCase()
  const expected = generateTableSignature(table).toLowerCase()
  return cleanSig === expected
}

/**
 * Build a verified table URL containing the anti-tampering signature.
 */
export function buildVerifiedTableUrl(origin: string, table: number, lang: 'en' | 'ckb' = 'en'): string {
  const pad = table < 10 ? `0${table}` : `${table}`
  const sig = generateTableSignature(table)
  const base = origin.replace(/\/+$/, '')
  return `${base}/?mode=dine-in&table=${pad}&sig=${sig}&lang=${lang}`
}
