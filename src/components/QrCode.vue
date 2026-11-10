<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import QRCode from 'qrcode'

const props = withDefaults(defineProps<{ value: string; size?: number; dark?: string }>(), { size: 220, dark: '#1F2348' })
const src = ref('')
watchEffect(async () => {
  src.value = await QRCode.toDataURL(props.value, { margin: 1, width: props.size * 2, errorCorrectionLevel: 'M', color: { dark: props.dark, light: '#ffffff' } })
})
</script>

<template>
  <img v-if="src" :src="src" :width="size" :height="size" alt="Ticket QR code" class="qr" />
</template>

<style scoped>
.qr { display: block; border-radius: 12px; image-rendering: pixelated; }
</style>
