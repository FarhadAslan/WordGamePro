import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    target: 'es2020',
    rollupOptions: {
      input: { main: 'index.html' }
    }
  },
  plugins: []
});
