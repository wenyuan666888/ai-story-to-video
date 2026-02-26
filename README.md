# AI 故事转视频 (ai-story-to-video)

把一段文字故事自动拆成多个分镜，再为每个分镜生成图片与短视频，支持连续播放或导出为一条完整视频。

---

## 仓库结构

- **story-to-video-app/** — 主应用（Next.js + Supabase），即本网站的全部代码与文档
- **supabase/migrations/** — 数据库迁移（需在 Supabase 控制台执行）
- **上传到GitHub指南.md** — 如何将本项目上传到 GitHub 的步骤说明

---

## 快速开始

1. 进入应用目录并安装依赖：
   ```bash
   cd story-to-video-app
   npm install
   ```
2. 复制环境变量并填写（至少配置 Supabase）：
   ```bash
   cp .env.local.example .env.local
   ```
3. 在 Supabase 控制台执行 `supabase/migrations/` 下的 SQL 文件初始化数据库。
4. 启动开发服务器：
   ```bash
   npm run dev
   ```
   浏览器访问 http://localhost:3000

详细说明、环境变量与使用方式见 **story-to-video-app/README.md** 与 **story-to-video-app/接入说明.md**。

---

## 技术栈

- Next.js 16 · Supabase（认证 / 数据库 / 存储）
- 可选：OpenAI 兼容 API（分镜）、火山引擎（图片/视频）、Unsplash

---

## 许可证

仅供学习与演示使用。使用第三方 API 请遵守其服务条款；请勿将密钥提交到仓库。
