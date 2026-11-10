import { test, expect } from '@playwright/test';

test('home, article, tag navigation and RSS', async ({ page, request, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('技术手记作者');
  await expect(page.locator('.home-article')).toHaveCount(6);
  await page.locator('.author-intro-link').click();
  await expect(page).toHaveURL(/\/about\/$/);
  await page.goto('/');
  await page.locator('.home-article h3 a').filter({ hasText: '把学习的过程' }).click();
  await expect(page.locator('h1')).toContainText('把学习的过程');
  await page.locator('.article-toc a').first().click();
  await expect(page).toHaveURL(url => decodeURIComponent(url.hash) === '#从一个具体的问题开始');
  await page.locator('.copy-code').first().click();
  await expect(page.locator('.copy-code').first()).toHaveText('已复制');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('type Note');
  await page.locator('.article-header .inline-tags a').first().click();
  await expect(page.locator('h1')).toContainText('学习方法');
  await expect(page.locator('.post-list-item')).toHaveCount(2);
  const rss = await request.get('/rss.xml');
  expect(rss.status()).toBe(200);
  expect((await rss.text()).match(/<item>/g)).toHaveLength(6);
});

test('Chinese full text, English terms, no results and cleared search', async ({ page }) => {
  await page.goto('/search/');
  const input = page.getByRole('searchbox');
  await input.fill('理解');
  await expect(page.locator('.search-result')).not.toHaveCount(0);
  await expect(page.locator('#search-status')).toContainText('找到');
  await input.fill('TypeScript');
  await expect(page.locator('.search-result h2').first()).toContainText('TypeScript');
  await input.fill('zzzznoresults999');
  await expect(page.locator('#search-status')).toContainText('没有找到');
  await input.clear();
  await expect(page.locator('#search-status')).toContainText('你的下一个发现');
  await expect(page.locator('.search-result')).toHaveCount(0);
});

test('search can recover from an unavailable index', async ({ page }) => {
  await page.route('**/pagefind/pagefind.js*', route => route.abort());
  await page.goto('/search/?q=学习');
  await expect(page.locator('#search-status')).toContainText('搜索暂时不可用');
  await page.unroute('**/pagefind/pagefind.js*');
  await page.getByRole('button', { name: '搜索', exact: true }).click();
  await expect(page.locator('#search-status')).toContainText('找到');
});

test('article works with JavaScript disabled', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4321/posts/typescript-boundaries/');
  await expect(page.locator('h1')).toContainText('TypeScript');
  await expect(page.locator('.prose pre')).toContainText('isProfile');
  await page.locator('a.skip-link').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
  await context.close();
});

