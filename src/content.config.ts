import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import { parsePublicationDate } from './lib/publishing';

const posts = defineCollection({
  loader: glob({
    pattern: '*.md',
    base: './src/content/posts',
    generateId: ({ entry }) => {
      const slug = entry.replace(/\.md$/, '');
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        throw new Error(`文章文件名必须是小写英文、数字和连字符：${entry}`);
      }
      return slug;
    },
  }),
  schema: ({ image }) => z.object({
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
    pubDate: z.union([z.string(), z.date()]).transform((value, ctx) => {
      try { return parsePublicationDate(value); }
      catch (error) {
        ctx.addIssue({ code: 'custom', message: (error as Error).message });
        return z.NEVER;
      }
    }),
    tags: z.array(z.string().trim().min(1)).default([]).transform((tags) => [...new Set(tags)]),
    draft: z.boolean().default(false),
    featured: z.boolean().default(false),
    cover: image().optional(),
  }),
});

export const collections = { posts };
