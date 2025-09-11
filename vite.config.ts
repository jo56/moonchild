import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/moonchild/',
  publicDir: 'public',
  assetsInclude: ['**/*.gif', '**/*.wav', '**/*.mp3'],
  server: {
    port: 3000,
    host: true
  }
})