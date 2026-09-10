# 🚀 Deploying Family Fiesta 2026 with Turso & Vercel

**Turso** is an ultra-fast, serverless database powered by **libSQL (SQLite)** with 100% free tier.

---

## ⚡ Step 1: Create a Turso Database

1. Sign up / log in to [https://turso.tech](https://turso.tech) (or use `turso` CLI).
2. Create a new database:
   - Name: `family-fiesta-2026`
   - Location: Choose closest region (e.g. `BOM - Mumbai, India` or `SIN - Singapore`).
3. Open the **SQL Query Editor** (or run in CLI: `turso db shell family-fiesta-2026`).
4. Copy and paste the entire contents of [`turso_schema.sql`](./turso_schema.sql) and run it!
   - This creates tables (`students`, `menu_items`, `orders`, `device_locks`) and pre-seeds all 124 Gurukul students and 6 menu dishes!
5. In your Turso Dashboard:
   - Copy your **Database URL** (e.g., `https://family-fiesta-2026-yourname.turso.io`).
   - Click **"Generate Token"** (or in CLI: `turso db tokens create family-fiesta-2026`) and copy the **Auth Token**.

---

## ⚡ Step 2: Deploy to Vercel

1. In [https://vercel.com](https://vercel.com), import your repository.
2. Set **Root Directory** to `Rsvp`.
3. In **Environment Variables**, add:
   - `VITE_TURSO_DATABASE_URL`: `https://family-fiesta-2026-yourname.turso.io`
   - `VITE_TURSO_AUTH_TOKEN`: `<your-turso-auth-token>`
4. Click **Deploy**!

---

## 🎉 Done!
Your application will be live globally on Vercel with lightning-fast SQLite operations powered by Turso!
