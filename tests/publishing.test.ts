import test from 'node:test';
import assert from 'node:assert/strict';
import { isPublished, parsePublicationDate, selectFeatured, sortPosts, pageCount } from '../src/lib/publishing.ts';

test('date-only publishing uses midnight in Hong Kong', () => {
  assert.equal(parsePublicationDate('2026-10-22').toISOString(), '2026-10-21T16:00:00.000Z');
  const pubDate = parsePublicationDate('2026-10-22');
  assert.equal(isPublished({ draft: false, pubDate }, new Date('2026-10-21T15:59:59Z')), false);
  assert.equal(isPublished({ draft: false, pubDate }, new Date('2026-10-21T16:00:00Z')), true);
});

test('drafts stay hidden and timestamps must declare a timezone', () => {
  assert.equal(isPublished({ draft: true, pubDate: new Date('2020-01-01') }), false);
  assert.throws(() => parsePublicationDate('2026-10-22T10:00:00'), /时区/);
  assert.throws(() => parsePublicationDate('2026-02-30'), /日历/);
  assert.equal(parsePublicationDate('2026-10-22T03:00:00+08:00').toISOString(), '2026-10-21T19:00:00.000Z');
});

test('newest featured article wins; absent feature falls back to newest', () => {
  const make = (id: string, date: string, featured = false) => ({ id, data: { pubDate: new Date(date), featured } });
  const posts = sortPosts([make('old-feature', '2026-01-01', true), make('new', '2026-10-01'), make('new-feature', '2026-05-01', true)]);
  assert.equal(selectFeatured(posts)?.id, 'new-feature');
  assert.equal(selectFeatured(posts.map(post => ({ ...post, data: { ...post.data, featured: false } })))?.id, 'new');
  assert.equal(selectFeatured([]), undefined);
});

test('pagination covers empty, exact, and overflow pages', () => {
  assert.equal(pageCount(0), 1);
  assert.equal(pageCount(10), 1);
  assert.equal(pageCount(11), 2);
  assert.equal(pageCount(20), 2);
});
