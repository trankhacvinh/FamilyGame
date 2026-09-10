import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/FamilyGame/',
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      input: {
        game: resolve(process.cwd(), 'index.html'),
        assetTool: resolve(process.cwd(), 'asset-tool.html'),
      },
    },
  },
});
