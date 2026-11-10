<script setup lang="ts">
import { computed } from 'vue'
import TicketCard from '../components/TicketCard.vue'
import { store } from '../lib/store'
import { isPast } from '../lib/format'

const all = store.tickets()
const upcoming = computed(() => all.filter((t) => !isPast(t.event)).sort((a, b) => Date.parse(a.event.start) - Date.parse(b.event.start)))
const past = computed(() => all.filter((t) => isPast(t.event)))
</script>

<template>
  <section class="page">
    <div>
      <h1>Your tickets</h1>
      <p class="muted">Bought with Nimiq Pay. Show the QR at the door.</p>
    </div>

    <div v-if="!all.length" class="card empty">
      <div class="art">🎟️</div>
      <h3>No tickets yet</h3>
      <p class="muted small">When someone shares a Stub event link with you, open it in Nimiq Pay, pay in NIM or USDT, and your ticket lands here.</p>
      <router-link to="/host/new" class="btn gold">Host your own event</router-link>
    </div>

    <router-link v-for="t in upcoming" :key="t.hash" :to="`/t/${t.hash}`" class="plain">
      <TicketCard :event="t.event" :qty="t.qty" compact :status="t.confirmed ? 'Confirmed' : 'Confirming'" :status-kind="t.confirmed ? 'ok' : 'warn'" />
    </router-link>

    <template v-if="past.length">
      <h3 class="muted">Past</h3>
      <router-link v-for="t in past" :key="t.hash" :to="`/t/${t.hash}`" class="plain faded">
        <TicketCard :event="t.event" :qty="t.qty" compact status="Ended" />
      </router-link>
    </template>
  </section>
</template>

<style scoped>
.plain { text-decoration: none; color: inherit; display: block; }
.faded { opacity: .6; filter: saturate(.4); }
</style>
