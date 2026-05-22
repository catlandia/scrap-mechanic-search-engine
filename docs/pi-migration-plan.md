# Pi Migration — Execution Plan

Companion to [pi-migration.md](pi-migration.md) (which is the shopping list).
This file is the **step-by-step plan** for actually doing the migration once
hardware arrives. Written 2026-05-22 so future-you has a thread to pull
without needing to re-derive everything from memory.

**Goal:** Pi 5 hosts a near-current Postgres replica of the live Neon DB.
When Neon 402s (compute quota exhausted), the app falls back to reading
from the Pi and shows a "read-only mode" banner. When Neon recovers, the
app silently returns to using it. This is **Option C** from the design
discussion (Pi as read-only fallback, Neon stays primary).

---

## Phase ordering & dependency map

```
Phase 0  ──┐
           │
Phase 1   │ (needs hardware)
   ↓      │
Phase 2 ──┤ (needs Pi running)
   ↓      │
Phase 3   │ (needs Pi + Neon both up)
           │
Phase 4 ──┤ (CODE — can be done in parallel with 1/2/3)
   ↓      │
Phase 5   │ (needs Pi reachable from public internet)
   ↓      │
Phase 6   │ (needs Pi DB working)
   ↓      │
Phase 7   │ (needs everything)
```

Phase 4 is **code-only** and can be done now without any hardware. It's the
biggest unblocked piece. Phase 0 has small things you can also start now.

---

## Phase 0 — Things you can do BEFORE hardware arrives

### 0.1 — Capture Neon's Postgres major version

You need the Pi's Postgres to match Neon's major version, or `pg_dump`
restores will be unreliable. Run when Neon has quota:

```bash
psql "$DATABASE_URL" -c "SHOW server_version;"
```

Note the major version (e.g. `15.x` or `16.x`). Write it here when you find it:
**Neon Postgres version: ________** (fill in)

### 0.2 — Capture the current schema for reference

```bash
pg_dump "$DATABASE_URL" --schema-only --no-owner --no-acl > schema-snapshot-2026-05-22.sql
```

Keep this file (don't commit — it's not the source of truth, `lib/db/schema.ts` is).
Useful for sanity-checking that the Pi restore matches.

### 0.3 — Decide and reserve the Pi's hostname / static IP / tunnel name

Before you have the Pi up, decide:
- LAN hostname (e.g. `smse-db.local` via mDNS/avahi)
- LAN static IP (reserve in your router's DHCP, e.g. `192.168.1.50`)
- Public tunnel subdomain (e.g. `db-fallback.scrapmechanic-search.example`)
  — once Cloudflare Tunnel is set up in Phase 5, this is the hostname Vercel
  will connect to.

### 0.4 — Cloudflare account check

- Confirm the site's domain is on Cloudflare DNS (move it if not — Cloudflare
  Registrar transfer is at-cost).
- Make sure you can log into the Cloudflare dashboard.
- No tunnel setup yet — that's Phase 5.

### 0.5 — Cloudflare R2 bucket for backups (free 10GB)

You can do this now even without the Pi:
1. Cloudflare dashboard → R2 → Create bucket.
2. Name it something like `smse-pi-backups`.
3. Generate an R2 API token with write access to just that bucket.
4. Save the credentials in a password manager — you'll need them in Phase 6.

---

## Phase 1 — Physical Pi setup (needs hardware)

### 1.1 — OS install

Use **Raspberry Pi OS Lite (64-bit, Bookworm or newer)**. No desktop —
this is a headless server. Use Raspberry Pi Imager on your PC to flash the SD:

- In Imager, click the gear icon (advanced options) BEFORE writing:
  - Set hostname (matches what you reserved in Phase 0.3)
  - Enable SSH (with password OR your SSH key — key is better)
  - Set locale + timezone
  - Configure Wi-Fi if not using ethernet (ethernet is preferred for 24/7)

Boot the Pi, SSH in.

