# 将本项目上传到 GitHub 指南

本文档说明如何把本仓库上传到 GitHub，并保证不泄露密钥、能正常克隆与运行。

---

## 一、前置准备

1. **已安装 Git**  
   在终端执行 `git --version`，若有版本号说明已安装。

2. **拥有 GitHub 账号**  
   未注册请前往 https://github.com 注册。

3. **本地项目可正常运行**  
   建议先在本地 `npm run build` 通过后再上传。

---

## 二、在 GitHub 上创建新仓库

1. 登录 GitHub，点击右上角 **“+”** → **“New repository”**。
2. 填写：
   - **Repository name**：例如 `story-to-video-app` 或 `auto-coding-agent-demo`（任选）。
   - **Description**：可选，如「故事转视频 - Next.js + Supabase」。
   - **Public** / **Private**：按需选择。
   - **不要**勾选 “Add a README / .gitignore / License”（本地已有代码）。
3. 点击 **“Create repository”**。  
   创建完成后会看到仓库地址，形如：  
   `https://github.com/你的用户名/仓库名.git`

---

## 三、在本地确认 Git 状态

在**项目根目录**（即包含 `story-to-video-app`、`CLAUDE.md` 的目录）打开终端：

```bash
# 查看是否已是 Git 仓库
git status
```

- **若已是仓库**：会显示当前分支、未提交文件等，直接做第四步。
- **若不是仓库**：执行以下命令初始化并做首次提交：

```bash
git init
git add .
git commit -m "Initial commit: story-to-video app and agent workflow"
```

---

## 四、确认敏感信息不会被提交

**重要**：不要把 `.env.local`、API 密钥等提交到 GitHub。

1. 打开项目根目录下的 **`.gitignore`**，确认包含：

   ```
   .env.local
   .env.*.local
   node_modules/
   .next/
   ```

2. 检查是否曾误提交过密钥：

   ```bash
   git status
   ```

   若列表里出现 `.env.local`，说明它未被忽略，不要 `git add .env.local`。  
   若之前已经提交过 `.env.local`，需要从历史中移除（可搜索「git 删除已提交的敏感文件」按步骤操作）。

---

## 五、添加远程仓库并推送

将下面的 `你的用户名` 和 `仓库名` 换成你在第二步创建的仓库信息。

```bash
# 添加远程仓库（仅需执行一次）
git remote add origin https://github.com/你的用户名/仓库名.git
```

若提示 `origin already exists`，可先查看当前远程：

```bash
git remote -v
```

需要替换时：

```bash
git remote set-url origin https://github.com/你的用户名/仓库名.git
```

然后推送（首次推送并设置上游分支）：

```bash
git branch -M main
git push -u origin main
```

如 GitHub 上默认分支是 `master`，可改为：

```bash
git branch -M master
git push -u origin main
```

按提示输入 GitHub 用户名和密码（或 Personal Access Token）。  
推送成功后，在 GitHub 网页上刷新即可看到全部代码。

---

## 六、之后如何更新到 GitHub

修改代码并提交后，推送到 GitHub：

```bash
git add .
git commit -m "简短描述本次修改"
git push
```

---

## 七、他人如何克隆并运行

别人克隆你的仓库后，需要**自己**配置环境，不会拿到你的 `.env.local`（因为未提交）。可把下面说明放在 README 中或发给对方：

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

## 八、常见问题

| 问题 | 处理 |
|------|------|
| 推送时要求登录 | 使用 GitHub 用户名 + **Personal Access Token**（不再支持账号密码）。在 GitHub → Settings → Developer settings → Personal access tokens 创建。 |
| 推送被拒绝 (rejected) | 若远程已有提交（如建仓时勾选了 README），先执行 `git pull origin main --rebase` 再 `git push`。 |
| 想用 SSH 地址 | 将 `https://github.com/...` 换为 `git@github.com:用户名/仓库名.git`，并配置 SSH 密钥。 |
| 端口 3000 被占用 | 关闭占用端口的程序，或查看终端是否提示改用 http://localhost:3001。 |

---

完成以上步骤后，项目就已成功上传到 GitHub，他人可按 README 与接入说明克隆、配置并运行。
