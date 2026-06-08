# Message Board — Free, Serverless, 24/7

Public form → Supabase (DB + Storage) → Vercel hosting. Works while your laptop is off.

## Project Structure
```
fun/
├── index.html      # Public submission form
├── admin.html      # Private dashboard (visit /admin)
├── app.js          # Supabase client logic
├── supabase-setup.sql  # Run once in Supabase SQL Editor
├── vercel.json     # Vercel deployment config
└── README.md       # This file
```

---

## One-Time Setup (5–10 minutes)

### 1. Create Supabase Project
1. Go to <https://supabase.com> → Sign up (free, GitHub/Google/email)
2. **New Project** → Name it (e.g., `message-board`) → Pick region near you → **Create**
3. Wait ~2 minutes for provisioning

### 2. Run Database Setup
1. In Supabase dashboard: **SQL Editor** → **New Query**
2. Copy entire contents of `supabase-setup.sql` → Paste → **Run**
3. Should show "Success. No rows returned" — tables + bucket + policies created

### 3. Get API Keys
1. **Settings** (gear icon) → **API**
2. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`

### 4. Deploy to Vercel
1. Push this folder to a **GitHub repo** (create new repo → `git init` → `git add .` → `git commit` → `git push`)
2. Go to <https://vercel.com> → Sign up with GitHub
3. **Add New Project** → Import your repo → **Deploy**
4. After deploy: **Settings** → **Environment Variables** → Add:
   - `SUPABASE_URL` = your Project URL
   - `SUPABASE_ANON_KEY` = your anon key
5. **Redeploy** (Deployments → three dots → Redeploy) so env vars take effect

### 5. Test
- Visit your Vercel URL → Submit a test message with images
- Visit `your-vercel-url.vercel.app/admin` → See the dashboard

---

## What You Get

| Feature | Details |
|---------|---------|
| **Public form** | Name, message, up to 3 images (5MB each, JPEG/PNG/WebP/GIF) |
| **Admin dashboard** | `/admin` — all messages, image previews, click to enlarge |
| **Export** | One-click JSON download of all messages |
| **Clear all** | Delete everything (messages + images) with confirmation |
| **Persistent** | Survives reboots, works 24/7, free tier covers ~10k messages + 1GB images |
| **HTTPS** | Automatic via Vercel |

---

## Customization

### Change max images / file size
Edit `app.js`:
```js
if (selectedFiles.length >= 3) { alert('Maximum 3 images'); return; }
if (file.size > 5 * 1024 * 1024) { alert('File too large (max 5MB)'); return; }
```
Also update `supabase-setup.sql` bucket `file_size_limit` (in bytes).

### Restrict admin access
Currently `/admin` is public. To protect:
1. Supabase Auth → Enable Email or GitHub provider
2. Update `app.js` admin init: check `supabase.auth.getSession()`
3. Or add Vercel Password Protection (Pro feature)

### Custom domain
Vercel → Project → Settings → Domains → Add your domain (free).

---

## Free Tier Limits (Generous)

| Resource | Limit |
|----------|-------|
| Database | 500 MB |
| File Storage | 1 GB |
| Bandwidth | 2 GB/month |
| Vercel Bandwidth | 100 GB/month |
| Functions | Unlimited (not used) |

At ~50 KB/message + 500 KB/image, you get ~10,000 messages or ~2,000 image-heavy submissions/month.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Failed to send" | Check browser console (F12) → Network tab → verify Supabase URL/key in env vars |
| Images don't show | Storage bucket must be **public** (SQL sets this); check bucket policies |
| CORS errors | Supabase allows all origins by default for anon key |
| Vercel build fails | Ensure `vercel.json` has `"framework": null` (static site) |
| Admin shows "Loading..." forever | Check browser console; usually missing env vars or SQL not run |

---

## Files to Give Me (After You Create Supabase)

Once you have the project, give me:
1. `SUPABASE_URL` (looks like `https://xxxxx.supabase.co`)
2. `SUPABASE_ANON_KEY` (long JWT starting with `eyJ...`)

I'll update `app.js` with the real values so you don't have to edit code.

---

## Local Testing (Optional)

```bash
cd C:\Users\pc\Desktop\fun
npx serve .
# Opens http://localhost:3000
```
Create a `.env` file (not committed):
```
SUPABASE_URL=your_url
SUPABASE_ANON_KEY=your_key
```
And temporarily modify `app.js` to read from `import.meta.env` (Vite) or use a tiny dev server. But easiest: just deploy to Vercel and test there — it's free and instant.