### 1.2 — Update + base packages

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y vim git ufw fail2ban htop
```

### 1.3 — Install the NVMe HAT + drive

Power off. Install HAT physically (PCIe ribbon, standoffs, screw drive in).
Power on. Verify drive is detected:

```bash
lsblk            # should show nvme0n1
sudo fdisk -l /dev/nvme0n1   # confirms drive size
```

If `nvme0n1` doesn't appear, you may need to enable PCIe in
`/boot/firmware/config.txt`:
```
dtparam=pciex1
# optionally for Gen 3 speed (unofficial but stable on most setups):
dtparam=pciex1_gen=3
```
Reboot, re-check `lsblk`.

### 1.4 — Format + mount the NVMe

```bash
# WARNING: this wipes the drive. Confirm /dev/nvme0n1 is correct first.
sudo parted /dev/nvme0n1 mklabel gpt
sudo parted /dev/nvme0n1 mkpart primary ext4 0% 100%
sudo mkfs.ext4 /dev/nvme0n1p1

sudo mkdir -p /mnt/ssd
echo "/dev/nvme0n1p1  /mnt/ssd  ext4  defaults,noatime  0  2" | sudo tee -a /etc/fstab
sudo mount -a

df -h /mnt/ssd   # confirm mounted, size matches
```

`noatime` is intentional — it stops the kernel from writing an
access-time stamp on every file read, which would burn SSD writes for no
reason.

### 1.5 — Install Postgres (matching Neon's major version)

Add the official Postgres apt repo for version pinning (the default Bookworm
package is older than what Neon runs):

```bash
sudo apt install -y curl ca-certificates
sudo install -d /usr/share/postgresql-common/pgdg
sudo curl -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc \
  --fail https://www.postgresql.org/media/keys/ACCC4CF8.asc
sudo sh -c 'echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
sudo apt update
sudo apt install -y postgresql-<NEON_MAJOR>    # e.g. postgresql-16
```

### 1.6 — Move Postgres data dir to NVMe

Postgres on Debian defaults to `/var/lib/postgresql/<version>/main`. That's
on the SD card. Move it to the NVMe:

```bash
sudo systemctl stop postgresql
sudo rsync -av /var/lib/postgresql/ /mnt/ssd/postgresql/
sudo mv /var/lib/postgresql /var/lib/postgresql.old   # keep as fallback
sudo ln -s /mnt/ssd/postgresql /var/lib/postgresql
sudo chown -R postgres:postgres /mnt/ssd/postgresql
sudo systemctl start postgresql
sudo systemctl status postgresql   # should be active (running)
```

(Symlink approach keeps the Debian init scripts happy without editing config.)

### 1.7 — Create the DB user + database for the app

```bash
sudo -u postgres psql <<EOF
CREATE USER smse_app WITH PASSWORD '<generate-a-strong-one>';
CREATE DATABASE smse OWNER smse_app;
EOF
```

Save the password — Vercel will need it in Phase 4. Store in a password manager,
not in any file in the repo.

### 1.8 — Local LAN-only connectivity first

Edit `/etc/postgresql/<version>/main/postgresql.conf`:
```
listen_addresses = '*'
```

Edit `/etc/postgresql/<version>/main/pg_hba.conf` — add a line allowing
your LAN subnet (NOT 0.0.0.0/0):
```
host    smse    smse_app    192.168.1.0/24    scram-sha-256
```

Then:
```bash
sudo systemctl restart postgresql
```

From your PC on the same LAN:
```bash
psql "postgres://smse_app:<password>@<pi-static-ip>:5432/smse"
```

Should connect and drop you at the `smse=>` prompt. **Stop here until this
works.** Don't open the Pi to the public internet until LAN works.

---

## Phase 2 — Initial data load (Neon → Pi)

When Neon has quota:

### 2.1 — Dump Neon

```bash
pg_dump "$DATABASE_URL" \
  --no-owner --no-acl \
  --format=custom \
  --file=neon-dump-2026-XX-XX.dump
```

Use `--format=custom` (the `.dump` binary format) — it's smaller and faster
to restore than plain SQL.

### 2.2 — Copy to Pi

```bash
scp neon-dump-2026-XX-XX.dump pi@<pi-ip>:/mnt/ssd/
```

### 2.3 — Restore

On the Pi:
```bash
pg_restore --dbname=smse --no-owner --no-acl --jobs=2 \
  /mnt/ssd/neon-dump-2026-XX-XX.dump
