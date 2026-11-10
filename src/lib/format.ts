import { decimalsFor, fromUnits, priceUnits, type StubEvent } from './event'
import { reactive } from 'vue'

export function fmtDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}
export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}
export function fmtWhen(ms: number): string {
  return new Date(ms).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}
export function fmtPrice(e: StubEvent, qty = 1): string {
  return `${fromUnits(priceUnits(e) * BigInt(qty), decimalsFor(e.cur))} ${e.cur}`
}
export function fmtUnits(units: bigint, e: StubEvent): string {
  return `${fromUnits(units, decimalsFor(e.cur))} ${e.cur}`
}
export function isPast(e: StubEvent): boolean {
  return Date.parse(e.start) < Date.now() - 12 * 3600_000
}

// Tiny global toast
export const toast = reactive({ text: '', kind: 'info' as 'info' | 'error' | 'ok', t: 0 as any })
export function say(text: string, kind: 'info' | 'error' | 'ok' = 'info') {
  clearTimeout(toast.t)
  toast.text = text
  toast.kind = kind
  toast.t = setTimeout(() => (toast.text = ''), kind === 'error' ? 6000 : 3200)
}

export async function copy(text: string, label = 'Copied') {
  try {
    await navigator.clipboard.writeText(text)
    say(label, 'ok')
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    try { document.execCommand('copy'); say(label, 'ok') } catch { say('Copy failed. Long-press to copy instead.', 'error') }
    ta.remove()
  }
}

export async function shareOrCopy(url: string, title: string) {
  if (navigator.share) {
    try { await navigator.share({ title, url }); return } catch (e: any) { if (e?.name === 'AbortError') return }
  }
  await copy(url, 'Link copied')
}
