<script setup lang="ts">
import { store } from '../lib/store'
import { fmtDate, fmtPrice, isPast } from '../lib/format'
import { THEMES } from '../lib/event'

const events = store.myEvents().sort((a, b) => Date.parse(b.start) - Date.parse(a.start))
</script>

<template>
  <section class="page">
    <div class="row between">
      <div>
        <h1>Host</h1>
        <p class="muted">Sell tickets. Get paid straight to your wallet.</p>
      </div>
    </div>
    <router-link to="/host/new" class="btn gold">＋ New event</router-link>

    <div v-if="!events.length" class="card empty">
      <div class="art">🎤</div>
      <h3>Run a meetup, class or party</h3>
      <p class="muted small">Make an event in under a minute. Share one link. Buyers pay you in NIM or USDT from Nimiq Pay, and you check them in at the door by scanning their ticket.</p>
    </div>

    <router-link v-for="e in events" :key="e.id" :to="`/host/${e.id}`" class="card ev" :class="{ past: isPast(e) }">
      <span class="dot" :style="{ background: `linear-gradient(135deg, ${THEMES[e.theme]?.from}, ${THEMES[e.theme]?.to})` }" />
      <div class="grow">
        <h3>{{ e.name }}</h3>
        <p class="muted small">{{ fmtDate(e.start) }} · {{ fmtPrice(e) }}<span v-if="e.cap"> · {{ e.cap }} spots</span></p>
      </div>
      <span class="chev">›</span>
    </router-link>
  </section>
</template>

<style scoped>
.ev { display: flex; align-items: center; gap: 14px; text-decoration: none; color: inherit; min-height: 72px; }
.ev.past { opacity: .6; }
.dot { width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0; }
.grow { flex: 1; min-width: 0; }
.grow h3 { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.chev { font-size: 26px; color: var(--ink-3); }
</style>
