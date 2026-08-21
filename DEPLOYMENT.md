# DEPLOYMENT.md — Deploy SecureScan for free (Neon + Render)

This guide deploys the whole service at $0 with **no credit card**:

| Piece | Where | Free tier |
|---|---|---|
| PostgreSQL | **Neon** (neon.tech) | Permanent free tier, ~0.5 GB storage, compute suspends when idle |
| NestJS backend | **Render** (render.com) — Web Service | 750 hrs/month, 512 MB RAM; **sleeps after ~15 min idle, wakes in 30–50 s** |
| Angular frontend | **Render** — Static Site | Free static hosting with HTTPS |

Known free-tier behavior: the first request after inactivity is slow (backend cold start + database wake-up). That's normal and fine for a demo. Limits change over time — verify on render.com/pricing and neon.tech/pricing.

Prerequisite: your project is pushed to GitHub (see the git guide) and runs locally.

---

## Part 0 — Two small code changes (do this first)

The app currently hardcodes `localhost` addresses. Make it configurable:

### 0.1 Backend: allow your future frontend URL (CORS)

In **`backend/src/main.ts`**, replace the `enableCors` line:

```ts
// before:
app.enableCors({ origin: ['http://localhost:4200'], credentials: true });

// after:
app.enableCors({
  origin: [ 'http://localhost:4200', process.env.FRONTEND_ORIGIN || '' ].filter(Boolean),
  credentials: true,
});
```

### 0.2 Frontend: one place for the API address

Create **`frontend/src/app/core/api-base.ts`**:

```ts
// Base URL of the backend API.
// For local development keep localhost; for production put your Render backend URL.
export const API_BASE = 'http://localhost:3000/api';
```

Then use it in the two files that hardcode the URL:

- **`frontend/src/app/core/api.service.ts`** — delete the line `const API = 'http://localhost:3000/api';` and instead import it:
  ```ts
  import { API_BASE } from './api-base';
  const API = API_BASE;
  ```
- **`frontend/src/app/core/auth.service.ts`** — add `import { API_BASE } from './api-base';` and change the login call to:
  ```ts
  .post<LoginResponse>(`${API_BASE}/auth/login`, { username, password })
  ```

Verify locally (`npm start` still works, login still works), then commit and push:

```bash
git add .
git commit -m "Make API URL and CORS configurable for deployment"
git push
```

---

## Part 1 — Create the free database on Neon

1. Go to **https://neon.tech** → Sign up (GitHub login is easiest). No credit card needed.
2. Create a project: name `securescan`, PostgreSQL 16+, pick the region closest to you (remember it — use the same region on Render later).
3. On the project dashboard, find **Connection string** (sometimes under "Connect"). Choose **Prisma** if a dropdown is offered, and make sure **Pooled connection** is selected. Copy the URL — it looks like:
   ```
   postgresql://user:password@ep-xxxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
4. Save it somewhere safe — this is your production `DATABASE_URL`. (Never commit it to GitHub.)

---

## Part 2 — Deploy the backend on Render

1. Go to **https://render.com** → Sign up with GitHub. No credit card needed.
2. Click **New → Web Service** and select your `securescan` GitHub repository (grant access when asked).
3. Fill in the settings:
   - **Name:** `securescan-api` (your URL becomes `https://securescan-api.onrender.com`)
   - **Region:** same as your Neon database
   - **Root Directory:** `backend`  ← important, the repo is a monorepo
   - **Runtime:** Node
   - **Build Command:**
     ```
     npm install && npx prisma generate && npm run build && npx prisma db push && npm run seed
     ```
   - **Start Command:**
     ```
     node dist/main.js
     ```
   - **Instance Type:** **Free**
