import { parseDocument } from 'yaml';

const owner = 'ChzHub';
const repo = 'Blog-Study-and-share';
const branch = 'main';
const root = `https://api.github.com/repos/${owner}/${repo}`;
const postDir = 'src/content/posts';
const settingsPath = 'src/config/content.json';
const el = (id) => document.getElementById(id);
let token = '';
let currentSha = '';
let currentSlug = '';
let currentDocument = null;
let settingsSha = '';
let settings = {};

const settingsLabels = {
  name: '站点名称', englishName: '英文名称', description: '站点描述（用于搜索引擎）',
  authorName: '作者名称', authorIntroduction: '作者简介', authorBio: '关于页说明',
  homeHeading: '首页文章区标题', postsHeading: '文章列表页标题', tagsHeading: '主题页标题',
  searchHeading: '搜索页标题', aboutHeading: '关于页标题',
};
function status(message, error = false) {
  el('admin-status').textContent = message;
  el('admin-status').classList.toggle('error', error);
}
function encode(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}
function decode(base64) {
  const binary = atob(base64.replace(/\s/g, ''));
  return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(binary, c => c.charCodeAt(0)));
}
async function request(path, options = {}) {
  const response = await fetch(path.startsWith('https://api.github.com/') ? path : root + path, {
    ...options,
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28', ...options.headers },
    cache: 'no-store',
  });
  if (!response.ok) {
    if (response.status === 409 || response.status === 422) throw new Error('保存冲突或内容不符合 GitHub 要求。请重新加载文章后再试，避免覆盖其他修改。');
    if (response.status === 401) throw new Error('令牌无效或已过期，请重新连接。');
    if (response.status === 403) throw new Error('GitHub 拒绝访问，请检查令牌的仓库权限和分支保护设置。');
    throw new Error(`GitHub 请求失败（${response.status}），请检查仓库、令牌权限与网络。`);
  }
  return response.json();
}
const pathUrl = path => `/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(branch)}`;
async function readFile(path) {
  const result = await request(pathUrl(path));
  if (!result.content || result.encoding !== 'base64') throw new Error('文件过大或格式不支持，请检查仓库内容。');
  return { text: decode(result.content), sha: result.sha };
}
async function writeFile(path, text, sha, message) {
  const payload = { message, content: encode(text), branch };
  if (sha) payload.sha = sha;
  return request(`/contents/${path.split('/').map(encodeURIComponent).join('/')}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
}
function parsePost(text) {
  const match = text.replace(/^\uFEFF/, '').match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)([\s\S]*)$/);
  if (!match) throw new Error('Markdown 需要以 --- 包围的 frontmatter 开头。');
  const doc = parseDocument(match[1]);
  if (doc.errors.length || !doc.contents || typeof doc.toJS() !== 'object' || Array.isArray(doc.toJS())) throw new Error('文章的 frontmatter 无法读取，请检查 YAML 格式。');
  return { doc, body: match[2].replace(/^\r?\n/, '') };
}
function populatePost(text) {
  const { doc, body } = parsePost(text);
  currentDocument = doc;
  const data = doc.toJS();
  el('post-title').value = data.title ?? '';
  el('description').value = data.description ?? '';
  el('date').value = data.pubDate instanceof Date ? data.pubDate.toISOString() : String(data.pubDate ?? '');
  el('tags').value = Array.isArray(data.tags) ? data.tags.join(', ') : '';
  el('draft').checked = data.draft === true;
  el('featured').checked = data.featured === true;
  el('markdown').value = body;
}
function resetPost() {
  el('post-form').reset();
  currentSha = ''; currentSlug = ''; currentDocument = null;
  el('slug').readOnly = false;
  el('date').value = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Hong_Kong', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  el('post-select').value = '';
}
async function refreshPosts() {
  const files = await request(pathUrl(postDir));
  const select = el('post-select');
  select.replaceChildren(new Option('新建文章', ''));
  files.filter(f => f.type === 'file' && /^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(f.name)).sort((a, b) => a.name.localeCompare(b.name)).forEach(f => select.add(new Option(f.name.replace(/\.md$/, ''), f.name.replace(/\.md$/, ''))));
}
function renderSettings() {
  const container = el('settings-fields');
  container.replaceChildren();
  for (const [key, label] of Object.entries(settingsLabels)) {
    const wrapper = document.createElement('div');
    const fieldLabel = document.createElement('label');
    const input = ['description', 'authorIntroduction', 'authorBio'].includes(key) ? document.createElement('textarea') : document.createElement('input');
    input.id = `setting-${key}`; input.name = key; input.required = true; input.value = settings[key] ?? '';
    if (input.tagName === 'TEXTAREA') input.rows = 3;
    fieldLabel.htmlFor = input.id; fieldLabel.textContent = label;
    wrapper.append(fieldLabel, input); container.append(wrapper);
  }
}
async function loadSettings() {
  const result = await readFile(settingsPath);
  settings = JSON.parse(result.text); settingsSha = result.sha; renderSettings();
}
async function run(button, work) {
  button.disabled = true;
  try { await work(); } catch (error) { status(error.message || '操作失败，请稍后重试。', true); }
  finally { button.disabled = false; }
}
function validDate(value) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value;
  }
  return /^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/i.test(value) && Number.isFinite(Date.parse(value));
}
el('login-form').addEventListener('submit', event => {
  event.preventDefault();
  run(event.submitter, async () => {
    token = el('token').value.trim(); el('token').value = '';
    try {
      const user = await request('https://api.github.com/user');
      const repository = await request('');
      if (!repository.permissions?.push) throw new Error('这个令牌没有仓库写入权限。');
      await refreshPosts(); await loadSettings();
      el('account-name').textContent = `已连接：${user.login}`;
      el('login-panel').hidden = true; el('manager').hidden = false;
      resetPost(); status('连接成功。内容直接保存到 GitHub 的 main 分支。');
    } catch (error) { token = ''; throw error; }
  });
});
el('logout').addEventListener('click', () => { token = ''; currentSha = ''; settingsSha = ''; settings = {}; currentDocument = null; el('manager').hidden = true; el('login-panel').hidden = false; el('post-form').reset(); el('settings-fields').replaceChildren(); status('已断开连接。'); });
document.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-tab]').forEach(tab => tab.setAttribute('aria-pressed', String(tab === button)));
  el('posts-panel').hidden = button.dataset.tab !== 'posts'; el('settings-panel').hidden = button.dataset.tab !== 'settings'; status('');
}));
el('new-post').addEventListener('click', () => { resetPost(); status('正在新建文章。'); });
el('post-select').addEventListener('change', async event => {
  const slug = event.target.value;
  if (!slug) { resetPost(); return; }
  try {
    status('正在加载文章…');
    const file = await readFile(`${postDir}/${slug}.md`);
    populatePost(file.text); currentSha = file.sha; currentSlug = slug;
    el('slug').value = slug; el('slug').readOnly = true; status('文章已加载。');
  } catch (error) { resetPost(); status(error.message, true); }
});
el('import-file').addEventListener('change', async event => {
  const file = event.target.files?.[0]; if (!file) return;
  try {
    if (file.size > 1024 * 1024) throw new Error('Markdown 文件不能超过 1 MB。');
    populatePost(await file.text());
    if (!currentSlug) el('slug').value = file.name.replace(/\.(md|markdown)$/i, '');
    status('文件已导入，请检查内容后保存。');
  } catch (error) { status(error.message, true); }
  event.target.value = '';
});
el('post-form').addEventListener('submit', event => {
  event.preventDefault();
  run(event.submitter, async () => {
    const slug = el('slug').value.trim();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('文章链接名称只能使用小写字母、数字和连字符。');
    if (!validDate(el('date').value.trim())) throw new Error('发布日期无效；请输入 YYYY-MM-DD 或带时区的 ISO 时间。');
    if (currentSlug && currentSlug !== slug) throw new Error('不能更改已有文章的链接名称。');
    const doc = currentDocument || parseDocument('{}');
    doc.set('title', el('post-title').value.trim()); doc.set('description', el('description').value.trim());
    doc.set('pubDate', el('date').value.trim());
    doc.set('tags', [...new Set(el('tags').value.split(/[,，]/).map(t => t.trim()).filter(Boolean))]);
    doc.set('draft', el('draft').checked); doc.set('featured', el('featured').checked);
    const content = `---\n${doc.toString()}---\n\n${el('markdown').value.trim()}\n`;
    if (new TextEncoder().encode(content).length > 1024 * 1024) throw new Error('文章不能超过 1 MB。');
    const result = await writeFile(`${postDir}/${slug}.md`, content, currentSha, `${currentSha ? 'Update' : 'Add'} post: ${slug}`);
    currentSlug = slug; currentSha = result.content.sha; currentDocument = doc; el('slug').readOnly = true;
    await refreshPosts(); el('post-select').value = slug;
    status('文章已保存到 GitHub。请等待 Vercel 构建和部署。');
  });
});
el('settings-form').addEventListener('submit', event => {
  event.preventDefault();
  run(event.submitter, async () => {
    const next = { ...settings };
    for (const key of Object.keys(settingsLabels)) {
      next[key] = el(`setting-${key}`).value.trim();
      if (!next[key]) throw new Error(`${settingsLabels[key]}不能为空。`);
    }
    const result = await writeFile(settingsPath, `${JSON.stringify(next, null, 2)}\n`, settingsSha, 'Update site content');
    settings = next; settingsSha = result.content.sha;
    status('站点文案已保存到 GitHub。请等待 Vercel 构建和部署。');
  });
});
