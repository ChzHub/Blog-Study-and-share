import { test, expect } from '@playwright/test';

test('home, article, tag navigation and RSS', async ({ page, request, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('记录，思考，生长。');
  await expect(page.locator('.post-card')).toHaveCount(6);
  await page.locator('.featured-copy h2 a').click();
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