4. Under **Environment Variables**, add:
   - `DATABASE_URL` → the Neon connection string from Part 1
   - `JWT_SECRET` → any long random string
   - `FRONTEND_ORIGIN` → leave empty for now (you'll fill it in Part 3, step 4)
   - `OPENAI_API_KEY` → your key, or leave empty for demo mode
   - `OPENAI_MODEL` → `gpt-4o-mini`
   - (Don't set `PORT` — Render sets it automatically and the app reads it.)
5. Click **Create Web Service** and watch the log. First deploy takes a few minutes. Success looks like `SecureScan backend running on http://localhost:10000` and the service shows **Live**.
6. **Verify:** open `https://YOUR-SERVICE.onrender.com/api/docs` — the Swagger page should load (after a possible cold-start wait).
7. **Important — remove the seed from the build command now.** The seed script *wipes and recreates* all data, so it must run only once. Go to Settings → Build Command and change it to:
   ```
   npm install && npx prisma generate && npm run build && npx prisma db push
   ```
   (We use `prisma db push` instead of `migrate deploy` because the migrations folder isn't in the repo; `db push` syncs the schema directly and is fine for a demo. If you later commit a `prisma/migrations` folder, switch to `npx prisma migrate deploy`.)

---

## Part 3 — Deploy the frontend on Render

1. First, point the frontend at the live backend. Edit **`frontend/src/app/core/api-base.ts`**:
   ```ts
   export const API_BASE = 'https://YOUR-SERVICE.onrender.com/api';
   ```
   (Use your real backend URL from Part 2. For local development you can switch it back, or keep two lines and comment one out.) Commit and push.
2. In Render: **New → Static Site**, pick the same repository.
   - **Name:** `securescan-app`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npx ng build`
   - **Publish Directory:** `dist/securescan/browser`
3. Under **Redirects/Rewrites** (Settings → Redirects/Rewrites), add one rule so Angular routing works on page refresh:
   - Source: `/*`  → Destination: `/index.html` → Action: **Rewrite**
4. Click **Create Static Site**. When it's live you get a URL like `https://securescan-app.onrender.com`.
5. Go back to the **backend** service → Environment → set `FRONTEND_ORIGIN` to that exact URL (no trailing slash), e.g. `https://securescan-app.onrender.com`, and save. Render redeploys the backend automatically.

---

## Part 4 — Verify end to end

1. Open your frontend URL. The **first load may take up to a minute** while the free backend wakes up — be patient.
2. Log in with `admin` / `admin`.
3. Check the dashboard shows seeded data, open a project, start a SAST scan and watch it complete, change a finding's status, and try the AI chat ("list projects" works even without an OpenAI key).
4. Auto-deploys are now on: every `git push` to `main` rebuilds both services.

---

## Troubleshooting

- **Frontend loads but login fails / network errors:** open the browser dev tools (F12 → Console). If you see CORS errors, `FRONTEND_ORIGIN` on the backend doesn't exactly match your frontend URL (check https vs http, no trailing slash). If you see requests going to `localhost:3000`, you forgot to update `api-base.ts` before the frontend build.
- **Backend deploy fails with a Prisma/database error (P1001):** the `DATABASE_URL` is wrong — re-copy the pooled connection string from Neon, including `?sslmode=require`.
- **"relation does not exist" errors:** the schema wasn't pushed — make sure the build command contains `npx prisma db push`, then Manual Deploy → Deploy latest commit.
- **Empty app (no projects, login fails):** the seed never ran. Temporarily add `&& npm run seed` back to the build command, deploy once, then remove it again.
- **Everything is very slow on first click:** that's the free-tier cold start (backend sleep + Neon suspend). Subsequent requests are fast.
- **AI chat says the key is invalid:** fix `OPENAI_API_KEY` in the backend service's Environment tab (no quotes needed in Render's UI) — Render restarts the service automatically.

## Free-tier fine print

- Render free web services get 750 instance hours/month and sleep after inactivity; static sites are free with a bandwidth cap.
- Neon's free tier suspends compute when idle and caps storage (~0.5 GB) and monthly compute hours — plenty for this demo.
- Neither requires a credit card. If the demo ever needs to be always-on, the cheapest upgrade is Render's paid instance; everything else stays as is.
