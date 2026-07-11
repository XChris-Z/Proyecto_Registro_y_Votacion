// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import { fileURLToPath } from 'url';
import { resolve, dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: vercel(),
  vite: {
    resolve: {
      alias: {
        '@lib': resolve(__dirname, 'src/lib'),
      },
    },
  },
});
