# Pi Migration — Hardware Shopping List

Planning doc for moving the site (or just the DB as a fallback) onto a Raspberry Pi 5
running 24/7 at home. Created 2026-05-22 after Neon compute quota exhaustion and
Vercel CPU budget pressure made the free-tier rule painful to honor on cloud alone.

## What to buy

| Item | Price | Link |
|---|---|---|
| Geekworm X1001 PCIe to M.2 NVMe Key-M SSD Shield (HAT) | €12.93 | https://www.amazon.de/-/en/Geekworm-X1001-Key-M-Shield-Raspberry/dp/B0CPLF6JYX/ref=sr_1_4?sr=8-4 |
| Intenso 250GB M.2 SSD PCIe Premium (NVMe Gen3 x4, 2280) | €45.29 | https://www.amazon.de/-/en/Intenso-250GB-Premium-Express-Gen-3x4/dp/B09F4CT8LV/ref=sr_1_5?sr=8-5 |
| **Total** | **~€58** | |

## Why this exact combo

- **Geekworm X1001:** Pi-5-specific NVMe HAT, supports 2230/2242/2260/2280 drives, 4.6★/1043
  reviews, common popular pick. Sits on top of the Pi via the PCIe ribbon — no external cables for
  the drive (clean cable management was the deciding factor over a SATA + USB3 enclosure).
- **Intenso 250GB Premium:** mid-budget NVMe from a 20-year-old German company (Vechta).
  Amazon's Choice, 4.6★/1,329 reviews. Stepped up from the Fanxiang S501 candidate because
  Intenso has real EU consumer-protection backing and 2× the storage for €5 more. Name brands
  (Crucial P3, Kingston NV2) at the 250-500GB tier were €144+ locally — AI-driven NAND shortage
  has crushed availability in 2026.

## Things NOT included that we may need

- **Pi 5 Active Cooler** (~€5-10) — the HAT covers the CPU; Pi 5 running 24/7 with NVMe + Postgres
  will run warm. Get the official one. Skip only if temps stay reasonable on passive cooling.
- **Case** — user is designing a custom case, so no purchase needed. Whatever case existed before
  won't fit anymore (HAT adds height).
- **Pi 5 power supply** — assumed already in use. Must be the proper 5V/5A USB-PD supply (27W).
  Generic 5V/3A bricks will trigger undervoltage warnings with NVMe attached.

## Why NOT what we considered

- **Fanxiang S501 128GB at €40** — bottom-tier Chinese OEM, smaller drive for similar money.
  Skipped once Intenso 250GB appeared at €45.
- **Crucial P3 500GB / Kingston NV2 / WD Blue SN570** — name-brand picks, but local pricing in
  user's EU country is €144+ due to NAND shortage. Cost-prohibitive for a hobby site on the
  free-tier rule.
- **NVMe in a USB3 enclosure** — same real-world speed as SATA SSD via USB3 (USB3 is the bottleneck),
  so paying NVMe prices for SATA performance. Skipped.
- **SATA SSD via USB3 cable/enclosure** — cheaper, simpler, but adds an external box dangling off
  the Pi. HAT was preferred for tidier physical setup.
- **HDD / spinning drive** — wrong for DB random IOPS, even though endurance is "infinite."
- **High-endurance SD card (Samsung Pro Endurance etc.)** — cheaper fallback (~€15-25) but slower
  and lower endurance than even a budget NVMe. Worth keeping in mind if Intenso ships dead.

## After hardware arrives — next steps (in order)

1. Install HAT + NVMe on Pi. Boot, verify drive appears at `/dev/nvme0n1`.
2. Decide partition scheme. Simplest: one ext4 partition on the NVMe, mount at `/mnt/ssd`.
   OS stays on SD; only Postgres data dir moves to NVMe.
3. Install Postgres on Pi, set `data_directory = /mnt/ssd/postgresql/<version>/main`.
4. Set up nightly `pg_dump` from Neon → restore onto Pi (this is the "Pi as read-only fallback"
   sync mechanism we discussed — Option C).
5. Wire the app to fall back to Pi when Neon 402s. Read-only mode + banner during fallback.
   See `docs/database.md` for the current DB client setup that needs the fallback wiring.
6. Set up nightly `pg_dump` from Pi → off-Pi backup (PC over LAN, or Cloudflare R2 free 10GB).
   This is the **most important step** — backup is what turns "off-brand drive risk" into
   "annoyance, not disaster."
7. Decide on Cloudflare Tunnel vs LAN-only vs port-forward for Vercel-to-Pi connectivity.

## Open questions (decide later)

- Cloudflare Tunnel vs Tailscale Funnel vs port-forward for public reachability of the Pi.
  Cloudflare Tunnel is the leading candidate (no port forward, no home IP exposure, free TLS).
- UPS for the Pi? Without one, mid-write power loss can corrupt the DB (Postgres WAL mitigates
  but doesn't eliminate). Used enterprise SSD with power-loss protection is the alternative.
  Defer until we see how often home power actually drops.
- Eventual promotion of Pi from "fallback" (Option C) to "primary" (Option B) if Neon outages
  become routine. Don't commit to this yet — start with C, see how it feels.
