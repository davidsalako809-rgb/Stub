<script setup lang="ts">
// Sticky top bar with an explicit back target, so "back" works even when a screen
// was opened directly from a link (no browser history inside the Nimiq Pay WebView).
import { useRouter } from 'vue-router'

const props = defineProps<{ to: string; label: string; title?: string }>()
const router = useRouter()
function go() { router.push(props.to) }
</script>

<template>
  <div class="topbar">
    <button class="backbtn" :aria-label="`Back to ${label}`" @click="go">
      <span class="arrow" aria-hidden="true">←</span><span class="lbl">{{ label }}</span>
    </button>
    <span v-if="title" class="title">{{ title }}</span>
    <slot />
  </div>
</template>

<style scoped>
.topbar { position: sticky; top: 0; z-index: 9; display: flex; align-items: center; gap: 10px; margin: -8px -18px 0; padding: 8px 18px; background: rgba(244,243,239,.94); backdrop-filter: blur(10px); }
.backbtn { appearance: none; border: 0; cursor: pointer; font: inherit; font-weight: 800; font-size: 15px; color: var(--ink); background: #fff; box-shadow: var(--shadow); border-radius: 999px; min-height: 44px; padding: 0 16px 0 12px; display: inline-flex; align-items: center; gap: 8px; max-width: 70%; }
.arrow { font-size: 20px; line-height: 1; }
.lbl { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.title { margin-left: auto; font-weight: 800; font-size: 13px; color: var(--ink-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 40%; }
</style>
