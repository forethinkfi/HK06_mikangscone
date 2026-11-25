import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// base './' so the built files load from file:// inside Electron
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  server: { port: 5173, strictPort: true },
  // .env holds the Anthropic key for the Electron main process only.
  // envPrefix keeps Vite from ever exposing it to the browser bundle.
  envPrefix: 'PUBLIC_',
});
