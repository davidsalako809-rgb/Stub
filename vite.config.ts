import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// Mini apps must be reachable from a phone on the same Wi-Fi (see nimiq.dev "Load a Local Mini App").
export default defineConfig({
  base: './',
  plugins: [vue()],
  server: { port: 5173, host: true },
  preview: { port: 4173, host: true },
  test: { environment: 'node' },
} as any)
