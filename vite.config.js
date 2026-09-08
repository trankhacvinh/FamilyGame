import { defineConfig } from 'vite';

export default defineConfig({
  base: '/FamilyGame/',
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
