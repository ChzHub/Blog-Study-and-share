import assert from 'node:assert/strict';
import { writeFile, readFile, rm, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = new URL('../test-results/content-build/', import.meta.url);
const fixtureNames = [];
const content = (name) => fileURLToPath(new URL(`../src/content/posts/${name}.md`, import.meta.url));
async function add(name, frontmatter, body = '用于自动化验收的临时内容。') {
  await access(content(name)).then(() => { throw new Error(`Fixture already exists: ${name}`); }, error => { if (error.code !== 'ENOENT') throw error; });
  fixtureNames.push(name);
  await writeFile(content(name), `---\n${frontmatter}\n---\n${body}\n`, 'utf8');
}
function build() {
  return spawnSync(process.execPath, ['node_modules/astro/bin/astro.mjs', 'build', '--outDir', fileURLToPath(output)], { cwd: root, env: { ...process.env, SITE_URL: 'https://blog.example.com' }, encoding: 'utf8' });
}
async function html(path) { return readFile(new URL(path, output), 'utf8'); }
const metadata = (title) => `title: "${title}"\ndescription: "构建验收"\npubDate: "2020-01-01"\ntags: ["验收主题"]`;

try {
  for (let i = 1; i <= 6; i++) await add(`test-fixture-published-${i}`, metadata(`验收文章 ${i}`));
  await add('test-fixture-draft', `${metadata('验收草稿隐藏')}\ndraft: true`);
  await add('test-fixture-future', 'title: "验收未来隐藏"\ndescription: "不可发布"\npubDate: "2099-01-01"\ntags: ["隐藏主题"]');
  let result = build();
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(((await html('posts/index.html')).match(/class="post-list-item"/g) || []).length, 10);
  assert.equal(((await html('posts/page/2/index.html')).match(/class="post-list-item"/g) || []).length, 2);
  assert.equal(((await html('rss.xml')).match(/<item>/g) || []).length, 12);
  for (const path of ['index.html', 'posts/index.html', 'rss.xml', 'sitemap-0.xml', 'tags/index.html']) {
    assert.doesNotMatch(await html(path), /验收草稿隐藏|验收未来隐藏|隐藏主题|test-fixture-draft|test-fixture-future/);
  }
  for (const name of ['test-fixture-draft', 'test-fixture-future']) {
    await assert.rejects(access(new URL(`posts/${name}/index.html`, output)));
  }
  assert.match(await html('posts/test-fixture-published-1/index.html'), /验收文章 1/);
  await add('test-fixture-invalid', 'title: "缺少摘要与日期"');
  result = build();
  assert.notEqual(result.status, 0, 'Invalid frontmatter must fail the production build');
  assert.match(result.stdout + result.stderr, /description|pubDate/);
  console.log('Content build checks passed: Markdown routes, 10/2 pagination, RSS, hidden articles, schema failures.');
} finally {
  // Only remove exact files created by this test; no directory deletion.
  for (const name of fixtureNames) await rm(content(name), { force: true });
}
