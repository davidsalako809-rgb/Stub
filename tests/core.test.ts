import { describe, expect, it } from 'vitest'
import { isValidNimAddress, formatNimAddress } from '../src/lib/address'
import { decodeEvent, encodeEvent, fromUnits, memoFor, parseMemo, parseTicketCode, ticketCode, toUnits, validateEvent, type StubEvent } from '../src/lib/event'
import { judgeNimTx, judgeUsdtTransfers } from '../src/lib/verify'
import { hexToUtf8 } from '../src/lib/rpc'

const ORG = 'NQ08 7355 7VMX MMAP 1XYE 9EGN AQK9 USMP R6TH'
const ev: StubEvent = {
  v: 1, id: '7QK3M2XA', name: 'Design Jam Lagos', host: 'Tolu', start: '2026-12-05T17:00:00.000Z', venue: 'Yaba, Lagos',
  about: 'Bring a laptop 🎨', price: '250.5', cur: 'NIM', to: ORG, cap: 40, theme: 2, net: 'mainnet', created: 1_790_000_000_000,
}
const hex = (s: string) => Buffer.from(s, 'utf8').toString('hex')
const tx = (o: Partial<any> = {}) => ({
  hash: 'a'.repeat(64), blockNumber: 1, timestamp: 1_790_000_100_000, confirmations: 3, from: 'NQ43 Y1RH P1K7 JH78 LRTS 95RY GAUU UBDK FFGX',
  to: ORG, value: 25_050_000 * 2, fee: 0, recipientData: hex(memoFor(ev.id, 2)), executionResult: true, ...o,
})

describe('addresses', () => {
  it('accepts real addresses and rejects typos', () => {
    expect(isValidNimAddress(ORG)).toBe(true)
    expect(isValidNimAddress(ORG.replace(/R6TH$/, 'R6TJ'))).toBe(false)
    expect(isValidNimAddress('NQ00 hello')).toBe(false)
    expect(formatNimAddress(ORG.replace(/ /g, '').toLowerCase())).toBe(ORG)
  })
})

describe('event links', () => {
  it('round-trips unicode through the share link', () => {
    const back = decodeEvent(encodeEvent(ev))
    expect(back).toEqual(ev)
  })
  it('rejects damaged links with a readable message', () => {
    expect(() => decodeEvent('not-a-link')).toThrow(/damaged|not valid/)
  })
  it('validates fields', () => {
    expect(validateEvent(ev)).toBeNull()
    expect(validateEvent({ ...ev, price: '0' })).toMatch(/price/)
    expect(validateEvent({ ...ev, to: '0x123' })).toMatch(/NIM address/)
    expect(validateEvent({ ...ev, cur: 'USDT', to: '0x' + '1'.repeat(40), price: '5.25' })).toBeNull()
  })
})

describe('amounts', () => {
  it('converts without float errors', () => {
    expect(toUnits('250.5', 5)).toBe(25_050_000n)
    expect(toUnits('0.1', 6) + toUnits('0.2', 6)).toBe(toUnits('0.3', 6))
    expect(fromUnits(123_456_700_000n, 5)).toBe('1,234,567')
    expect(fromUnits(1_500_000n, 6)).toBe('1.5')
    expect(() => toUnits('1.123456', 5)).toThrow()
  })
})

describe('memo and ticket codes', () => {
  it('fits in 64 bytes and parses back', () => {
    const m = memoFor(ev.id, 12)
    expect(new TextEncoder().encode(m).length).toBeLessThanOrEqual(64)
    expect(parseMemo(m)).toEqual({ id: ev.id, qty: 12 })
    expect(parseMemo('hello')).toBeNull()
    expect(hexToUtf8(hex(m))).toBe(m)
  })
  it('round-trips ticket codes', () => {
    const c = { chain: 'nim' as const, hash: 'b'.repeat(64), eventId: ev.id }
    expect(parseTicketCode(ticketCode(c))).toEqual(c)
    expect(parseTicketCode('stub1:pol:0x' + 'c'.repeat(64) + ':' + ev.id)?.chain).toBe('pol')
    expect(parseTicketCode('https://evil.example')).toBeNull()
  })
})

describe('door check (NIM)', () => {
  it('admits a correct payment for 2', () => {
    const v = judgeNimTx(tx(), ev)
    expect(v.ok && v.qty).toBe(2)
  })
  it('rejects wrong recipient, wrong event, underpaid, failed, pending, missing', () => {
    expect(judgeNimTx(tx({ to: 'NQ43 Y1RH P1K7 JH78 LRTS 95RY GAUU UBDK FFGX' }), ev).ok).toBe(false)
    expect(judgeNimTx(tx({ recipientData: hex(memoFor('AAAAAAAA', 2)) }), ev).ok).toBe(false)
    expect(judgeNimTx(tx({ value: 25_050_000 }), ev).ok).toBe(false)
    expect(judgeNimTx(tx({ executionResult: false }), ev).ok).toBe(false)
    const p = judgeNimTx(tx({ confirmations: 0 }), ev)
    expect(!p.ok && p.pending).toBe(true)
    const m = judgeNimTx(null, ev)
    expect(!m.ok && m.pending).toBe(true)
  })
})

describe('door check (USDT)', () => {
  const uev: StubEvent = { ...ev, cur: 'USDT', price: '5', to: '0x00000000000000000000000000000000000000aa' }
  const t = (o: any = {}) => [{ hash: '0x' + 'd'.repeat(64), from: '0x' + '1'.repeat(40), to: uev.to, amount: 15_000_000n, blockNumber: 1, timestamp: ev.created + 1000, success: true, ...o }]
  it('derives quantity from amount', () => {
    const v = judgeUsdtTransfers(t(), uev)
    expect(v.ok && v.qty).toBe(3)
  })
  it('rejects early, underpaid and wrong recipient', () => {
    expect(judgeUsdtTransfers(t({ timestamp: ev.created - 3_600_000 }), uev).ok).toBe(false)
    expect(judgeUsdtTransfers(t({ amount: 4_000_000n }), uev).ok).toBe(false)
    expect(judgeUsdtTransfers(t({ to: '0x' + '2'.repeat(40) }), uev).ok).toBe(false)
  })
})
