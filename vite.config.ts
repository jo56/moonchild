import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [svelte()],
  base: command === 'serve' ? '/' : '/moonchild/',
  publicDir: 'static',
  assetsInclude: ['**/*.gif', '**/*.wav', '**/*.mp3', '**/*.ogg', '**/*.m4a'],
  server: {
    port: 3000,
    host: true
  }
}));
