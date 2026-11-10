// Shareable event poster (1080×1350 PNG) drawn on a canvas. For WhatsApp status, IG, X.
import QRCode from 'qrcode'
import { THEMES, type StubEvent } from './event'
import { fmtDate, fmtPrice, fmtTime } from './format'

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w } else cur = test
  }
  if (cur) lines.push(cur)
  return lines
}

export async function makePoster(ev: StubEvent, link: string): Promise<Blob> {
  await document.fonts?.ready
  const W = 1080, H = 1350
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const ctx = c.getContext('2d')!
  const t = THEMES[ev.theme] ?? THEMES[0]
  const g = ctx.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, t.from); g.addColorStop(1, t.to)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  // dot texture
  ctx.fillStyle = 'rgba(255,255,255,0.12)'
  for (let x = 20; x < W; x += 36) for (let y = 20; y < 620; y += 36) { ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill() }

  const F = (w: number, s: number) => `${w} ${s}px Mulish, system-ui, sans-serif`
  ctx.fillStyle = t.ink
  ctx.font = F(800, 34)
  ctx.fillText((ev.host || '').toUpperCase(), 80, 130)
  ctx.font = F(800, 104)
  const lines = wrap(ctx, ev.name, W - 160).slice(0, 4)
  lines.forEach((l, i) => ctx.fillText(l, 80, 260 + i * 112))
  let y = 260 + lines.length * 112 + 20
  ctx.font = F(800, 44)
  ctx.fillText(`${fmtDate(ev.start)} · ${fmtTime(ev.start)}`, 80, y)
  y += 62
  ctx.font = F(600, 38)
  wrap(ctx, ev.venue || '', W - 160).slice(0, 2).forEach((l, i) => ctx.fillText(l, 80, y + i * 50))

  if (ev.about) {
    y += 130
    ctx.globalAlpha = 0.85
    ctx.font = F(400, 34)
    wrap(ctx, ev.about, W - 160).slice(0, 3).forEach((l, i) => ctx.fillText(l, 80, y + i * 48))
    ctx.globalAlpha = 1
  }

  // ticket stub card
  const cy = 880, ch = 390
  ctx.fillStyle = '#fff'
  ctx.beginPath(); (ctx as any).roundRect(60, cy, W - 120, ch, 40); ctx.fill()
  const qr = await QRCode.toDataURL(link, { margin: 0, width: 300, color: { dark: '#1F2348', light: '#ffffff' } })
  const img = new Image()
  await new Promise((r, j) => { img.onload = r; img.onerror = j; img.src = qr })
  ctx.drawImage(img, W - 120 - 45 - 300, cy + 45, 300, 300)
  ctx.fillStyle = '#8A8FB3'
  ctx.font = F(800, 26)
  ctx.fillText('TICKETS', 110, cy + 95)
  ctx.fillStyle = '#1F2348'
  ctx.font = F(800, 68)
  ctx.fillText(fmtPrice(ev), 110, cy + 170)
  ctx.font = F(600, 30)
  ctx.fillStyle = '#4A4F7A'
  ;['Scan to buy in', 'Nimiq Pay'].forEach((l, i) => ctx.fillText(l, 110, cy + 250 + i * 40))
  ctx.font = F(800, 30)
  ctx.fillStyle = '#E9B213'
  ctx.fillText('◆ stub', 110, cy + ch - 40)

  return await new Promise((r) => c.toBlob((b) => r(b!), 'image/png'))
}

export async function sharePoster(ev: StubEvent, link: string) {
  const blob = await makePoster(ev, link)
  const file = new File([blob], `${ev.name.replace(/[^\w]+/g, '-').toLowerCase()}-poster.png`, { type: 'image/png' })
  const nav = navigator as any
  if (nav.canShare?.({ files: [file] })) {
    try { await nav.share({ files: [file], title: ev.name }); return 'shared' } catch (e: any) { if (e?.name === 'AbortError') return 'cancelled' }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = file.name
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'downloaded'
}
