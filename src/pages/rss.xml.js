import rss from '@astrojs/rss';
import { POSTS, postDescription } from '../lib/content.mjs';
import { SITE } from '../site.config.mjs';
// Replaces the WordPress feed (/feed/ redirects here).
export function GET(context) {
  return rss({
    title: SITE.name, description: 'Florida divorce and family law articles', site: context.site,
    items: POSTS.slice(0, 30).map((p) => ({ title: p.title, link: p.path, pubDate: new Date(p.date + '-05:00'), description: postDescription(p) })),
  });
}
