<script setup lang="ts">
import TopBar from '../components/TopBar.vue'
import { ref } from 'vue'
import Scanner from '../components/Scanner.vue'
import { store } from '../lib/store'
import { parseTicketCode } from '../lib/event'
import { verifyTicket } from '../lib/verify'
import { shortAddress } from '../lib/address'
import { fmtWhen } from '../lib/format'

const props = defineProps<{ id: string }>()
const ev = store.getEvent(props.id)
const camError = ref('')
const manual = ref('')
const busy = ref(false)
type R = { kind: 'admit' | 'used' | 'reject' | 'wait'; title: string; detail: string; hash?: string }
const result = ref<R | null>(null)
const count = ref(store.checkins(props.id).reduce((n, c) => n + c.qty, 0))

function buzz(ok: boolean) { try { navigator.vibrate?.(ok ? 60 : [80, 60, 80]) } catch { /* no vibration */ } }

async function handle(raw: string) {
  if (!ev || busy.value) return
  const code = parseTicketCode(raw)
  if (!code) { result.value = { kind: 'reject', title: 'Not a Stub ticket', detail: 'This QR code is not a Stub ticket.' }; buzz(false); return }
  const prior = store.checkins(ev.id).find((c) => c.hash === code.hash)
  if (prior) {
    result.value = { kind: 'used', title: 'Already checked in', detail: `${prior.qty} admitted at ${fmtWhen(prior.at)}. Same ticket can't enter twice.`, hash: code.hash }
    buzz(false); return
  }
  busy.value = true
  try {
    const v = await verifyTicket(code, ev)
    if (v.ok) {
      store.addCheckin(ev.id, { hash: code.hash, qty: v.qty, from: v.from, at: Date.now() })
      count.value += v.qty
      result.value = { kind: 'admit', title: `Admit ${v.qty}`, detail: `Paid by ${shortAddress(v.from)}`, hash: code.hash }
      buzz(true)
    } else {
      result.value = { kind: v.pending ? 'wait' : 'reject', title: v.pending ? 'Not confirmed yet' : 'Do not admit', detail: v.reason }
      buzz(false)
    }
  } catch (e: any) {
    result.value = { kind: 'wait', title: 'Could not check', detail: e.message }
  } finally {
    busy.value = false
  }
}

function undo() {
  if (!ev || !result.value?.hash) return
  const c = store.checkins(ev.id).find((x) => x.hash === result.value!.hash)
  store.undoCheckin(ev.id, result.value.hash)
  if (c) count.value -= c.qty
  result.value = null
}
</script>

<template>
  <section class="page">
    <TopBar :to="`/host/${id}`" label="Event dashboard" :title="ev?.name" />
    <div v-if="!ev" class="card empty"><h3>Event not found on this device</h3></div>
    <template v-else>
      <div class="row between">
        <h1>Door</h1>
        <span class="pill ok">{{ count }}{{ ev.cap ? ` / ${ev.cap}` : '' }} in</span>
      </div>
      <Scanner v-if="!camError" @code="handle" @unavailable="camError = $event" />
      <div v-else class="card small"><b>Camera unavailable.</b> <span class="muted">{{ camError }} Paste the ticket code below instead.</span></div>

      <div class="card stack">
        <label class="field">Or enter ticket code<span class="hint">Starts with stub1:</span>
          <input v-model="manual" spellcheck="false" autocapitalize="off" placeholder="stub1:nim:…" />
        </label>
        <button class="btn" :disabled="!manual || busy" @click="handle(manual); manual = ''">Check ticket</button>
      </div>
      <p class="muted small">Each ticket is checked against the blockchain: right organizer, right event memo, enough paid, confirmed. Check-ins are saved on this phone, so use one phone per door.</p>
    </template>

    <div v-if="busy" class="verdict wait"><span class="spinner" /> Checking on-chain…</div>
    <div v-else-if="result" class="verdict" :class="result.kind" @click="result = null">
      <div class="icon">{{ { admit: '✓', used: '↺', reject: '✕', wait: '…' }[result.kind] }}</div>
      <h1>{{ result.title }}</h1>
      <p>{{ result.detail }}</p>
      <div class="row">
        <button class="btn" @click.stop="result = null">Next guest</button>
        <button v-if="result.kind === 'admit'" class="btn ghost light" @click.stop="undo">Undo</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.verdict { position: fixed; inset: 0; z-index: 45; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 32px; text-align: center; color: #fff; }
.verdict.admit { background: #0e9f62; }
.verdict.used { background: #c27c00; }
.verdict.reject { background: #c8283f; }
.verdict.wait { background: #2e3a8c; flex-direction: row; font-weight: 800; }
.verdict h1 { font-size: 40px; }
.verdict p { font-size: 17px; max-width: 320px; opacity: .92; }
.icon { width: 110px; height: 110px; border-radius: 50%; background: rgba(255,255,255,.2); display: grid; place-items: center; font-size: 60px; font-weight: 800; }
.verdict .btn { background: #fff; color: var(--ink); min-width: 150px; }
.verdict .btn.light { background: transparent; color: #fff; box-shadow: inset 0 0 0 2px rgba(255,255,255,.6); }
</style>
