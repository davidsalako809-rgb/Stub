// Nimiq user-friendly address helpers (IBAN-style checksum, base32 alphabet without I, O, W, Z).
const ALPHABET = '0123456789ABCDEFGHJKLMNPQRSTUVXY'

export function compactNimAddress(a: string): string {
  return a.replace(/[\s_-]/g, '').toUpperCase()
}

export function formatNimAddress(a: string): string {
  const c = compactNimAddress(a)
  return c.replace(/(.{4})/g, '$1 ').trim()
}

function ibanCheck(str: string): number {
  const num = str.split('').map((c) => parseInt(c, 36).toString()).join('')
  let rem = 0
  for (let i = 0; i < num.length; i += 6) rem = Number(String(rem) + num.substring(i, i + 6)) % 97
  return rem
}

export function isValidNimAddress(a: string): boolean {
  const c = compactNimAddress(a)
  if (!/^NQ[0-9]{2}/.test(c) || c.length !== 36) return false
  const body = c.slice(4)
  for (const ch of body) if (!ALPHABET.includes(ch)) return false
  const check = String(98 - ibanCheck(body + 'NQ00')).padStart(2, '0')
  return check === c.slice(2, 4)
}

export function sameNimAddress(a: string, b: string): boolean {
  return compactNimAddress(a) === compactNimAddress(b)
}

export function isValidEvmAddress(a: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(a.trim())
}

export function shortAddress(a: string): string {
  if (!a) return ''
  if (a.startsWith('0x')) return `${a.slice(0, 6)}…${a.slice(-4)}`
  const f = formatNimAddress(a)
  return `${f.slice(0, 9)} … ${f.slice(-4)}`
}
