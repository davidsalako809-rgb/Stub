// Door check: is this ticket a real, confirmed payment to this event's organizer?
// Pure functions (unit-tested) + thin fetchers.
import { compactNimAddress, sameNimAddress } from './address'
import { parseMemo, priceUnits, type StubEvent, type TicketCode } from './event'
import { hexToUtf8, nimRpc, polygonRpc, type NimTx, type PolyTransfer } from './rpc'

export type Verdict =
  | { ok: true; qty: number; from: string; paid: bigint; at: number }
  | { ok: false; pending?: boolean; reason: string }

export function judgeNimTx(tx: NimTx | null, ev: StubEvent): Verdict {
  if (!tx) return { ok: false, pending: true, reason: 'Payment not found on the network yet. If it was just sent, wait a few seconds and scan again.' }
  if (!sameNimAddress(tx.to, ev.to)) return { ok: false, reason: 'This payment went to a different address, not to this event.' }
  if (!tx.executionResult) return { ok: false, reason: 'This payment failed on-chain.' }
  const memo = parseMemo(hexToUtf8(tx.recipientData))
  if (!memo || memo.id !== ev.id) return { ok: false, reason: 'This payment is not for this event (memo does not match).' }
  if (tx.confirmations < 1) return { ok: false, pending: true, reason: 'Payment is still confirming. Try again in a few seconds.' }
  const need = priceUnits(ev) * BigInt(memo.qty)
  if (BigInt(tx.value) < need) return { ok: false, reason: `Underpaid: ticket needs ${need} Luna, payment was ${tx.value}.` }
  return { ok: true, qty: memo.qty, from: compactNimAddress(tx.from), paid: BigInt(tx.value), at: tx.timestamp }
}

export function judgeUsdtTransfers(list: PolyTransfer[] | null, ev: StubEvent): Verdict {
  if (!list) return { ok: false, pending: true, reason: 'Payment not found on Polygon yet. Wait a few seconds and scan again.' }
  const t = list.find((x) => x.to.toLowerCase() === ev.to.toLowerCase())
  if (!t) return { ok: false, reason: 'No USDT in this transaction went to this event\'s organizer.' }
  if (!t.success) return { ok: false, reason: 'This payment failed on Polygon.' }
  // USDT on Polygon has no memo, so tie it to the event by time: paid after the event was created.
  if (t.timestamp && t.timestamp < ev.created - 10 * 60_000) return { ok: false, reason: 'This payment was made before the event existed.' }
  const price = priceUnits(ev)
  const qty = Number(t.amount / price)
  if (qty < 1) return { ok: false, reason: 'Underpaid: less than one ticket\'s price.' }
  return { ok: true, qty: Math.min(qty, 50), from: t.from, paid: t.amount, at: t.timestamp }
}

export async function verifyTicket(code: TicketCode, ev: StubEvent): Promise<Verdict> {
  if (code.eventId !== ev.id) return { ok: false, reason: 'This ticket is for a different event.' }
  if (code.chain === 'nim') {
    if (ev.cur !== 'NIM') return { ok: false, reason: 'This event is priced in USDT, but the ticket was paid in NIM.' }
    return judgeNimTx(await nimRpc.tx(ev.net, code.hash), ev)
  }
  if (ev.cur !== 'USDT') return { ok: false, reason: 'This event is priced in NIM, but the ticket was paid in USDT.' }
  return judgeUsdtTransfers(await polygonRpc.usdtTransfers(code.hash), ev)
}

export interface Sale { hash: string; from: string; qty: number; paid: bigint; at: number; ok: boolean }

/** All NIM ticket sales for an event, read straight from the organizer's on-chain history. */
export async function nimSales(ev: StubEvent): Promise<Sale[]> {
  const txs = await nimRpc.txsByAddress(ev.net, ev.to, 500)
  const out: Sale[] = []
  for (const tx of txs) {
    const v = judgeNimTx(tx, ev)
    if (v.ok) out.push({ hash: tx.hash, from: v.from, qty: v.qty, paid: v.paid, at: v.at, ok: true })
  }
  return out.sort((a, b) => b.at - a.at)
}