```

### 2.4 — Verify

Spot-check row counts match:

```bash
# On Neon
psql "$DATABASE_URL" -c "SELECT count(*) FROM creations;"
psql "$DATABASE_URL" -c "SELECT count(*) FROM users;"

# On Pi (from your PC over LAN)
psql "postgres://smse_app:<password>@<pi-ip>:5432/smse" -c "SELECT count(*) FROM creations;"
psql "postgres://smse_app:<password>@<pi-ip>:5432/smse" -c "SELECT count(*) FROM users;"
```

Numbers should match. Spot-check a recent creation's content too.

### 2.5 — Verify the generated `search_vector` column survives the restore

`creations.search_vector` is a generated-stored tsvector column (per
`lib/db/schema.ts`). Postgres should re-materialise it on restore, but
verify:

```sql
SELECT id, length(search_vector::text) FROM creations LIMIT 5;
```

Non-null/non-zero lengths confirm it's populated.

---

## Phase 3 — Ongoing sync (Neon → Pi)

Goal: keep the Pi within ~24h of Neon, so when Neon goes down the fallback
has fresh data.

### 3.1 — Nightly dump cron on the Pi

The Pi pulls from Neon (so this doesn't run when Vercel is broken).

`/usr/local/bin/sync-from-neon.sh`:
```bash
#!/bin/bash
set -euo pipefail

NEON_URL="<DATABASE_URL from Vercel — store in /etc/smse/neon.env, mode 0600>"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DUMP="/mnt/ssd/sync/neon-$TIMESTAMP.dump"
LOG="/var/log/smse-sync.log"

mkdir -p /mnt/ssd/sync
echo "[$TIMESTAMP] Starting Neon dump" >> $LOG

if pg_dump "$NEON_URL" --no-owner --no-acl --format=custom --file="$DUMP" 2>>$LOG; then
  # Restore into a staging DB, then atomically swap
  sudo -u postgres dropdb --if-exists smse_staging
  sudo -u postgres createdb smse_staging --owner=smse_app
  pg_restore --dbname=smse_staging --no-owner --no-acl --jobs=2 "$DUMP" >>$LOG 2>&1

  # Atomic swap: rename smse → smse_old, smse_staging → smse, drop smse_old
  sudo -u postgres psql <<SQL
    SELECT pg_terminate_backend(pid) FROM pg_stat_activity
      WHERE datname IN ('smse', 'smse_old') AND pid != pg_backend_pid();
    ALTER DATABASE smse RENAME TO smse_old;
    ALTER DATABASE smse_staging RENAME TO smse;
    DROP DATABASE smse_old;
SQL

  # Keep only last 7 dumps
  ls -1t /mnt/ssd/sync/neon-*.dump | tail -n +8 | xargs -r rm

  echo "[$TIMESTAMP] OK" >> $LOG
else
  echo "[$TIMESTAMP] DUMP FAILED — Neon likely 402; keeping previous Pi data" >> $LOG
