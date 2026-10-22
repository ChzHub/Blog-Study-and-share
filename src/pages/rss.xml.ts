import rss from '@astrojs/rss';
import { getPosts, postUrl } from '../lib/posts';
import { site } from '../config/site';

export async function GET() {
  const posts = await getPosts();
  return rss({
    title: site.name,
    description: site.description,
    site: site.url,
    items: posts.map(post => ({ title: post.data.title, description: post.data.description, pubDate: post.data.pubDate, link: postUrl(post), categories: post.data.tags })),
    customData: '<language>zh-CN</language>',
  });
}
