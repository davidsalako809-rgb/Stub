// Demo mode: lets anyone explore Stub in a normal browser, outside Nimiq Pay.
// Nothing here touches a real wallet or chain. Every "payment" is fake and clearly labeled.
import type { NimTx, PolyTransfer } from './rpc'

const KEY = 'stub:demo-ledger'
export const DEMO_NIM_ADDRESS = 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000'
export const DEMO_EVM_ADDRESS = '0x000000000000000000000000000000000000dEaD'

interface Ledger { nim: NimTx[]; pol: PolyTransfer[] }

function load(): Ledger {
  try {
    const l = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (l) return { nim: l.nim, pol: (l.pol || []).map((p: any) => ({ ...p, amount: BigInt(p.amount) })) }
  } catch { /* ignore */ }
  return { nim: [], pol: [] }
}
function save(l: Ledger) {
  localStorage.setItem(KEY, JSON.stringify({ nim: l.nim, pol: l.pol.map((p) => ({ ...p, amount: p.amount.toString() })) }))
}

function fakeHash(): string {
  const b = new Uint8Array(32)
  crypto.getRandomValues(b)
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
}

function utf8ToHex(s: string): string {
  return Array.from(new TextEncoder().encode(s), (b) => b.toString(16).padStart(2, '0')).join('')
}

export const demoLedger = {
  sendNim(from: string, to: string, value: number, data: string): string {
    const l = load()
    const hash = fakeHash()
    l.nim.unshift({
      hash, blockNumber: 1, timestamp: Date.now(), confirmations: 0, from, to, value, fee: 0,
      recipientData: utf8ToHex(data), executionResult: true,
    })
    save(l)
    return hash
  },
  sendUsdt(from: string, to: string, amount: bigint): string {
    const l = load()
    const hash = '0x' + fakeHash()
    l.pol.unshift({ hash, from, to, amount, blockNumber: 1, timestamp: Date.now(), success: true })
    save(l)
    return hash
  },
  get(hash: string): NimTx | null {
    const t = load().nim.find((x) => x.hash === hash)
    if (!t) return null
    // Pretend the block lands ~3 seconds after sending.
    return { ...t, confirmations: Date.now() - t.timestamp > 3000 ? 1 : 0 }
  },
  getPoly(hash: string): PolyTransfer | null {
    const t = load().pol.find((x) => x.hash === hash)
    if (!t || Date.now() - t.timestamp < 3000) return null
    return t
  },
  byAddress(address: string): NimTx[] {
    const c = (s: string) => s.replace(/\s/g, '').toUpperCase()
    return load().nim.filter((t) => c(t.to) === c(address) || c(t.from) === c(address)).map((t) => demoLedger.get(t.hash)!)
  },
  reset() { localStorage.removeItem(KEY) },
}
