# BLOW FITNESS SYSTEM — Production Deployment Strategy & Runbook

This document defines the production deployment architecture, security hardening guidelines, automated backup policies, and rollback procedures for the **BLOW Fitness Management System**.

---

## 1. System Architecture Overview

```
                          [ Internet / Gym Front-Desk Clients ]
                                          │
                                          │ HTTPS (Port 443) / HTTP (Port 80)
                                          ▼
                ┌──────────────────────────────────────────────────┐
                │        Reverse Proxy (Caddy / Nginx)             │
                │  - TLS 1.3 Automatic Let's Encrypt Certificate   │
                │  - HSTS, CSP, and Security Headers               │
                │  - Max Upload Size (10MB)                        │
                └─────────────────────────┬────────────────────────┘
                                          │ Reverse Proxy (HTTP 127.0.0.1:3000)
                                          ▼
                ┌──────────────────────────────────────────────────┐
                │      Next.js Application Container (Port 3000)   │
                │  - Node.js 20 Alpine (Standalone Build)          │
                │  - Unprivileged User (nextjs:nodejs)             │
                │  - Healthcheck API (/api/health)                 │
                │  - Persistent Volume: /app/public/uploads        │
                └─────────────────────────┬────────────────────────┘
                                          │ PostgreSQL Protocol (Port 5432)
                                          ▼
                ┌──────────────────────────────────────────────────┐
                │       PostgreSQL 16 Database Container           │
                │  - Alpine Image, Connection Pooling              │
                │  - Bound exclusively to internal network         │
                │  - Persistent Volume: blow_postgres_data         │
                │  - Automated Gzip Dumps (/backups)               │
                └──────────────────────────────────────────────────┘
```

---

## 2. Infrastructure Sizing & Requirements

| Specification | Minimum (Gym Single-Location) | Recommended (Multi-Turnstile / High Traffic) |
|---|---|---|
| **Operating System** | Ubuntu 22.04 / 24.04 LTS | Ubuntu 24.04 LTS / Debian 12 |
| **CPU** | 2 vCPUs | 4 vCPUs |
| **RAM** | 2 GB (with 2GB Swap) | 4 GB - 8 GB |
| **Storage** | 25 GB NVMe SSD | 50 GB - 100 GB NVMe SSD |
| **Network** | Static Public IPv4 | Static Public IPv4 with Cloudflare DNS |

---

## 3. Pre-Deployment Configuration & Secrets

### 3.1 Generate Cryptographic Secrets
Never use development secrets in production. Run the following on the host server:

```bash
# Generate a cryptographically secure 64-character SESSION_SECRET
openssl rand -hex 32

# Generate a secure PostgreSQL database password
openssl rand -base64 24 | tr -d '/+='
```

### 3.2 Environment Variables File
Create `.env.production` on the production server (refer to `.env.production.example`):

```bash
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0

# Public URL (used for QR generation and asset references)
NEXT_PUBLIC_APP_URL=https://gym.blowfitness.et

# Cryptographic Session Secret
SESSION_SECRET=<YOUR_GENERATED_64_CHAR_HEX>

# Database Credentials
POSTGRES_DB=blow_fitness
POSTGRES_USER=blow_admin
POSTGRES_PASSWORD=<YOUR_GENERATED_DB_PASSWORD>

# Complete connection string passed to Next.js container
DATABASE_URL=postgresql://blow_admin:<YOUR_GENERATED_DB_PASSWORD>@db:5432/blow_fitness?schema=public

# Domain for Caddy automatic SSL
DOMAIN_NAME=gym.blowfitness.et
```

---

## 4. Deployment Strategy 1: Docker Compose + Caddy (Recommended)

This strategy provides automated Let's Encrypt SSL certificates, isolated networking, persistent volumes, and zero-effort container lifecycle management.

### Step 1: Install Docker & Docker Compose
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw fail2ban

# Install Docker via official script
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

### Step 2: Configure Server Firewall (UFW)
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh        # Port 22
sudo ufw allow http       # Port 80
sudo ufw allow https      # Port 443
sudo ufw enable
```

### Step 3: Clone Repository & Setup Environment
```bash
cd /opt
git clone https://github.com/KumaTelila/gym-managment-system.git blow-fitness
cd blow-fitness

