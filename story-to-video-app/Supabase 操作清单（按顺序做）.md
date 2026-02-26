# Supabase 操作清单（你已登录，按顺序做即可）

每一步都按顺序做，做完一步再点下一步。

---

## 第一步：创建项目（若还没有项目）

1. 在浏览器打开：**https://database.new**  
   （或打开 https://supabase.com/dashboard 后点 **New project**）

2. 如果让你选 **Organization**，选默认或你个人的那个。

3. 填写：
   - **Name**：随便填，例如 `story-video`
   - **Database Password**：自己设一个强密码（**务必记住**，以后改库会用到）
   - **Region**：选离你近的，例如 `East Asia (Tokyo)` 或 `Southeast Asia (Singapore)`

4. 点 **Create new project**，等 1～2 分钟直到项目状态变为绿色（Ready）。

---

## 第二步：拿到 API 地址和密钥

1. 在左侧边栏最下面点 **Project Settings**（齿轮图标）。

2. 在左侧子菜单里点 **API**。

3. 在页面里找到并复制这两个（后面要贴到 `.env.local`）：
   - **Project URL**  
     形如：`https://xxxxxxxxxxxx.supabase.co`
   - **anon public 密钥**（二选一，只填一个即可）：
     - 若有 **Legacy API Keys** 或 **Project API keys** 表格：复制 **anon**、**public** 那一行的 key（通常是一长串以 **eyJ** 开头的 JWT）。
     - **不要**复制 `service_role`，也**不要**复制以 `sb_secret_` 开头的密钥（那是服务端用的，浏览器里用会报 Failed to fetch）。

4. 打开你本地的 **`story-to-video-app/.env.local`**，改成（把下面两行换成你刚复制的）：

   ```env
   NEXT_PUBLIC_SUPABASE_URL=这里粘贴 Project URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY=这里粘贴 anon public key
   ```

5. 保存 `.env.local`。

---

## 第三步：执行数据库迁移（建表）

1. 在 Supabase 左侧点 **SQL Editor**。

2. 点 **New query**（或中间的新建按钮）。

3. 打开你电脑上的这个文件（在项目根目录，不是 story-to-video-app 里）：  
   **`supabase/migrations/001_initial_schema.sql`**  
   用记事本或 VS Code 打开，**全选全部内容**（Ctrl+A），复制。

4. 回到 Supabase 的 SQL Editor，把复制的内容**粘贴**进输入框（会很长，正常）。

5. 点右下角 **Run**（或 Ctrl+Enter）。

6. 若成功：下面会显示 “Success” 或没有报错。  
   若报错：把**完整报错信息**复制下来，发给帮你排查的人（或发给我）。

---

## 第四步：开启邮箱登录

1. 在 Supabase 左侧点 **Authentication**。

2. 再点 **Providers**。

3. 找到 **Email** 这一行，确保是 **Enabled**（开关打开）。

4. 若想本地测试时不用收邮件验证，可把 **Confirm email** 关掉（后面要正式用再打开）。

5. 其他不用改，直接离开即可。

---

## 第五步：重启本地开发服务器

1. 在运行 `npm run dev` 的那个终端里按 **Ctrl+C** 停掉。

2. 在项目里执行：
   ```bash
   cd story-to-video-app
   npm run dev
   ```

3. 浏览器打开 **http://localhost:3000**，点 **注册**，用任意邮箱和密码注册一个账号。

4. 注册成功后用同一账号**登录**，然后点 **创建新项目**，能创建就说明 Supabase 已经配置好。

---

## 遇到问题时

- **SQL 报错**：把 SQL Editor 里红色的完整报错复制下来。
- **登录/注册没反应或报错**：检查 `.env.local` 里 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 是否和 Supabase 里 **Project URL**、**anon public** 完全一致（没有多余空格、没有少复制）。
- **找不到 anon key / 注册或登录报 Failed to fetch**：在 **Project Settings → API** 里，要用 **anon public**（往往是一长串以 **eyJ** 开头）。**不要**用以 `sb_secret_` 开头的密钥，也不要选 **service_role**。

按顺序做完这五步，你的 Supabase 就配置好了，本地的故事转视频应用就可以正常登录和创建项目。
