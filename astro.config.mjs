import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { NOINDEX_PATHS } from './src/site.config.mjs';

export default defineConfig({
  site: 'https://brandondivorcehelp.com',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'never' },
  output: 'static',
  compressHTML: true,
  integrations: [sitemap({ filter: (p) => !NOINDEX_PATHS.some((x) => p.includes(x)) })],
});
