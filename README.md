# 技术手记

中文个人技术博客：Astro、TypeScript、Markdown、Pagefind。米白纸张风格，六篇明确标注的示例文章，无数据库或管理后台。

## 本地运行

需要 Node.js 22.23.4 或以上版本（推荐使用 `.nvmrc` 指定的版本）。

```sh
npm ci
npm run dev
```

浏览 http://localhost:4321 。开发模式支持 Markdown 热更新；Pagefind 索引由生产构建生成，完整搜索体验请运行：

```sh
npm run build
npm run preview
```

## 发布文章

在 `src/content/posts/` 新增一个 Markdown 文件，文件名使用小写英文、数字与连字符，例如 `my-first-note.md`，URL 即 `/posts/my-first-note/`。发布后保留文件名，避免旧链接失效。

```yaml
---
title: "我的第一篇手记"
description: "一段用于文章列表和搜索引擎的简短摘要。"
pubDate: "2026-10-22"
tags: ["学习方法"]
draft: false
featured: false
# cover: "../../assets/my-cover.jpg"
---
```

之后直接编写正文。标题、摘要、日期为必填项，`tags` 默认为空，`draft`、`featured` 默认为 `false`，`cover` 为可选本地图片，路径相对于 Markdown 文件。封面图片会在构建时校验和优化；无图文章使用几何封面。

**日期与可见性**：日期请加引号。`YYYY-MM-DD` 按香港时间当日零点处理；精确时间必须带时区，例如 `2026-10-22T09:00:00+08:00`。草稿和未来文章不会生成页面，也不会出现在列表、标签、搜索、RSS 或 sitemap。定时文章在日期到达后还需要一次新的构建才会发布，静态站点不会自动唤醒。

首页主推最新的 `featured: true` 文章；没有精选时展示最新文章。列表每页十篇。正文二、三级标题自动进入目录。示例文章通过正文开头的 `> 示例文章：` 标记，在首页显示示例提示；真实新文章不带这个标记。

## 个性化

编辑 `src/config/site.ts` 中的站名、介绍、作者信息与 `socials`。没有配置社交链接时，页面不会显示虚构链接。上线前替换作者信息和六篇示例文章，修改关于页中的示例说明；默认封面可直接保留。

`SITE_URL` 指定正式站点根地址，用于 canonical、RSS、sitemap、robots 和分享链接。未设置时，Vercel 自动读取 `VERCEL_PROJECT_PRODUCTION_URL`，其次读取 `VERCEL_URL`；其他环境默认使用站点配置中的 Sites 地址。不得填入带子路径的 URL。不要把本地 `.env` 提交到仓库。

## 临时 Sites 部署

当前站点地址：https://technical-notes-7c29.sillydrake3.chatgpt.site 。默认仅所有者可访问。

`.openai/hosting.json` 保存 Sites 项目 ID 与 `dist` 静态产物目录。更新内容后需重新构建，并通过 Sites 保存版本与部署；向 Sites 源码仓库推送本身不会自动发布。本项目仍保留 Vercel 配置，后续可以按下面的步骤迁移。

## GitHub → Vercel

1. 将项目推送到你的 GitHub 仓库，默认分支命名为 `main`。
2. 在 Vercel 的 **Add New Project** 中导入该仓库，选择 Node.js 22；根目录为项目根目录。
3. 仓库内 `vercel.json` 已设置 Astro、`npm run build` 和 `dist` 输出，无需适配器或数据库。
4. 首次使用 Vercel 分配的正式域名；使用自定义域名时设置 `SITE_URL=https://你的域名` 并重新部署。
5. 主分支提交自动部署，拉取请求生成预览。构建失败不会替换当前成功的生产部署。GitHub Actions 同时执行构建和浏览器检查；如需将其作为合并门槛，在仓库分支保护中启用对应检查。

此代码仓库不包含 GitHub/Vercel 账号授权、远程仓库或部署凭据；连接平台后才能完成真实自动发布。

## 验证

```sh
npm test
npm run test:content
npm run build
npx playwright install chromium
npm run test:e2e
```

测试覆盖香港时区发布边界、草稿、精选回退、分页、中文与英文搜索、索引失败重试、目录跳转、代码复制、RSS、无 JavaScript 阅读，以及 375/768/1440px 布局。内容构建测试会临时创建并自动清理测试文章，构建到独立的 `test-results/content-build/`，不会覆盖正式 `dist`。请勿同时运行多个构建或在内容构建测试期间启动开发服务器。搜索测试使用生产索引，运行前须先构建。

所有内容为构建时生成。内容变化会同步更新文章路由、主题、RSS、SEO 与搜索索引。若没有文章，首页与列表会显示空状态。
