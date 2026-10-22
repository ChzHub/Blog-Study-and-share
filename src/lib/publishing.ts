/** A date-only publication starts at midnight in Hong Kong, never the host timezone. */
export function parsePublicationDate(value: string | Date): Date {
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) throw new Error('发布日期无效');
    return value;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T00:00:00+08:00`);
    const localDate = new Date(parsed.getTime() + 8 * 3600_000).toISOString().slice(0, 10);
    if (localDate !== value) throw new Error('发布日期不是有效的日历日期');
    return parsed;
  }
  if (!/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) {
    throw new Error('发布日期请使用 YYYY-MM-DD，或带时区的 ISO 日期');
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error('发布日期无效');
  return date;
}

export function isPublished(data: { draft: boolean; pubDate: Date }, now = new Date()): boolean {
  return !data.draft && data.pubDate.getTime() <= now.getTime();
}

export function sortPosts<T extends { id: string; data: { pubDate: Date } }>(posts: T[]): T[] {
  return [...posts].sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime() || a.id.localeCompare(b.id));
}

export function selectFeatured<T extends { data: { featured: boolean } }>(posts: T[]): T | undefined {
  return posts.find((post) => post.data.featured) ?? posts[0];
}

export function pageCount(total: number): number {
  return Math.max(1, Math.ceil(total / 10));
}