fi
```

Make executable, then cron it:
```bash
sudo chmod +x /usr/local/bin/sync-from-neon.sh
sudo crontab -e
# Add:
0 3 * * * /usr/local/bin/sync-from-neon.sh
```

3am local time picks a low-traffic window. The atomic-swap trick means
visitors hitting the Pi during sync never see a half-loaded DB — they keep
hitting the previous version until the swap completes.

### 3.2 — Sync health check

The app needs to know when the Pi's data is stale. Add a small table:

```sql
CREATE TABLE IF NOT EXISTS sync_metadata (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_sync_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO sync_metadata (id) VALUES (1) ON CONFLICT DO NOTHING;
```

The sync script writes `UPDATE sync_metadata SET last_sync_at = now()` at
the end of a successful restore. The fallback banner can read this and show
"data is X hours old" to visitors.

---

## Phase 4 — Code changes for fallback (CODE-ONLY, do this now)

This is the biggest piece of unblocked work. Can be done now and tested with
a local Postgres fallback before the Pi exists.

### 4.1 — Add env vars

`.env.example` additions:
```
# Fallback DB pointed at the Pi (via Cloudflare Tunnel — Phase 5)
# When DATABASE_URL is unreachable, the app falls back to this.
# Leave unset to disable fallback.
FALLBACK_DATABASE_URL=

# When the app is reading from the fallback, writes are blocked.
# This env var doesn't need to be set manually — it's derived at runtime.
```

### 4.2 — Refactor `lib/db/client.ts`

Current state (per `CLAUDE.md`): exports a lazy `neon-http` Drizzle client
against `DATABASE_URL`. Needs to become:

1. Two clients: `primaryDb` (Neon, neon-http) and `fallbackDb` (Pi, regular
   `node-postgres` since the Pi accepts standard TCP).
2. A `getActiveDb()` helper that:
   - Tries primary first.
   - On connection failure OR a 402/quota error from Neon, switches to fallback
     for a TTL window (e.g. 60s) before retrying primary.
   - Sets a runtime flag `db.readOnly = true` when on fallback.
3. Export `getActiveDb` instead of the raw client. All callers in
   `lib/db/queries.ts` and `app/admin/actions.ts` use it.

Sketch:

```typescript
// lib/db/client.ts
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { neon } from "@neondatabase/serverless";
import { Pool } from "pg";
import * as schema from "./schema";

let primary: ReturnType<typeof drizzleNeon> | null = null;
let fallback: ReturnType<typeof drizzlePg> | null = null;

function getPrimary() {
  if (!primary && process.env.DATABASE_URL) {
    primary = drizzleNeon(neon(process.env.DATABASE_URL), { schema });
  }
  return primary;
}

function getFallback() {
  if (!fallback && process.env.FALLBACK_DATABASE_URL) {
    const pool = new Pool({ connectionString: process.env.FALLBACK_DATABASE_URL });
    fallback = drizzlePg(pool, { schema });
  }
  return fallback;
}

// In-memory state — survives only as long as the function instance does.
// Vercel's Fluid Compute reuses instances, so this caches across requests.
let lastPrimaryFailure = 0;
const FALLBACK_COOLDOWN_MS = 60_000;

export async function getActiveDb(): Promise<{
  db: ReturnType<typeof drizzleNeon> | ReturnType<typeof drizzlePg>;
  readOnly: boolean;
  source: "primary" | "fallback";
}> {
  // If we're in cooldown after a primary failure, go straight to fallback.
  if (Date.now() - lastPrimaryFailure < FALLBACK_COOLDOWN_MS) {
    const fb = getFallback();
    if (fb) return { db: fb, readOnly: true, source: "fallback" };
  }

  const p = getPrimary();
  if (p) {
    try {
      // Cheap ping. If Neon is 402'd, this throws.
      await p.execute("SELECT 1");
      return { db: p, readOnly: false, source: "primary" };
    } catch (err) {
      console.error("[db] primary failed, falling back", err);
      lastPrimaryFailure = Date.now();
    }
  }

  const fb = getFallback();
  if (fb) return { db: fb, readOnly: true, source: "fallback" };

  throw new Error("Both primary and fallback DBs unavailable");
}
```

### 4.3 — Block writes when on fallback

Every server action and admin mutation in `app/admin/actions.ts`,
`lib/community/actions.ts`, etc. needs an early guard:

```typescript
const { readOnly } = await getActiveDb();
if (readOnly) {
  return { ok: false, error: "Site is in read-only mode — try again later" };
}
```

Or wrap in a `assertWriteable()` helper to DRY it up.

Cron endpoints (`/api/cron/ingest`, `/api/cron/refresh`) should also abort
when in fallback mode — don't try to write to a fallback DB that just gets
overwritten on next sync anyway.

### 4.4 — Read-only mode banner

New component `components/ReadOnlyBanner.tsx`. Server-renders. Reads
`getActiveDb()`'s source flag (or a simpler signal via a server function).
When fallback is active, shows an amber bar in `app/layout.tsx` saying
something like:

> "The site is in **read-only mode** — primary database is temporarily
> unavailable. Browsing works; voting, comments, and submissions will
> resume once the primary DB is back. Last data sync: 6 hours ago."

The "last sync" timestamp comes from the `sync_metadata` table (Phase 3.2).

Style it similar to the existing `<ClaudeOutageBanner>` in `app/layout.tsx`
— same pattern, different reason.

### 4.5 — Local testing without a Pi

You can test the whole fallback flow locally:
1. Spin up local Postgres in Docker: `docker run -p 5433:5432 -e POSTGRES_PASSWORD=test postgres:16`
2. Restore a Neon dump into it.
3. Set `FALLBACK_DATABASE_URL=postgres://postgres:test@localhost:5433/postgres` in `.env.local`.
4. Run the app, then break the primary by setting `DATABASE_URL` to a bad URL.
5. Confirm the banner appears, browse works, writes are blocked.

---

## Phase 5 — Cloudflare Tunnel (public exposure)

Goal: Vercel can reach `db-fallback.scrapmechanic-search.example` and that
resolves to the Pi's Postgres, without opening any port on your home router.

### 5.1 — Install cloudflared

```bash
# On the Pi
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb
cloudflared --version
```

### 5.2 — Auth + create tunnel

```bash
cloudflared tunnel login
# Opens a URL — visit it on your PC, pick the domain, click Authorize.

cloudflared tunnel create smse-db
# Outputs a tunnel UUID — save it.
```

### 5.3 — Tunnel config

`/etc/cloudflared/config.yml`:
```yaml
tunnel: <tunnel-uuid>
credentials-file: /home/<user>/.cloudflared/<tunnel-uuid>.json

ingress:
  - hostname: db-fallback.scrapmechanic-search.example
    service: tcp://localhost:5432
  - service: http_status:404
```

### 5.4 — DNS route

```bash
cloudflared tunnel route dns smse-db db-fallback.scrapmechanic-search.example
```

### 5.5 — Run as service

```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
sudo systemctl status cloudflared
```

### 5.6 — Connect from Vercel side

Postgres-over-Cloudflare-Tunnel uses Cloudflare Access Service Tokens.
Vercel's `node-postgres` client needs to tunnel through cloudflared too.

The simpler alternative (recommended): use Cloudflare's **TCP-over-HTTPS**
mode and set:
```
FALLBACK_DATABASE_URL=postgres://smse_app:<password>@db-fallback.scrapmechanic-search.example:5432/smse?sslmode=require
```
…and configure the tunnel as a **public hostname with TCP service**.

NOTE: Cloudflare's free tier supports TCP tunnels but the client side
(Vercel) needs to dial through cloudflared. Read the current Cloudflare
docs for "TCP tunnels from Workers/Functions" before committing to this
approach — the API may have changed by the time you're doing this.

Alternative if Cloudflare Tunnel TCP turns out painful: use a **WireGuard
mesh** (Tailscale free plan) between Vercel and the Pi. Vercel doesn't
support Tailscale natively, so this would mean running a tiny proxy on
Cloudflare Workers that forwards Postgres traffic. More moving parts but
documented patterns exist.

### 5.7 — Lock down the Pi side

Once the tunnel is the only public access path:
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow from 192.168.1.0/24 to any port 22         # SSH from LAN
sudo ufw allow from 192.168.1.0/24 to any port 5432       # Postgres from LAN
# No `ufw allow` for 5432 from the public internet — Cloudflared accesses
# Postgres via localhost, which doesn't go through ufw.
sudo ufw enable
```

---

## Phase 6 — Backups (Pi → off-Pi)

The Pi is now serving as a fallback. But the Pi itself can die. Back it up.

### 6.1 — Install rclone (for R2)

```bash
sudo apt install -y rclone
rclone config
# Add a new remote: type = s3, provider = Cloudflare, key + secret from Phase 0.5
```

### 6.2 — Nightly backup script

`/usr/local/bin/backup-to-r2.sh`:
```bash
#!/bin/bash
set -euo pipefail

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DUMP="/tmp/pi-backup-$TIMESTAMP.dump"

sudo -u postgres pg_dump smse --format=custom --file="$DUMP"
rclone copy "$DUMP" r2:smse-pi-backups/
rm "$DUMP"

# Retain 14 daily backups, then weekly for 3 months
rclone delete r2:smse-pi-backups/ --min-age 90d
```

```bash
sudo chmod +x /usr/local/bin/backup-to-r2.sh
sudo crontab -e
# Add:
30 3 * * * /usr/local/bin/backup-to-r2.sh
```

(30 min after Phase 3's sync — order: Neon→Pi at 3am, then Pi→R2 at 3:30am.
So R2 always has yesterday's Neon data even if the Pi dies tonight.)

### 6.3 — Test restore

Before you trust the backup, restore one to a scratch DB and verify:
```bash
rclone copy r2:smse-pi-backups/pi-backup-<latest>.dump /tmp/
sudo -u postgres createdb smse_restore_test
pg_restore --dbname=smse_restore_test /tmp/pi-backup-<latest>.dump
sudo -u postgres psql smse_restore_test -c "SELECT count(*) FROM creations;"
sudo -u postgres dropdb smse_restore_test
```

If this works once, you can trust the backup loop. If you never test the
restore, you have a backup loop but no actual backup.

---

## Phase 7 — Cutover + verification

### 7.1 — Deploy the Phase 4 code

Once Phase 4 is on `main` and deployed to Vercel:
- `FALLBACK_DATABASE_URL` is set on Vercel pointing at the tunnel.
- Site behaves identically as long as Neon is healthy.

### 7.2 — Force a fallback test

You need to actually trigger fallback to know it works. Easiest way:
temporarily set `DATABASE_URL` on Vercel to a deliberately-bad URL
(point at a non-existent Neon project for ~2 minutes). The next page
load should:
- Try primary, fail.
- Switch to fallback.
- Render the page (data from Pi).
- Show the read-only banner.

Restore the real `DATABASE_URL`. Wait 60s (cooldown). Confirm the banner
disappears on next page load.

### 7.3 — Document the failure modes

After cutover, add a short "what to do when X" section to `docs/deployment.md`
or `docs/database.md`:
- Pi tunnel goes down → primary still works, fallback unavailable → site is
  back to current state (Neon-only). Not catastrophic.
- Neon 402s, Pi works → app switches to read-only mode automatically.
- Neon 402s AND Pi unreachable → site goes down. Same as today, no worse.
- Pi disk dies → restore from R2 backup onto new drive.

---

## Code-only work you can start RIGHT NOW (no hardware)

Ordered by what's most useful first:

1. **Phase 4.5** — Spin up local Postgres in Docker, set `FALLBACK_DATABASE_URL`
   pointing at it, and write the `getActiveDb()` helper from Phase 4.2. Test
   that swapping DBs works via a bad `DATABASE_URL`.

2. **Phase 4.3** — Add `assertWriteable()` and wire it into every write path.
   Grep for `db.insert`, `db.update`, `db.delete` in `app/`, `lib/community/`,
   `lib/admin/`, `lib/suggestions/`, and `lib/db/queries.ts` to find them all.

3. **Phase 4.4** — Build `<ReadOnlyBanner />` modeled on `<ClaudeOutageBanner>`.

4. **Phase 0.1, 0.2, 0.3, 0.4, 0.5** — small chores; do these whenever Neon
   has quota or you have 10 minutes.

When the hardware lands, you'll already have the app-side work done — the
Pi setup becomes a 2-3 evening task to install OS, mount the drive, install
Postgres, restore a dump, and wire up the tunnel.

---

## Things that could go wrong, and what to do

| Symptom | Likely cause | Fix |
|---|---|---|
| `nvme0n1` doesn't show up in `lsblk` | PCIe not enabled in config.txt | Add `dtparam=pciex1`, reboot |
| Postgres won't start after data dir move | Wrong ownership on `/mnt/ssd/postgresql` | `chown -R postgres:postgres /mnt/ssd/postgresql` |
| `pg_restore` fails on `search_vector` column | Restoring with `--data-only` skips generated columns | Use full restore, not `--data-only` |
| Tunnel works on LAN but fails from Vercel | Cloudflare Access policy blocks unauthenticated TCP | Configure tunnel as public hostname, not behind Access |
| Pi runs hot (>80°C) | NVMe + cron load + no active cooler | Buy the Pi 5 Active Cooler — €5-10, plugs onto the board |
| Pi crashes randomly | Undervoltage from wrong PSU | Use the official Pi 5 27W USB-C supply, nothing less |
| SD card boots fail after months | SD wear-out | Boot from NVMe instead — Phase 1 setup is the same, just flash OS to NVMe via Imager |
| Site shows banner but Pi is up | `lastPrimaryFailure` cooldown is too aggressive | Tune `FALLBACK_COOLDOWN_MS` down to e.g. 30s |
| Banner never appears even when Neon is down | `getActiveDb()` swallowing errors | Add visible logging on the catch branch |
