<script setup lang="ts">
import TopBar from '../components/TopBar.vue'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import TicketCard from '../components/TicketCard.vue'
import { store } from '../lib/store'
import { eventUrl, nimiqPayLink, priceUnits } from '../lib/event'
import { copy, fmtUnits, fmtWhen, say, shareOrCopy } from '../lib/format'
import { nimSales, type Sale } from '../lib/verify'
import { shortAddress } from '../lib/address'
import { explorerTx } from '../lib/rpc'
import { sharePoster } from '../lib/poster'

const props = defineProps<{ id: string }>()
const router = useRouter()
const ev = store.getEvent(props.id)
const sales = ref<Sale[]>([])
const loading = ref(false)
const error = ref('')
const checkins = ref(store.checkins(props.id))
const posterBusy = ref(false)

const link = computed(() => (ev ? eventUrl(ev) : ''))
const payLink = computed(() => nimiqPayLink(link.value))
const soldQty = computed(() => sales.value.reduce((n, s) => n + s.qty, 0))
const revenue = computed(() => sales.value.reduce((n, s) => n + s.paid, 0n))
const inQty = computed(() => checkins.value.reduce((n, c) => n + c.qty, 0))
const checkedSet = computed(() => new Set(checkins.value.map((c) => c.hash)))

async function load() {
  if (!ev || ev.cur !== 'NIM') return
  loading.value = true; error.value = ''
  try { sales.value = await nimSales(ev) } catch (e: any) { error.value = e.message } finally { loading.value = false }
}
onMounted(load)

async function poster() {
  if (!ev) return
  posterBusy.value = true
  try {
    const r = await sharePoster(ev, payLink.value)
    if (r === 'downloaded') say('Poster saved', 'ok')
  } catch (e: any) { say(`Couldn't make the poster: ${e.message}`, 'error') } finally { posterBusy.value = false }
}

function exportCsv() {
  if (!ev) return
  const rows = [['tx_hash', 'buyer', 'tickets', `paid_${ev.cur}`, 'paid_at', 'checked_in']]
  const seen = new Set<string>()
  for (const s of sales.value) { seen.add(s.hash); rows.push([s.hash, s.from, String(s.qty), fmtUnits(s.paid, ev).split(' ')[0].replace(/,/g, ''), new Date(s.at).toISOString(), checkedSet.value.has(s.hash) ? 'yes' : 'no']) }
  for (const c of checkins.value) if (!seen.has(c.hash)) rows.push([c.hash, c.from, String(c.qty), '', '', 'yes'])
  const csv = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = `stub-${ev.id}-guests.csv`
  document.body.appendChild(a); a.click(); a.remove()
}

function remove() {
  if (!ev) return
  if (!confirm('Remove this event from this device? Tickets already sold stay valid on-chain, and you can re-add it by opening its link.')) return
  store.removeEvent(ev.id)
  router.replace('/host')
}
</script>

<template>
  <section class="page">
    <TopBar to="/host" label="All events" :title="ev?.name" />
    <div v-if="!ev" class="card empty">
      <div class="art">🗂️</div>
      <h3>Event not found on this device</h3>
      <p class="muted small">Events are saved on the phone that created them. Open the event link here, then tap “I’m the organizer — add to my events”.</p>
    </div>
    <template v-else>
      <TicketCard :event="ev" compact />

      <div class="card stack">
        <h3>Share to sell</h3>
        <p class="muted small">Anyone who opens this link in Nimiq Pay can buy a ticket.</p>
        <div class="linkbox mono">{{ payLink }}</div>
        <div class="grid2">
          <button class="btn" @click="shareOrCopy(payLink, ev.name)">Share link</button>
          <button class="btn ghost" :disabled="posterBusy" @click="poster"><span v-if="posterBusy" class="spinner dark" />Poster</button>
        </div>
        <button class="btn ghost small full" @click="copy(link, 'Web link copied')">Copy plain web link</button>
      </div>

      <div class="row stats">
        <div class="stat"><b>{{ ev.cur === 'NIM' ? soldQty : '—' }}</b><span>Sold{{ ev.cap ? ` / ${ev.cap}` : '' }}</span></div>
        <div class="stat"><b>{{ ev.cur === 'NIM' ? fmtUnits(revenue, ev).split(' ')[0] : '—' }}</b><span>{{ ev.cur }} in</span></div>
        <div class="stat"><b>{{ inQty }}</b><span>Checked in</span></div>
      </div>

      <router-link :to="`/host/${ev.id}/door`" class="btn gold">📷 Check guests in</router-link>

      <div class="card">
        <div class="row between"><h3>Guests</h3><button class="btn small ghost" :disabled="loading" @click="load"><span v-if="loading" class="spinner dark" />Refresh</button></div>
        <p v-if="ev.cur === 'USDT'" class="muted small">USDT on Polygon has no payment memo, so guests appear here as you scan them at the door. Each ticket is verified on Polygon when scanned.</p>
        <p v-if="error" class="err">{{ error }}</p>
        <p v-if="ev.cur === 'NIM' && !loading && !sales.length && !error" class="muted small">No sales yet. Share your link!</p>
        <div v-for="s in sales" :key="s.hash" class="list-item">
          <span class="pill" :class="checkedSet.has(s.hash) ? 'ok' : ''">{{ checkedSet.has(s.hash) ? 'In' : '×' + s.qty }}</span>
          <div class="grow"><div class="mono">{{ shortAddress(s.from) }}</div><div class="muted small">{{ fmtWhen(s.at) }} · {{ s.qty }} ticket{{ s.qty > 1 ? 's' : '' }}</div></div>
          <a :href="explorerTx('nim', s.hash, ev.net)" target="_blank" rel="noopener" class="small">{{ fmtUnits(s.paid, ev) }}</a>
        </div>
        <template v-if="ev.cur === 'USDT'">
          <div v-for="c in checkins" :key="c.hash" class="list-item">
            <span class="pill ok">In</span>
            <div class="grow"><div class="mono">{{ shortAddress(c.from) }}</div><div class="muted small">{{ fmtWhen(c.at) }} · {{ c.qty }} ticket{{ c.qty > 1 ? 's' : '' }}</div></div>
            <a :href="explorerTx('pol', c.hash)" target="_blank" rel="noopener" class="small">{{ fmtUnits(priceUnits(ev) * BigInt(c.qty), ev) }}</a>
          </div>
        </template>
        <button v-if="sales.length || checkins.length" class="btn ghost small full" @click="exportCsv">Export guest list (CSV)</button>
      </div>

      <button class="btn danger" @click="remove">Remove from this device</button>
    </template>
  </section>
</template>

<style scoped>
.linkbox { background: #f4f3ef; border-radius: 12px; padding: 12px; max-height: 64px; overflow: hidden; color: var(--ink-2); }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.full { width: 100%; }
.stats { gap: 10px; }
.grow { flex: 1; min-width: 0; }
</style>
