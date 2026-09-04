# Complete Guide: Deploying BLOW Fitness on Vercel + Neon (100% Free Tier)

This guide walks you through deploying the **BLOW Fitness Management System** on **Vercel (Hobby Tier)** backed by **Neon Serverless PostgreSQL (Free Tier)**.

---

## 1. Why Vercel + Neon? (100% Free Stack)

| Component | Provider | Free Tier Benefits |
|---|---|---|
| **Web Hosting & API** | **Vercel (Hobby)** | Unlimited serverless deployments, automatic HTTPS/SSL, global Edge CDN, zero server maintenance. |
| **PostgreSQL Database** | **Neon (Free Tier)** | 0.5 GB storage, built-in PgBouncer connection pooling, auto-scaling, instant branching, scale-to-zero. |
| **Total Monthly Cost** | — | **$0.00 / month** |

---

## 2. Environment Variables Required on Vercel

You only need **2 main environment variables** on Vercel. All other settings are automated.

| Variable Name | Description | Example / Source |
|---|---|---|
| `DATABASE_URL` | **Neon Pooled Connection String** (contains `-pooler` in hostname). | Copied directly from your local `.env` or the [Neon Console](https://console.neon.tech). |
| `SESSION_SECRET` | Cryptographic secret for signing HMAC session cookies. | A random 64-character hex string (generated via `openssl rand -hex 32`). |
| `NEXT_PUBLIC_APP_URL` | *(Optional)* Your production Vercel domain. | `https://your-app-name.vercel.app` |

> [!IMPORTANT]
> Always use the **pooled** connection URL (`ep-silent-band-a5425cpr-pooler.us-east-2.aws.neon.tech`) for `DATABASE_URL` on Vercel. This allows serverless functions to share connection pools without exceeding PostgreSQL connection limits.

---

## 3. Step-by-Step Deployment Guide

### Step 1: Commit and Push Changes to GitHub

Ensure all your latest changes are committed to the `main` branch:

```bash
git add .
git commit -m "feat: configure Neon Postgres integration and Vercel postinstall"
git push origin main
```

---

### Step 2: Import Project on Vercel

1. Log into your [Vercel Dashboard](https://vercel.com).
2. Click **"Add New..."** → **"Project"**.
3. Under "Import Git Repository", find **`gym-managment-system`** (or `KumaTelila/gym-managment-system`) and click **"Import"**.
4. In the **Configure Project** screen:
   - **Framework Preset:** Next.js (automatically detected)
   - **Root Directory:** `./` (default)
   - **Build Command:** `next build` (default)
   - **Install Command:** `npm install` (default — our `package.json` will automatically run `postinstall: prisma generate`)

---

### Step 3: Add Environment Variables in Vercel

Expand the **"Environment Variables"** section and add:

1. **`DATABASE_URL`**:
   - Paste the pooled connection URL from your local `.env` file (starts with `postgresql://neondb_owner:...@ep-silent-band-a5425cpr-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require`).
2. **`SESSION_SECRET`**:
   - Generate a secure key in your local terminal:
     ```bash
     openssl rand -hex 32
     ```
   - Paste the resulting 64-character string into Vercel.

---

### Step 4: Click "Deploy"

1. Click the blue **"Deploy"** button.
2. Vercel will clone the repository, run `npm install`, execute `prisma generate`, compile the Next.js routes, and deploy the application to a global CDN.
3. Once finished, you will see a preview screenshot and your live URL (e.g. `https://gym-management-system.vercel.app`).

---

## 4. Initializing Production Database & Admin Account

Your Neon database schema is already synchronized via `npx prisma db push`!

To create the initial **Admin** staff member on the live Neon database:

### Option A: Via Local Terminal (Fastest)
Since your local `.env` is already linked to your live Neon database, run this one-line command locally:

```bash
node -e '
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function init() {
  const passwordHash = await bcrypt.hash("admin123", 12);
  const user = await prisma.user.upsert({
    where: { username: "admin" },
    update: { isActive: true },
    create: {
      username: "admin",
      fullName: "Dawit Alemu (Admin)",
      passwordHash: passwordHash,
      role: "ADMIN",
      isActive: true,
    },
  });
  console.log("Admin account ready on Neon database:", user.username);
}
init().catch(console.error).finally(() => prisma.$disconnect());
'
```

### Option B: Run Full Seed Data (Plans, Lockers, Sample Products)
If you want standard gym master data (e.g. Monthly Standard plan, Male/Female locker grid L-01 to L-20, beverages, supplements):

```bash
npx prisma db seed
```

---

## 5. Verification Checklist After Deployment

Once deployed on Vercel:

1. **Visit Live Healthcheck:**
   Open `https://<your-vercel-domain>/api/health` in your browser.
   You should see:
   ```json
   {
     "status": "healthy",
     "database": {
       "status": "connected",
       "latencyMs": 8
     }
   }
   ```
2. **Log into the Terminal:**
   Navigate to `https://<your-vercel-domain>/login` and sign in with the admin credentials.
3. **Verify Features:**
   - **Dashboard:** Confirm KPIs load immediately from Neon Postgres.
   - **Front Desk Check-in:** Test member turnstile scanning and atomic locker allocation.
   - **Reports & All Sales:** Check the All Sales Ledger and Shift Reconciliation tabs.
   - **POS Checkout:** Add items to cart and verify atomic inventory decrement.
