import content from './content.json';

const configuredUrl = process.env.SITE_URL;
const vercelDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
const sitesUrl = 'https://technical-notes-7c29.sillydrake3.chatgpt.site';
const url = new URL(configuredUrl || (vercelDomain ? `https://${vercelDomain}` : sitesUrl));
if (!['http:', 'https:'].includes(url.protocol) || url.pathname !== '/' || url.search || url.hash) {
  throw new Error('SITE_URL 必须是完整的站点根地址，例如 https://your-blog.vercel.app');
}

export const site = {
  name: content.name,
  englishName: content.englishName,
  description: content.description,
  url: url.origin,
  language: 'zh-CN',
  timezone: 'Asia/Hong_Kong',
  author: {
    name: content.authorName,
    introduction: content.authorIntroduction,
    bio: content.authorBio,
  },
  content,
  // Add real, public profile URLs here. Empty profiles are not rendered.
  socials: [] as { label: string; url: string }[],
};
