# 部署

这是一个纯静态指板应用。运行时无需 Node.js、后端、账号、密钥或 AI 服务。发布目录始终是 `dist/`。

## GitHub Pages

1. Fork 或创建公开仓库，推送代码到 `main`。
2. 在仓库 **Settings → Pages → Build and deployment** 将 Source 选择为 **GitHub Actions**。
3. 推送一次提交，或在 Actions 手动运行 **Check and publish**。
4. Windows、macOS 和 Linux 上的测试／构建全部通过后，工作流将 `dist/` 发布到 Pages。

项目地址为 https://gsflaming.github.io/Guitarfret-note/。Fork 后域名和仓库路径会相应变化，修改 README 中的链接即可。所有静态资源使用相对路径，支持 Pages 的仓库子路径。

工作流只用 GitHub 自带的 `GITHUB_TOKEN` 与 Pages OIDC，不配置长期凭据。公开仓库可使用 GitHub Free 的 Pages；不需要升级套餐。依据：[GitHub Pages 自定义工作流文档](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

## Cloudflare Workers（可选）

公开的 `wrangler.jsonc` 是纯静态模板，不含账号 ID、AI Binding 或存储配置。在自己的 Cloudflare Free 账号中登录：

```sh
npx wrangler login
npm run worker:check
npm run deploy
```

发布前可修改配置中的 Worker 名称。部署命令先运行测试和构建，再执行 Wrangler。不要升级到付费套餐或添加 AI 服务。本项目不需要 API Token 写入源码、前端或 `.env`。

原维护者已有线上站点使用被 Git 忽略的 `wrangler.local.jsonc`，部署脚本会优先读取它，以保留原域名及历史存储。新克隆只有公共模板，不会读取原账号或创建历史识谱资源。该本地覆盖文件不应提交到仓库。

## 其他静态主机

将 `dist/` 全部文件作为站点根目录上传即可。主机需通过 HTTP(S) 提供 HTML、CSS 和 JavaScript，`.mjs` 返回 JavaScript MIME 类型。静态应用无需重写规则。构建命令为 `npm ci && npm test && npm run build`。

## 开发与验证

开发环境搭建、预览与测试命令见[贡献指南](../CONTRIBUTING.md#搭建开发环境)。普通用户直接访问[在线工具](https://gsflaming.github.io/Guitarfret-note/)，无需运行开发服务。

更换开发预览／Pages／Cloudflare 地址后，浏览器保存的场景不会跨域同步。录屏模式仅隐藏工具，录制视频请使用系统录屏。
