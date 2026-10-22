import { getCollection, type CollectionEntry } from 'astro:content';
import { isPublished, sortPosts } from './publishing';
import { site } from '../config/site';

export type Post = CollectionEntry<'posts'>;
export async function getPosts() {
  const now = new Date();
  return sortPosts(await getCollection('posts', ({ data }) => isPublished(data, now)));
}
export const postUrl = (post: Pick<Post, 'id'>) => `/posts/${post.id}/`;
export const tagUrl = (tag: string) => `/tags/${encodeURIComponent(tag)}/`;
export const isDemo = (post: Post) => /^\s*> 示例文章[：:]/.test(post.body ?? '');
export function getTags(posts: Post[]) {
  const counts = new Map<string, number>();
  for (const post of posts) for (const tag of post.data.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-CN'));
}
export function formatDate(date: Date) {
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: site.timezone }).format(date).replaceAll('/', '.');
}
export function readingTime(body = '') {
  const chinese = body.match(/[\u3400-\u9fff]/g)?.length ?? 0;
  const words = body.replace(/[\u3400-\u9fff]/g, ' ').match(/[a-zA-Z0-9]+/g)?.length ?? 0;
  return Math.max(1, Math.ceil(chinese / 350 + words / 220));
}
