const configuredUrl = process.env.SITE_URL;
const vercelDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
const sitesUrl = 'https://technical-notes-7c29.sillydrake3.chatgpt.site';
const url = new URL(configuredUrl || (vercelDomain ? `https://${vercelDomain}` : sitesUrl));
if (!['http:', 'https:'].includes(url.protocol) || url.pathname !== '/' || url.search || url.hash) {
  throw new Error('SITE_URL 必须是完整的站点根地址，例如 https://your-blog.vercel.app');
}

export const site = {
  name: '技术手记',
  englishName: 'THE TECHNICAL JOURNAL',
  description: '记录技术的细节，也记录思考的过程。关于前端、工程实践与持续学习的个人手记。',
  url: url.origin,
  language: 'zh-CN',
  timezone: 'Asia/Hong_Kong',
  author: {
    name: '技术手记作者',
    introduction: '这里是一块用来整理思考的自留地。记录写代码时的发现、读书时的问题，以及把事情弄明白的过程。',
    bio: '本博客目前使用示例内容展示阅读与发布体验。正式发布前，请在站点配置中替换作者介绍与联系方式。',
  },
  // Add real, public profile URLs here. Empty profiles are not rendered.
  socials: [] as { label: string; url: string }[],
};
