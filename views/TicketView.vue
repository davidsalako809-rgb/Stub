<script setup lang="ts">
import TopBar from '../components/TopBar.vue'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import TicketCard from '../components/TicketCard.vue'
import QrCode from '../components/QrCode.vue'
import { store, type SavedTicket } from '../lib/store'
import { encodeEvent, ticketCode } from '../lib/event'
import { judgeNimTx, judgeUsdtTransfers } from '../lib/verify'
import { nimRpc, polygonRpc, explorerTx } from '../lib/rpc'
import { shortAddress } from '../lib/address'
import { goFullscreen, hasFullscreen, wallet } from '../lib/wallet'

const props = defineProps<{ hash: string }>()
const t = ref<SavedTicket | undefined>(store.getTicket(props.hash))
const eventLink = computed(() => (t.value ? `/e/${encodeEvent(t.value.event)}` : '/'))
const state = ref<'checking' | 'pending' | 'ok' | 'bad'>(t.value?.confirmed ? 'ok' : 'checking')
const reason = ref('')
const big = ref(false)
let timer: any
let tries = 0

async function check() {
  if (!t.value) return
  try {
    const v = t.value.chain === 'nim'
      ? judgeNimTx(await nimRpc.tx(t.value.event.net, t.value.hash), t.value.event)
      : judgeUsdtTransfers(await polygonRpc.usdtTransfers(t.value.hash), t.value.event)
    if (v.ok) {
      state.value = 'ok'
      t.value = { ...t.value, confirmed: true, holder: v.from || t.value.holder }
      store.saveTicket(t.value)
      return
    }
    reason.value = v.reason
    state.value = v.pending ? 'pending' : 'bad'
    if (v.pending && tries++ < 40) timer = setTimeout(check, 4000)
  } catch (e: any) {
    reason.value = e.message
    state.value = 'pending'
    if (tries++ < 40) timer = setTimeout(check, 6000)
  }
}
onMounted(() => { if (state.value !== 'ok') check() })
onBeforeUnmount(() => { clearTimeout(timer); if (big.value) goFullscreen(false) })

async function toggleBig() {
  big.value = !big.value
  if (hasFullscreen()) await goFullscreen(big.value)
}
</script>

<template>
  <section class="page">
    <TopBar :to="t ? eventLink : '/'" :label="t ? 'Event' : 'My tickets'" :title="t?.event.name" />
    <div v-if="!t" class="card empty">
      <div class="art">🔍</div>
      <h3>Ticket not on this device</h3>
      <p class="muted small">Tickets are saved in the Nimiq Pay app on the phone that bought them.</p>
    </div>

    <template v-else>
      <div v-if="state === 'ok'" class="status ok">✓ Payment confirmed {{ wallet.demo ? '(demo — simulated)' : 'on-chain' }}</div>
      <div v-else-if="state === 'bad'" class="status bad">✕ {{ reason }}</div>
      <div v-else class="status wait"><span class="spinner dark" /> {{ state === 'pending' ? reason || 'Confirming your payment…' : 'Checking payment…' }}</div>

      <TicketCard :event="t.event" :qty="t.qty">
        <template #stub>
          <button class="qrbtn" aria-label="Show bigger QR" @click="toggleBig">
            <QrCode :value="ticketCode({ chain: t.chain, hash: t.hash, eventId: t.event.id })" :size="84" />
          </button>
        </template>
      </TicketCard>

      <button class="btn" @click="toggleBig">Show ticket at the door</button>
      <div class="grid2">
        <router-link :to="eventLink" class="btn ghost">Back to event page</router-link>
        <router-link :to="eventLink" class="btn ghost">Buy more tickets</router-link>
      </div>
      <router-link to="/" class="btn ghost small full">All my tickets</router-link>

      <div class="card stack small">
        <div class="row between"><span class="muted">Ticket holder</span><span class="mono">{{ t.holder ? shortAddress(t.holder) : 'Read from chain once confirmed' }}</span></div>
        <div class="row between"><span class="muted">Payment</span><a :href="explorerTx(t.chain, t.hash, t.event.net)" target="_blank" rel="noopener" class="mono">{{ t.hash.slice(0, 10) }}…{{ t.hash.slice(-6) }} ↗</a></div>
        <div class="row between"><span class="muted">Event page</span><router-link :to="eventLink">Open event ›</router-link></div>
      </div>
      <p class="muted small">Only the first scan at the door is admitted. Don't post your QR publicly.</p>
    </template>

    <div v-if="big && t" class="overlay" @click="toggleBig">
      <div class="bigcard" @click.stop>
        <h2>{{ t.event.name }}</h2>
        <p class="muted">Admit {{ t.qty }}</p>
        <QrCode :value="ticketCode({ chain: t.chain, hash: t.hash, eventId: t.event.id })" :size="280" />
        <p class="mono">{{ t.hash.slice(0, 8) }} · {{ t.event.id }}</p>
        <button class="btn ghost" @click="toggleBig">Close</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.status { padding: 12px 14px; border-radius: 14px; font-weight: 800; font-size: 14px; display: flex; align-items: center; gap: 10px; }
.status.ok { background: #dcf5ea; color: #0b7a4f; }
.status.bad { background: #fde1e5; color: #a3142b; }
.status.wait { background: #fff1cc; color: #6b4d00; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.grid2 .btn { font-size: 14px; padding: 0 10px; }
.full { width: 100%; }
.qrbtn { border: 0; background: none; padding: 0; cursor: pointer; }
.overlay { position: fixed; inset: 0; background: rgba(13,15,36,.82); display: grid; place-items: center; z-index: 40; padding: 18px; }
.bigcard { background: #fff; border-radius: 24px; padding: 24px; display: flex; flex-direction: column; align-items: center; gap: 10px; width: 100%; max-width: 360px; text-align: center; }
</style>