# Copy and fill production environment variables
cp .env.production.example .env.production
nano .env.production
```

### Step 4: Build & Launch Containers
```bash
# Export environment variables for Docker Compose
set -a && source .env.production && set +a

# Build image and start services in background
docker compose up -d --build
```

### Step 5: Run Production Database Migrations
Always use `prisma migrate deploy` in production. **Never run `prisma db push` or `prisma db seed` in production.**

```bash
docker compose exec app npx prisma migrate deploy
```

### Step 6: Create Production Admin Account
Run the secure production admin initializer to create an administrator with an explicit, secure password:

```bash
docker compose exec app node -e '
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash(process.env.INITIAL_ADMIN_PASSWORD || "SetSecurePassword123!", 12);
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      fullName: "System Administrator",
      passwordHash: hash,
      role: "ADMIN",
      isActive: true
    }
  });
  console.log("Production Admin account ready.");
}
main().finally(() => prisma.$disconnect());
'
```

---

## 5. Deployment Strategy 2: Standalone VPS (PM2 + Nginx)

For deployments without Docker:

```bash
# 1. Install Node.js 20 & PostgreSQL 16
sudo apt install -y postgresql postgresql-contrib nginx certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

# 2. Build Next.js
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build

# 3. Configure PM2 process manager
pm2 start npm --name "blow-fitness" -- run start -- -p 3000
pm2 save
pm2 startup

# 4. Configure Nginx & SSL
sudo cp deploy/nginx.conf /etc/nginx/sites-available/blow-fitness.conf
sudo ln -s /etc/nginx/sites-available/blow-fitness.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo certbot --nginx -d gym.blowfitness.et
```

---

## 6. Automated Daily Backups & Disaster Recovery

### 6.1 Automated Backup Schedule
A production backup script is provided at `deploy/backup-db.sh`. It performs compressed PostgreSQL dumps and automatically deletes archives older than 14 days.

Make the script executable and add to the system crontab:

```bash
chmod +x /opt/blow-fitness/deploy/backup-db.sh
chmod +x /opt/blow-fitness/deploy/restore-db.sh

# Open crontab
sudo crontab -e
```

Add the daily cron job (runs every night at 02:00 AM):
```cron
0 2 * * * /opt/blow-fitness/deploy/backup-db.sh >> /var/log/blow_backup.log 2>&1
```

### 6.2 Disaster Recovery / Restoration Test
To restore the database from a backup file:

```bash
./deploy/restore-db.sh deploy/backups/blow_fitness_backup_20260904_020000.sql.gz
```

---

## 7. Zero-Downtime Update & Rollback Procedures

### 7.1 Standard Application Update Procedure
When deploying new features or bug fixes:

```bash
cd /opt/blow-fitness

# 1. Pull latest verified changes from main branch
git pull origin main

# 2. Run database migrations (if any)
docker compose exec app npx prisma migrate deploy

# 3. Rebuild and restart application container without stopping database
docker compose build app
docker compose up -d --no-deps app

# 4. Verify healthcheck status
curl -i http://localhost:3000/api/health
```

### 7.2 Emergency Rollback Procedure
If a deployment introduces regressions:

```bash
# 1. Roll back code to the previous Git commit / tag
git checkout <PREVIOUS_STABLE_COMMIT_HASH>

# 2. Rebuild container immediately
docker compose build app
docker compose up -d --no-deps app

# 3. If database schema was changed, restore DB from the pre-deploy backup
./deploy/restore-db.sh deploy/backups/latest_pre_deploy.sql.gz
```

---

## 8. Health Monitoring & Observability

The system exposes a live healthcheck endpoint at `/api/health`.

### Verification Command
```bash
curl -s http://localhost:3000/api/health | jq
```

### Expected Response:
```json
{
  "status": "healthy",
  "uptimeSeconds": 7240,
  "timestamp": "2026-09-04T15:10:00.000Z",
  "database": {
    "status": "connected",
    "latencyMs": 4
  },
  "memory": {
    "rssMb": 134,
    "heapUsedMb": 72
  }
}
```

Configure third-party uptime monitoring (e.g. UptimeRobot, BetterStack, or Datadog) to ping `https://gym.blowfitness.et/api/health` every 60 seconds with an alert webhook to gym administrators.