test('rendered internal links, images and SEO endpoints are valid', async ({ page, request }) => {
  const paths = ['/', '/posts/', '/tags/', '/search/', '/about/', '/posts/learning-in-public/'];
  const checked = new Set<string>();
  for (const path of paths) {
    await page.goto(path);
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toMatch(/^https?:\/\//);
    const targets = await page.locator('a[href], img[src], meta[property="og:image"]').evaluateAll(elements => elements.map(el => el.getAttribute('href') || el.getAttribute('src') || el.getAttribute('content') || ''));
    for (const target of targets) {
      const url = new URL(target, page.url());
      if (!target.startsWith('/') || checked.has(url.pathname)) continue;
      checked.add(url.pathname);
      expect((await request.get(url.pathname)).ok(), url.pathname).toBe(true);
    }
  }
  for (const path of ['/robots.txt', '/sitemap-index.xml', '/sitemap-0.xml']) {
    expect((await request.get(path)).ok(), path).toBe(true);
  }
  const response = await page.goto('/this-page-does-not-exist/');
  expect(response?.status()).toBe(404);
  await expect(page.locator('h1')).toContainText('这一页，还没有写下');
});

for (const width of [375, 768, 1440]) {
  test(`pages fit viewport at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    for (const path of ['/', '/posts/', '/tags/', '/search/', '/about/', '/posts/learning-in-public/', '/404/']) {
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), path).toBe(true);
    }
    await page.goto('/');
    await page.screenshot({ path: `test-results/home-${width}.png`, fullPage: true });
    await page.goto('/posts/learning-in-public/');
    if (width < 1000) await expect(page.locator('.article-toc details')).not.toHaveAttribute('open', '');
    await page.screenshot({ path: `test-results/article-${width}.png`, fullPage: true });
  });
}

test('admin edits content through GitHub without exposing a token to the site', async ({ page }) => {
  const saved: { path: string; body: any }[] = [];
  const content = { name: '技术手记', englishName: 'THE TECHNICAL JOURNAL', description: '简介', authorName: '作者', authorIntroduction: '介绍', authorBio: '说明', homeHeading: '最近的文章', postsHeading: '文章', tagsHeading: '主题', searchHeading: '搜索', aboutHeading: '关于' };
  await page.route('https://api.github.com/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    expect(request.headers().authorization).toBe('Bearer example-test-token');
    if (request.method() === 'PUT') {
      saved.push({ path, body: request.postDataJSON() });
      return route.fulfill({ json: { content: { sha: 'new-sha' } } });
    }
    if (path === '/user') return route.fulfill({ json: { login: 'owner' } });
    if (path === '/repos/ChzHub/Blog-Study-and-share') return route.fulfill({ json: { permissions: { push: true } } });
    if (path.endsWith('/src/content/posts')) return route.fulfill({ json: [] });
    if (path.endsWith('/src/config/content.json')) return route.fulfill({ json: { encoding: 'base64', content: Buffer.from(JSON.stringify(content)).toString('base64'), sha: 'settings-sha' } });
    return route.fulfill({ status: 404 });
  });
  await page.goto('/admin/');
  await page.getByLabel('GitHub 访问令牌').fill('example-test-token');
  await page.getByRole('button', { name: '连接仓库' }).click();
  await expect(page.getByText('已连接：owner')).toBeVisible();
  await page.getByLabel('文章链接名称').fill('new-note');
  await page.getByLabel('发布日期').fill('2026-11-10');
  await page.getByLabel('文章标题').fill('测试文章');
  await page.getByLabel('文章摘要').fill('文章摘要');
  await page.getByLabel('标签').fill('技术, 笔记');
  await page.getByLabel('正文（Markdown）').fill('正文内容');
  await page.getByRole('button', { name: '保存文章到 GitHub' }).click();
  await expect(page.locator('#admin-status')).toContainText('文章已保存');
  expect(saved[0].path).toContain('/src/content/posts/new-note.md');
  const markdown = Buffer.from(saved[0].body.content, 'base64').toString('utf8');
  expect(markdown).toContain('测试文章');
  expect(markdown).toContain('正文内容');
  await page.getByRole('button', { name: '站点文案' }).click();
  await page.getByLabel('首页文章区标题').fill('最新手记');
  await page.getByRole('button', { name: '保存站点文案' }).click();
  await expect(page.locator('#admin-status')).toContainText('站点文案已保存');
  expect(saved[1].body.sha).toBe('settings-sha');
  expect(JSON.parse(Buffer.from(saved[1].body.content, 'base64').toString('utf8')).homeHeading).toBe('最新手记');
  await page.getByRole('button', { name: '断开连接' }).click();
  await expect(page.getByLabel('GitHub 访问令牌')).toHaveValue('');
});

test('admin preserves existing metadata and refuses conflicting edits', async ({ page }) => {
  const oldMarkdown = '---\ntitle: Old title\ndescription: Old description\npubDate: "2026-10-20"\ntags: [CSS]\ncover: ../../assets/cover.jpg\ncustomField: retained\n---\n\nOld body\n';
  let sent: any;
  await page.route('https://api.github.com/**', async route => {
    const req = route.request(); const path = new URL(req.url()).pathname;
    if (req.method() === 'PUT') { sent = req.postDataJSON(); return route.fulfill({ status: 409, json: { message: 'conflict' } }); }
    if (path === '/user') return route.fulfill({ json: { login: 'owner' } });
    if (path === '/repos/ChzHub/Blog-Study-and-share') return route.fulfill({ json: { permissions: { push: true } } });
    if (path.endsWith('/src/content/posts')) return route.fulfill({ json: [{ type: 'file', name: 'old-note.md' }] });
    if (path.endsWith('/src/content/posts/old-note.md')) return route.fulfill({ json: { encoding: 'base64', content: Buffer.from(oldMarkdown).toString('base64'), sha: 'original-sha' } });
    if (path.endsWith('/src/config/content.json')) return route.fulfill({ json: { encoding: 'base64', content: Buffer.from('{}').toString('base64'), sha: 'settings-sha' } });
    return route.fulfill({ status: 404 });
  });
  await page.goto('/admin/');
  await page.getByLabel('GitHub 访问令牌').fill('example-test-token');
  await page.getByRole('button', { name: '连接仓库' }).click();
  await page.getByLabel('选择文章').selectOption('old-note');
  await expect(page.getByLabel('文章标题')).toHaveValue('Old title');
  await expect(page.getByLabel('文章链接名称')).toHaveAttribute('readonly', '');
  await page.getByLabel('文章标题').fill('Updated title');
  await page.getByRole('button', { name: '保存文章到 GitHub' }).click();
  await expect(page.locator('#admin-status')).toContainText('保存冲突');
  expect(sent.sha).toBe('original-sha');
  const markdown = Buffer.from(sent.content, 'base64').toString('utf8');
  expect(markdown).toContain('cover: ../../assets/cover.jpg');
  expect(markdown).toContain('customField: retained');
});
