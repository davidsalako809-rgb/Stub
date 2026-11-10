<script setup lang="ts">
import TopBar from '../components/TopBar.vue'
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import TicketCard from '../components/TicketCard.vue'
import { THEMES, randomId, validateEvent, type StubEvent, type Currency } from '../lib/event'
import { formatNimAddress, isValidEvmAddress, isValidNimAddress } from '../lib/address'
import { wallet, getNimAccounts, getEvmAccount, explainWalletError } from '../lib/wallet'
import { store } from '../lib/store'
import { say } from '../lib/format'

const router = useRouter()
const tomorrow = new Date(Date.now() + 7 * 86400_000)
tomorrow.setHours(18, 0, 0, 0)
const pad = (n: number) => String(n).padStart(2, '0')
const localValue = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`

const f = reactive({
  name: '', host: '', start: localValue(tomorrow), venue: '', about: '',
  price: '', cur: 'NIM' as Currency, to: '', cap: 0, theme: 0,
})
const loadingAddr = ref(false)
const tried = ref(false)

const preview = computed<Partial<StubEvent>>(() => ({ ...f, start: f.start ? new Date(f.start).toISOString() : '', price: f.price || '0' }))

const addrOk = computed(() => (f.cur === 'NIM' ? isValidNimAddress(f.to) : isValidEvmAddress(f.to)))

async function useMyAddress() {
  loadingAddr.value = true
  try {
    if (f.cur === 'NIM') {
      const accounts = await getNimAccounts()
      if (!accounts.length) throw new Error('Nimiq Pay did not share an address.')
      f.to = formatNimAddress(accounts[0])
    } else {
      f.to = await getEvmAccount()
    }
  } catch (e) {
    const { message, cancelled } = explainWalletError(e)
    say(message, cancelled ? 'info' : 'error')
  } finally {
    loadingAddr.value = false
  }
}

const draft = computed<StubEvent>(() => ({
  v: 1, id: 'XXXXXXXX', name: f.name.trim(), host: f.host.trim() || 'Organizer', start: f.start ? new Date(f.start).toISOString() : '',
  venue: f.venue.trim(), about: f.about.trim().slice(0, 400), price: f.price.trim(), cur: f.cur,
  to: f.cur === 'NIM' ? formatNimAddress(f.to) : f.to.trim(), cap: Math.max(0, Math.floor(Number(f.cap) || 0)),
  theme: f.theme, net: wallet.network, created: Date.now(),
}))
const problem = computed(() => validateEvent({ ...draft.value, id: 'AAAAAAAA' }))

function create() {
  tried.value = true
  if (problem.value) { say(`Almost there — ${problem.value}.`, 'error'); return }
  const ev: StubEvent = { ...draft.value, id: randomId(8), created: Date.now() }
  store.saveEvent(ev)
  say('Event created. Share the link to start selling.', 'ok')
  router.replace(`/host/${ev.id}`)
}
</script>

<template>
  <section class="page">
    <TopBar to="/host" label="Host" title="New event" />
    <h1>New event</h1>

    <TicketCard :event="preview" />

    <div class="card stack">
      <h3>Look</h3>
      <div class="themes">
        <button v-for="(t, i) in THEMES" :key="t.name" :aria-label="t.name" :class="{ on: f.theme === i }"
          :style="{ background: `linear-gradient(135deg, ${t.from}, ${t.to})` }" @click="f.theme = i" />
      </div>
    </div>

    <div class="card stack">
      <h3>Details</h3>
      <label class="field">Event name<input v-model="f.name" maxlength="80" placeholder="Design Jam Lagos" /></label>
      <label class="field">Hosted by<input v-model="f.host" maxlength="40" placeholder="Your name or brand" /></label>
      <label class="field">Date and time<input v-model="f.start" type="datetime-local" /></label>
      <label class="field">Where<input v-model="f.venue" maxlength="120" placeholder="Venue address, or an online link" /></label>
      <label class="field">About <span class="hint">Optional. Up to 400 characters.</span>
        <textarea v-model="f.about" maxlength="400" placeholder="What to expect, what to bring…" /></label>
    </div>

    <div class="card stack">
      <h3>Tickets</h3>
      <div class="seg" role="tablist">
        <button :class="{ on: f.cur === 'NIM' }" @click="f.cur = 'NIM'; f.to = ''">NIM</button>
        <button :class="{ on: f.cur === 'USDT' }" @click="f.cur = 'USDT'; f.to = ''">USDT · Polygon</button>
      </div>
      <p v-if="f.cur === 'USDT'" class="muted small">USDT buyers need a little POL in Nimiq Pay for the Polygon network fee. NIM tickets have no such step.</p>
      <div class="row">
        <label class="field grow">Price per ticket<input v-model="f.price" inputmode="decimal" placeholder="e.g. 500" /></label>
        <label class="field cap">Spots<input v-model.number="f.cap" type="number" min="0" inputmode="numeric" /></label>
      </div>
      <p class="muted small">Spots: 0 means no limit.</p>
      <label class="field">Pay me at
        <span class="hint">{{ f.cur === 'NIM' ? 'Your NIM address. Ticket money goes straight here.' : 'Your Polygon (EVM) address for USDT.' }}</span>
        <input v-model="f.to" :placeholder="f.cur === 'NIM' ? 'NQ.. .... ....' : '0x…'" autocapitalize="characters" spellcheck="false" />
      </label>
      <p v-if="f.to && !addrOk" class="err">That doesn't look like a valid {{ f.cur === 'NIM' ? 'NIM' : 'Polygon' }} address.</p>
      <button class="btn ghost" :disabled="loadingAddr" @click="useMyAddress">
        <span v-if="loadingAddr" class="spinner dark" /> Use my Nimiq Pay address
      </button>
    </div>

    <p v-if="tried && problem" class="err">Almost there — {{ problem }}.</p>
    <button class="btn gold" @click="create">Create event</button>
    <p class="muted small center">Your event lives in its share link. Stub has no server and never holds your money.</p>
  </section>
</template>

<style scoped>
.themes { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; }
.themes button { aspect-ratio: 1; border-radius: 12px; border: 3px solid transparent; cursor: pointer; min-height: 44px; }
.themes button.on { border-color: var(--ink); box-shadow: 0 0 0 2px #fff inset; }
.grow { flex: 1; }
.cap { width: 110px; }
.center { text-align: center; }
</style>
