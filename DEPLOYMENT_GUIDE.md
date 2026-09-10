# 🚀 Deploying Family Fiesta 2026 to Vercel & Supabase

Follow this step-by-step guide to deploy your full RSVP application to **Vercel** with a **Supabase PostgreSQL** database in under 3 minutes.

---

## ⚡ Step 1: Set Up Supabase (Free Database)

1. Go to [https://supabase.com](https://supabase.com) and create a free account (or log in).
2. Click **"New Project"**.
   - **Name**: `family-fiesta-2026`
   - **Database Password**: Choose a strong password.
   - **Region**: Choose the closest region (e.g. `South Asia (Mumbai)` or `Singapore`).
   - Click **"Create new project"** (takes ~1-2 minutes).
3. Once created, go to the **SQL Editor** tab on the left sidebar (icon `>_`).
4. Click **"New Query"**, then copy and paste the entire contents of [`supabase_schema.sql`](./supabase_schema.sql) and click **"Run"**.
   - This automatically creates all tables (`students`, `menu_items`, `orders`, `device_locks`), enables security policies, and pre-seeds all 124 Gurukul students and 6 menu dishes!
5. Go to **Project Settings** -> **API** (or **Data API**).
   - Copy your **Project URL** (e.g. `https://abcxyz123.supabase.co`).
   - Copy your **Project API anon / public key** (`anon` `public`).

---

## ⚡ Step 2: Deploy to Vercel (Free Frontend & Hosting)

1. Push this repository to **GitHub** or **GitLab**.
2. Go to [https://vercel.com](https://vercel.com) and click **"Add New..."** -> **"Project"**.
3. Import your repository.
4. Configure the project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `Rsvp` (click Edit and select the `Rsvp` folder).
   - **Build Command**: `npm run build` (or `bun run build`)
   - **Output Directory**: `dist`
5. Expand the **Environment Variables** section and add the two Supabase variables:
   - `VITE_SUPABASE_URL`: `<Your Supabase Project URL>`
   - `VITE_SUPABASE_ANON_KEY`: `<Your Supabase anon/public key>`
6. Click **"Deploy"**!

---

## 🎉 That's It!
- Your application is live globally with SSL on a `*.vercel.app` domain.
- All orders, menu updates, and student registrations are stored permanently in your Supabase PostgreSQL database.
- Refreshing the browser preserves all orders and student submissions.
