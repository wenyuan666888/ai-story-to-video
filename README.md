# AI 故事转视频 (ai-story-to-video)

把一段文字故事自动拆成多个分镜，再为每个分镜生成图片与短视频，支持连续播放或导出为一条完整视频。

---

## 仓库结构

- **story-to-video-app/** — 主应用（Next.js + Supabase），即本网站的全部代码与文档
- **supabase/migrations/** — 数据库迁移（需在 Supabase 控制台执行）
- **上传到GitHub指南.md** — 如何将本项目上传到 GitHub 的步骤说明

## 快速开始

详细说明、环境变量与使用方式见 **story-to-video-app/README.md** 与 **story-to-video-app/接入说明.md**。

1. 克隆仓库：
   ```bash
   git clone https://github.com/你的用户名/仓库名.git
   cd 仓库名
   ```

2. 进入网站项目并安装依赖：
   ```bash
   cd story-to-video-app
   npm install
   ```

3. 复制环境变量示例并填写自己的密钥：
   ```bash
   cp .env.local.example .env.local
   ```
   编辑 `.env.local`，至少填写 Supabase 的 URL 和 anon key。详见 `story-to-video-app/接入说明.md`。

4. 执行数据库迁移：  
   在 Supabase 控制台 SQL Editor 中执行项目根目录下 `supabase/migrations/` 中的 SQL 文件（如 `001_initial_schema.sql`、`002_add_final_video.sql`）。

5. 启动开发服务器：
   ```bash
   npm run dev
   ```
   浏览器打开 http://localhost:3000。
---

## 技术栈

- Next.js 16 · Supabase（认证 / 数据库 / 存储）
- 可选：OpenAI 兼容 API（分镜）、火山引擎（图片/视频）、Unsplash

---

## 许可证

仅供学习与演示使用。使用第三方 API 请遵守其服务条款；请勿将密钥提交到仓库。
