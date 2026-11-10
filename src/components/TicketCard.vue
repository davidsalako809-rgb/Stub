<script setup lang="ts">
import { computed } from 'vue'
import { THEMES, type StubEvent } from '../lib/event'
import { fmtDate, fmtPrice, fmtTime } from '../lib/format'

const props = defineProps<{ event: Partial<StubEvent>; qty?: number; compact?: boolean; status?: string; statusKind?: string }>()
const theme = computed(() => THEMES[props.event.theme ?? 0] ?? THEMES[0])
const valid = computed(() => !!props.event.start && !Number.isNaN(Date.parse(props.event.start!)))
const price = computed(() => {
  try { return fmtPrice(props.event as StubEvent, props.qty ?? 1) } catch { return `— ${props.event.cur ?? 'NIM'}` }
})
</script>

<template>
  <article class="ticket" :class="{ compact }" :style="{ '--from': theme.from, '--to': theme.to, '--tink': theme.ink }">
    <div class="face">
      <div class="glow" />
      <div class="row between top">
        <span class="host">{{ event.host || 'Your name' }}</span>
        <span v-if="status" class="pill" :class="statusKind">{{ status }}</span>
        <span v-else class="admit">ADMIT {{ qty ?? 1 }}</span>
      </div>
      <h2 class="name">{{ event.name || 'Your event name' }}</h2>
      <div class="meta">
        <div><small>Date</small><b>{{ valid ? fmtDate(event.start!) : 'Pick a date' }}</b></div>
        <div><small>Time</small><b>{{ valid ? fmtTime(event.start!) : '—' }}</b></div>
      </div>
      <div v-if="!compact" class="venue"><small>Where</small><b>{{ event.venue || 'Venue or online link' }}</b></div>
    </div>
    <div class="perf" aria-hidden="true" />
    <div class="stub">
      <div><small>{{ (qty ?? 1) > 1 ? `${qty} tickets` : 'Ticket' }}</small><b>{{ price }}</b></div>
      <slot name="stub"><span class="paid-with">Paid with Nimiq Pay</span></slot>
    </div>
    <slot />
  </article>
</template>

<style scoped>
.ticket { border-radius: 22px; overflow: hidden; background: #fff; box-shadow: 0 2px 4px rgba(31,35,72,.06), 0 18px 40px -12px rgba(31,35,72,.35); position: relative; }
.face { position: relative; padding: 18px 18px 20px; color: var(--tink); background: linear-gradient(140deg, var(--from), var(--to)); overflow: hidden; display: flex; flex-direction: column; gap: 14px; }
.glow { position: absolute; width: 220px; height: 220px; right: -60px; top: -80px; border-radius: 50%; background: radial-gradient(circle, rgba(255,255,255,.35), transparent 70%); }
.face::after { content: ''; position: absolute; inset: 0; background-image: radial-gradient(rgba(255,255,255,.14) 1px, transparent 1px); background-size: 14px 14px; mask-image: linear-gradient(90deg, transparent 40%, #000); pointer-events: none; }
.top { position: relative; z-index: 1; }
.host { font-weight: 800; font-size: 13px; opacity: .9; text-transform: uppercase; letter-spacing: .08em; }
.admit { font-weight: 800; font-size: 11px; letter-spacing: .14em; border: 1.5px solid currentColor; border-radius: 6px; padding: 3px 7px; opacity: .9; }
.name { position: relative; z-index: 1; font-size: 28px; line-height: 1.05; word-break: break-word; }
.compact .name { font-size: 22px; }
.meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; position: relative; z-index: 1; }
small { display: block; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .1em; opacity: .7; margin-bottom: 2px; }
b { font-weight: 800; font-size: 15px; }
.venue { position: relative; z-index: 1; }
.perf { height: 0; border-top: 2px dashed #e3e1da; margin: 0 16px; position: relative; }
.perf::before, .perf::after { content: ''; position: absolute; top: -12px; width: 24px; height: 24px; border-radius: 50%; background: var(--bg); }
.perf::before { left: -28px; } .perf::after { right: -28px; }
.stub { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 18px 16px; color: var(--ink); }
.stub small { opacity: .55; }
.stub b { font-size: 18px; }
.paid-with { font-size: 11px; font-weight: 800; color: var(--ink-3); text-transform: uppercase; letter-spacing: .06em; }
</style>
