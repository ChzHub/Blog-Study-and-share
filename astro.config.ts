import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { site } from './src/config/site';

export default defineConfig({
  site: site.url,
  output: 'static',
  trailingSlash: 'always',
  integrations: [sitemap({ filter: (url) => !['/404/', '/404.html', '/search/'].some(path => url.endsWith(path)) })],
  markdown: { shikiConfig: { theme: 'github-light', wrap: false } },
});
