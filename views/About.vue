<script setup lang="ts">
import TopBar from '../components/TopBar.vue'
import { wallet, setDemo } from '../lib/wallet'
import { demoLedger } from '../lib/demo'
function resetDemo() { demoLedger.reset(); location.reload() }
</script>

<template>
  <section class="page">
    <TopBar to="/" label="Home" title="How it works" />
    <h1>How Stub works</h1>
    <div class="card stack">
      <div class="step"><b>1</b><p><b>Host makes an event</b> — name, date, price in NIM or USDT, and their own payout address. The whole event is packed into one share link. No sign-up, no server.</p></div>
      <div class="step"><b>2</b><p><b>Guests pay in Nimiq Pay</b> — one tap, confirmed in Nimiq Pay's own dialog. NIM goes wallet-to-wallet with a public memo like <span class="mono">STUB:7QK3M2XA:2</span> so the payment is the ticket.</p></div>
      <div class="step"><b>3</b><p><b>Ticket = QR of the payment</b> — the guest's ticket is the transaction hash. It shows "Confirmed" once the blockchain has it.</p></div>
      <div class="step"><b>4</b><p><b>Check in at the door</b> — the host scans the QR. Stub checks the chain: paid to the host, right event, enough paid, confirmed. First scan wins, so screenshots can't get in twice.</p></div>
    </div>
    <div class="card stack small">
      <h3>Privacy & money</h3>
      <p>Stub never holds funds and has no backend. Events, tickets and check-ins are stored only on your phone. Payments and memos are public on the Nimiq blockchain (or Polygon for USDT). Chain lookups use public RPC servers (nimiqwatch.com, publicnode.com).</p>
      <p>USDT tickets are sent on Polygon and need a little POL for the network fee. Because Polygon transfers carry no memo, a USDT ticket is matched to an event by organizer address, amount and time.</p>
    </div>
    <div class="card stack small">
      <h3>Demo mode</h3>
      <p class="muted">Try every screen in a normal browser with fake payments. Nothing touches a real wallet.</p>
      <button class="btn ghost" @click="setDemo(!wallet.demo)">{{ wallet.demo ? 'Turn demo mode off' : 'Turn demo mode on' }}</button>
      <button v-if="wallet.demo" class="btn ghost small" @click="resetDemo">Clear demo payments</button>
    </div>
    <p class="muted small">Open source (MIT). Built on the Nimiq Pay Mini Apps Framework.</p>
  </section>
</template>

<style scoped>
.step { display: flex; gap: 12px; align-items: flex-start; }
.step > b { flex-shrink: 0; width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; background: var(--gold-2); font-weight: 800; }
</style>
