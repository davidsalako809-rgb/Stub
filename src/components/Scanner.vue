<script setup lang="ts">
// Camera QR scanning with nimiq/qr-scanner (built by the Nimiq team). Falls back to paste if the camera is unavailable.
import { onBeforeUnmount, onMounted, ref } from 'vue'
import QrScanner from 'qr-scanner'

const emit = defineEmits<{ (e: 'code', v: string): void; (e: 'unavailable', reason: string): void }>()
const video = ref<HTMLVideoElement>()
let scanner: QrScanner | null = null
let last = ''
let lastAt = 0

onMounted(async () => {
  try {
    if (!(await QrScanner.hasCamera())) throw new Error('No camera found on this device.')
    scanner = new QrScanner(video.value!, (r) => {
      const now = Date.now()
      if (r.data === last && now - lastAt < 4000) return // ignore the same code held in view
      last = r.data; lastAt = now
      emit('code', r.data)
    }, { preferredCamera: 'environment', highlightScanRegion: false, maxScansPerSecond: 6, returnDetailedScanResult: true })
    await scanner.start()
  } catch (e: any) {
    emit('unavailable', typeof e === 'string' ? e : e?.message || 'Camera is not available here.')
  }
})
onBeforeUnmount(() => { scanner?.stop(); scanner?.destroy() })
defineExpose({ pause: () => scanner?.pause(), resume: () => scanner?.start() })
</script>

<template>
  <div class="cam">
    <video ref="video" muted playsinline />
    <div class="frame" aria-hidden="true"><i /><i /><i /><i /></div>
  </div>
</template>

<style scoped>
.cam { position: relative; border-radius: 20px; overflow: hidden; background: #0d0f24; aspect-ratio: 1; }
video { width: 100%; height: 100%; object-fit: cover; display: block; }
.frame { position: absolute; inset: 18%; }
.frame i { position: absolute; width: 34px; height: 34px; border: 4px solid var(--gold); }
.frame i:nth-child(1) { top: 0; left: 0; border-right: 0; border-bottom: 0; border-radius: 10px 0 0 0; }
.frame i:nth-child(2) { top: 0; right: 0; border-left: 0; border-bottom: 0; border-radius: 0 10px 0 0; }
.frame i:nth-child(3) { bottom: 0; left: 0; border-right: 0; border-top: 0; border-radius: 0 0 0 10px; }
.frame i:nth-child(4) { bottom: 0; right: 0; border-left: 0; border-top: 0; border-radius: 0 0 10px 0; }
</style>
