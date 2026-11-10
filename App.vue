<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { wallet, connectProvider, setDemo } from './lib/wallet'
import { toast } from './lib/format'

const route = useRoute()
onMounted(connectProvider)
</script>

<template>
  <header class="top">
    <router-link to="/" class="brand" aria-label="Stub home">
      <span class="logo">◆</span><span>stub</span>
    </router-link>
    <span v-if="wallet.network === 'testnet'" class="pill warn">Testnet</span>
    <router-link to="/about" class="pill">How it works</router-link>
  </header>

  <div v-if="wallet.demo" class="banner demo">
    <span>🧪</span>
    <span><b>Demo mode.</b> Payments are simulated on this device — no real NIM or USDT moves.</span>
    <button class="btn small ghost" @click="setDemo(false)">Exit</button>
  </div>
  <div v-else-if="wallet.status === 'unavailable'" class="banner">
    <span>📱</span>
    <span>Open Stub inside <b>Nimiq Pay</b> to buy and sell tickets with your wallet. You can still look around, or try a safe demo.</span>
    <button class="btn small ghost" @click="setDemo(true)">Try demo</button>
  </div>

  <main>
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in"><component :is="Component" :key="route.fullPath" /></transition>
    </router-view>
  </main>

  <nav class="tabs">
    <router-link to="/" :class="{ on: route.path === '/' || route.path.startsWith('/t/') || route.path.startsWith('/e/') }"><span>🎟️</span>My tickets</router-link>
    <router-link to="/host" :class="{ on: route.path.startsWith('/host') }"><span>🎤</span>Host events</router-link>
    <router-link to="/about" :class="{ on: route.path === '/about' }"><span>💡</span>Guide</router-link>
  </nav>

  <transition name="toast">
    <div v-if="toast.text" class="toast" :class="toast.kind" role="status">{{ toast.text }}</div>
  </transition>
</template>

<style scoped>
.top { display: flex; align-items: center; gap: 10px; padding: 14px 18px 10px; }
.brand { display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 22px; color: var(--ink); text-decoration: none; letter-spacing: -0.03em; margin-right: auto; }
.logo { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 10px; background: linear-gradient(135deg, var(--gold-2), var(--gold)); color: var(--ink); font-size: 16px; }
.top .pill { text-decoration: none; }
main { padding-top: 6px; }
.tabs { position: fixed; left: 0; right: 0; bottom: 0; display: flex; justify-content: center; gap: 8px; padding: 10px 18px calc(10px + env(safe-area-inset-bottom)); background: rgba(244,243,239,.92); backdrop-filter: blur(12px); border-top: 1px solid var(--line); z-index: 10; }
.tabs a { flex: 1; max-width: 180px; color: var(--ink-2) !important; min-height: 52px; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 14px; color: var(--ink-3); text-decoration: none; font-weight: 800; font-size: 12px; gap: 2px; }
.tabs a span { font-size: 20px; filter: grayscale(.6); opacity: .8; }
.tabs a.on { color: var(--ink) !important; background: #fff; box-shadow: var(--shadow); }
.tabs a.on span { filter: none; opacity: 1; }
.toast { position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(96px + env(safe-area-inset-bottom)); background: var(--ink); color: #fff; padding: 12px 16px; border-radius: 12px; font-weight: 700; font-size: 14px; max-width: calc(100% - 36px); z-index: 50; box-shadow: var(--shadow); }
.toast.error { background: var(--red); }
.toast.ok { background: var(--green); }
.toast-enter-active, .toast-leave-active { transition: all .2s; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-50%, 10px); }
.fade-enter-active, .fade-leave-active { transition: opacity .15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
