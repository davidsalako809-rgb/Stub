// An event lives entirely in its share link: no server, no database.
// The organizer's payout address and price are inside the link; payments go
// wallet-to-wallet, and each NIM payment carries a public memo that ties it to the event.
import { isValidEvmAddress, isValidNimAddress } from './address'

export type Currency = 'NIM' | 'USDT'
export type Network = 'mainnet' | 'testnet'

export interface StubEvent {
  v: 1
  id: string // 8 chars, base32
  name: string
  host: string // organizer display name
  start: string // ISO datetime
  venue: string
  about: string
  price: string // decimal string, in `cur`
  cur: Currency
  to: string // NIM address or EVM address (USDT on Polygon)
  cap: number // 0 = unlimited
  theme: number
  net: Network
  created: number // ms epoch
}

export const THEMES = [
  { name: 'Sunset', from: '#FF8A3D', to: '#E9467A', ink: '#fff' },
  { name: 'Nimiq Gold', from: '#F6C343', to: '#E9A213', ink: '#1F2348' },
  { name: 'Lagoon', from: '#21BCA5', to: '#1A6AD2', ink: '#fff' },
  { name: 'Midnight', from: '#2E3A8C', to: '#1F2348', ink: '#fff' },
  { name: 'Ankara', from: '#7C3AED', to: '#F59E0B', ink: '#fff' },
  { name: 'Mint', from: '#B8F2C9', to: '#5FD3A8', ink: '#123227' },
] as const

const ID_ALPHABET = '0123456789ABCDEFGHJKLMNPQRSTUVXY'

export function randomId(len = 8): string {
  const bytes = new Uint8Array(len)
  // getRandomValues works over plain-HTTP LAN dev URLs, unlike crypto.randomUUID().
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => ID_ALPHABET[b % 32]).join('')
}

function toB64Url(s: string): string {
  const bytes = new TextEncoder().encode(s)
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromB64Url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)
  const bin = atob(b64)
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
}

export function encodeEvent(e: StubEvent): string {
  return toB64Url(JSON.stringify(e))
}

export function decodeEvent(s: string): StubEvent {
  let e: StubEvent
  try {
    e = JSON.parse(fromB64Url(s))
  } catch {
    throw new Error('This event link is damaged or incomplete. Ask the organizer to share it again.')
  }
  const problem = validateEvent(e)
  if (problem) throw new Error(`This event link is not valid: ${problem}`)
  return e
}

export function validateEvent(e: Partial<StubEvent>): string | null {
  if (!e || e.v !== 1) return 'unknown version'
  if (!e.id || !/^[0-9A-Z]{8}$/.test(e.id)) return 'missing event id'
  if (!e.name || e.name.trim().length < 2) return 'add an event name'
  if (e.name.length > 80) return 'event name is too long (80 max)'
  if (!e.start || Number.isNaN(Date.parse(e.start))) return 'pick a date and time'
  if (!e.price || !/^\d+(\.\d{1,5})?$/.test(e.price) || Number(e.price) <= 0) return 'set a ticket price above 0'
  if (e.cur === 'USDT' && !/^\d+(\.\d{1,6})?$/.test(e.price)) return 'USDT has at most 6 decimals'
  if (e.cur !== 'NIM' && e.cur !== 'USDT') return 'unknown currency'
  if (e.cur === 'NIM' && !isValidNimAddress(e.to || '')) return 'payout address is not a valid NIM address'
  if (e.cur === 'USDT' && !isValidEvmAddress(e.to || '')) return 'payout address is not a valid Polygon address'
  if (typeof e.cap !== 'number' || e.cap < 0 || e.cap > 100000) return 'capacity must be 0 to 100000'
  return null
}

// On-chain memo (public, 64 bytes max): STUB:<eventId>:<qty>
export function memoFor(eventId: string, qty: number): string {
  return `STUB:${eventId}:${qty}`
}

export function parseMemo(memo: string): { id: string; qty: number } | null {
  const m = /^STUB:([0-9A-Z]{8}):(\d{1,3})$/.exec(memo.trim())
  if (!m) return null
  const qty = Number(m[2])
  if (qty < 1) return null
  return { id: m[1], qty }
}

// Ticket QR payload: stub1:<chain>:<txHash>:<eventId>
export type Chain = 'nim' | 'pol'
export interface TicketCode { chain: Chain; hash: string; eventId: string }

export function ticketCode(t: TicketCode): string {
  return `stub1:${t.chain}:${t.hash}:${t.eventId}`
}

export function parseTicketCode(raw: string): TicketCode | null {
  const s = raw.trim()
  const m = /^stub1:(nim|pol):((?:0x)?[0-9a-fA-F]{64}):([0-9A-Z]{8})$/.exec(s)
  if (!m) return null
  return { chain: m[1] as Chain, hash: m[2], eventId: m[3] }
}

// Price math in integer base units so 0.1 + 0.2 never bites.
export const NIM_DECIMALS = 5 // 1 NIM = 100,000 Luna
export const USDT_DECIMALS = 6

export function toUnits(amount: string, decimals: number): bigint {
  const [w, f = ''] = amount.trim().split('.')
  if (!/^\d+$/.test(w || '0') || !/^\d*$/.test(f) || f.length > decimals) throw new Error('Invalid amount')
  return BigInt(w || '0') * 10n ** BigInt(decimals) + BigInt((f + '0'.repeat(decimals)).slice(0, decimals) || '0')
}

export function fromUnits(units: bigint, decimals: number): string {
  const neg = units < 0n
  const u = neg ? -units : units
  const base = 10n ** BigInt(decimals)
  const w = u / base
  const f = (u % base).toString().padStart(decimals, '0').replace(/0+$/, '')
  return `${neg ? '-' : ''}${w.toLocaleString('en-US')}${f ? '.' + f : ''}`
}

export function decimalsFor(cur: Currency): number {
  return cur === 'NIM' ? NIM_DECIMALS : USDT_DECIMALS
}

export function priceUnits(e: StubEvent): bigint {
  return toUnits(e.price, decimalsFor(e.cur))
}

export function eventUrl(e: StubEvent, origin = location.origin + location.pathname): string {
  return `${origin}?e=${encodeEvent(e)}`
}

export function nimiqPayLink(url: string): string {
  // HTTPS deeplink documented at nimiq.dev/mini-apps#sharing-your-mini-app
  return `https://nimpay.app/miniapps/open/${url.replace(/^https?:\/\//, '')}`
}
