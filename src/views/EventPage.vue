<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import TicketCard from '../components/TicketCard.vue'
import { decodeEvent, memoFor, priceUnits, type StubEvent } from '../lib/event'
import { fmtPrice, isPast, say } from '../lib/format'
import { shortAddress } from '../lib/address'
import { nimSales } from '../lib/verify'
import { store } from '../lib/store'
import { wallet, payNim, payUsdt, getEvmAccount, explainWalletError, nimBalance } from '../lib/wallet'

const props = defineProps<{ payload: string }>()
const router = useRouter()

let ev: StubEvent | null = null
const loadError = ref('')
try { ev = decodeEvent(props.payload) } catch (e: any) { loadError.value = e.message }

const qty = ref(1)
const sold = ref<number | null>(null)
const soldError = ref('')
const paying = ref(false)
const payError = ref('')
const mine = computed(() => !!ev && !!store.getEvent(ev.id))
const myTickets = computed(() => (ev ? store.tickets().filter((t) => t.event.id === ev!.id) : []))
const left = computed(() => (ev && ev.cap && sold.value !== null ? Math.max(0, ev.cap - sold.value) : null))
const maxQty = computed(() => Math.min(10, left.value ?? 10))
const ended = computed(() => !!ev && isPast(ev))
const soldOut = computed(() => left.value === 0)
const netMismatch = computed(() => !!ev && ev.cur === 'NIM' && !wallet.demo && wallet.status === 'ready' && ev.net !== wallet.network)

onMounted(async () => {
  if (!ev || ev.cur !== 'NIM') return
  try {
    const s = await nimSales(ev)
    sold.value = s.reduce((n, x) => n + x.qty, 0)
  } catch (e: any) { soldError.value = e.message }
})

function adopt() {
  if (!ev) return
  if (!confirm('Add this event to your Host tab on this phone? Do this only if the payout address is yours.')) return
  store.saveEvent(ev)
  router.push(`/host/${ev.id}`)
}

async function buy() {
  if (!ev) return
  payError.value = ''
  paying.value = true
  try {
    const total = priceUnits(ev) * BigInt(qty.value)
    let res: { hash: string; from: string }
    if (ev.cur === 'NIM') {
      const acc = wallet.nimAccounts[0]
      if (acc) {
        const bal = await nimBalance(acc)
        if (bal !== null && BigInt(bal) < total) throw new Error(`Not enough NIM. You need ${fmtPrice(ev, qty.value)}.`)
      }
      res = await payNim(ev.to, total, memoFor(ev.id, qty.value))
    } else {
      if (!wallet.evmAccount) { await getEvmAccount(); paying.value = false; say('Wallet connected. Tap Pay to buy.', 'ok'); return }
      res = await payUsdt(ev.to, total)
    }
    store.saveTicket({ hash: res.hash, chain: ev.cur === 'NIM' ? 'nim' : 'pol', qty: qty.value, holder: res.from, event: ev, bought: Date.now() })
    router.replace(`/t/${res.hash}`)
  } catch (e) {
    const { message, cancelled } = explainWalletError(e)
    if (cancelled) say(message)
    else payError.value = message
  } finally {
    paying.value = false
  }
}
</script>

<template>
  <section class="page">
    <div v-if="loadError" class="card empty">
      <div class="art">🧩</div>
      <h3>Can't open this event</h3>
      <p class="muted small">{{ loadError }}</p>
      <router-link to="/" class="btn ghost">Go to my tickets</router-link>
    </div>

    <template v-else-if="ev">
      <TicketCard :event="ev" :qty="qty" />

      <div class="row wrap">
        <span class="pill">{{ ev.cur === 'NIM' ? 'Pay in NIM' : 'Pay in USDT · Polygon' }}</span>
        <span v-if="ev.cap && left !== null" class="pill" :class="left < 10 ? 'warn' : 'ok'">{{ left }} of {{ ev.cap }} left</span>
        <span v-else-if="sold !== null" class="pill ok">{{ sold }} going</span>
        <span v-if="ended" class="pill bad">Ended</span>
        <span v-if="ev.net === 'testnet'" class="pill warn">Testnet event</span>
      </div>

      <div v-if="ev.about" class="card"><p>{{ ev.about }}</p></div>

      <div v-if="myTickets.length" class="card row between">
        <span>You have {{ myTickets.reduce((n, t) => n + t.qty, 0) }} ticket(s) for this.</span>
        <router-link :to="`/t/${myTickets[0].hash}`" class="btn small">View</router-link>
      </div>

      <div v-if="!ended && !soldOut" class="card stack">
        <div class="row between">
          <h3>How many?</h3>
          <div class="stepper">
            <button aria-label="Fewer" :disabled="qty <= 1" @click="qty--">−</button>
            <b>{{ qty }}</b>
            <button aria-label="More" :disabled="qty >= maxQty" @click="qty++">＋</button>
          </div>
        </div>
        <div class="row between total"><span class="muted">Total</span><b>{{ fmtPrice(ev, qty) }}</b></div>
        <p v-if="netMismatch" class="err">This event is on {{ ev.net }}, but your Nimiq Pay is on {{ wallet.network }}. Switch networks to buy.</p>
        <p v-if="payError" class="err">{{ payError }}</p>
        <button class="btn gold" :disabled="paying || wallet.status === 'connecting' || netMismatch || (wallet.status === 'unavailable' && !wallet.demo)" @click="buy">
          <span v-if="paying" class="spinner dark" />
          <template v-else-if="ev.cur === 'USDT' && !wallet.evmAccount">Connect wallet to pay</template>
          <template v-else>Pay {{ fmtPrice(ev, qty) }}</template>
        </button>
        <p class="muted small">Goes straight to {{ ev.host }} at <span class="mono">{{ shortAddress(ev.to) }}</span>. You'll confirm in Nimiq Pay.<span v-if="ev.cur === 'NIM'"> The memo <span class="mono">{{ memoFor(ev.id, qty) }}</span> links your payment to this event.</span></p>
      </div>
      <div v-else-if="soldOut" class="card empty"><h3>Sold out</h3><p class="muted small">All {{ ev.cap }} spots are taken.</p></div>

      <p v-if="soldError" class="muted small">Couldn't load ticket count: {{ soldError }}</p>
      <router-link v-if="mine" :to="`/host/${ev.id}`" class="btn ghost">Manage this event</router-link>
      <button v-else class="linkish" @click="adopt">I'm the organizer — add to my events</button>
    </template>
  </section>
</template>

<style scoped>
.wrap { flex-wrap: wrap; gap: 8px; }
.stepper { display: flex; align-items: center; gap: 12px; }
.stepper button { width: 44px; height: 44px; border-radius: 12px; border: 0; background: #ebe9e2; font: inherit; font-size: 22px; font-weight: 800; color: var(--ink); cursor: pointer; }
.stepper button[disabled] { opacity: .35; }
.stepper b { min-width: 24px; text-align: center; font-size: 20px; }
.total b { font-size: 20px; }
.linkish { background: none; border: 0; font: inherit; color: var(--ink-3); font-size: 13px; text-decoration: underline; min-height: 44px; cursor: pointer; }
</style>
