# Captcha System

A custom Scrap Mechanic-themed captcha that gates Steam login on first visit. Doubles as a "are you actually a SM player" filter — the game is niche enough that bots won't have training data for it.

---

## How it works

The captcha is **only required before Steam login** — visitors can browse the site freely without passing it. When a visitor clicks "Sign in with Steam", middleware reads the `bot_verified` iron-session and checks `session.verified === true`. If the session is empty or tampered, the visitor is redirected to `/verify?next=/auth/steam/login` and returned to the Steam login flow after passing.

On success the same session is saved with `verified: true` (30-day expiry). The cookie payload is encrypted + signed with `SESSION_SECRET`, so a client can't forge it by setting `bot_verified=1` themselves — an earlier implementation used a plain `"1"` string and was bypassable with one curl flag.

**Challenge rules:**
- 3 correct answers in a row required
- Any wrong answer = full restart with a fresh set of questions
- 4 options per question (1 correct, 3 random wrong)
- Questions never repeat within a single run

---

## Characters

| ID | Answer (displayed in options) | Variants |
|---|---|---|
| mechanic | Mechanic | 3 |
| totebot | Totebot | 3 |
| haybot | Haybot | 3 |
| tapebot | Tapebot | 3 |
| farmbot | Farmbot | 3 |
| glowb | Glowb | 3 |
| woc | Woc | 3 |
| redtapebot | Redtapebot | 3 |
| chapter2 | **tomorrow** | 1 (easter egg) |

Images live in `lib/captcha/images/` as opaque numbered files (`01.jpg` – `25.jpg`). They are **intentionally outside `public/`** so there's no direct URL like `/captcha/Mechanic1.jpg` to curl. The character → filename mapping is server-side only in `lib/captcha/config.ts`. Vercel's output tracer is told to bundle the images with the `/api/captcha/image` route via `outputFileTracingIncludes` in `next.config.ts`.

**The files themselves live in a private GitHub repo, not this one.** `lib/captcha/images/*.jpg` is gitignored, and `scripts/fetch-captcha-images.ts` downloads the full set into place at build time using the GitHub Contents API. The script is wired into the `build` npm script (chained before `next build` via `&&`) so Vercel runs it automatically regardless of whether Vercel's Next.js preset invokes `npm run build` or `next build` directly. It reads `CAPTCHA_IMAGES_TOKEN` (a fine-grained PAT with `Contents: Read` on that one private repo) and `CAPTCHA_IMAGES_REPO` (in `owner/name` form); optional `CAPTCHA_IMAGES_BRANCH` and `CAPTCHA_IMAGES_PATH` overrides let you re-organize the private repo later without redeploying this one. For local dev the script uses whatever's already on disk, so you don't have to configure the token just to run `npm run dev` — the images are already there from a fresh setup.

**Runtime delivery: bundled JSON manifest, not filesystem reads.** After writing the jpgs to disk, the script also emits `lib/captcha/_images.generated.json` (gitignored) containing every image as a base64 string keyed by filename. `/api/captcha/image` requires this manifest at runtime and serves directly from it. Earlier iterations tried `outputFileTracingIncludes` to bundle the raw jpgs alongside the route handler but the bundler proved finicky on App Router functions — the image directory simply wasn't included in the deployed serverless function. Going through a plain JSON import avoids that entire class of bug: Next.js bundles imported JSON deterministically. The function payload gains ~3 MB (25 jpgs × 4/3 base64 overhead) which is well under Vercel Hobby's 50 MB limit.

### Chapter 2 easter egg

The Chapter 2 image shows the in-game "Scrap Mechanic Chapter 2" sign. Its correct answer is the literal word **tomorrow** — one of the 4 buttons will say "tomorrow" alongside normal character names. Chance of appearing: ~3.45% per question slot, giving ~10% probability of seeing it at least once across a full 3-question run.

---

## Security: image hiding

The character filename (e.g. `Mechanic1.jpg`) is **never sent to the client**. Instead:

1. The server stores the actual image path inside the encrypted `smse_captcha` iron-session cookie
2. The client receives `{ options, questionNumber, streak, nonce }` — the `nonce` is a random UUID generated per question, no image path
3. The page renders `<img key={nonce} src="/api/captcha/image?n=<nonce>" />` — an opaque proxy URL
4. `GET /api/captcha/image` reads the session server-side and streams the raw image bytes
5. All inspecting the network tab reveals is `/api/captcha/image?n=<uuid>`

The `nonce` UUID serves two purposes: cache-busting (changing `key` forces React to unmount/remount the `<img>` element, preventing stale images after a wrong answer) and obscuring which question is being shown. The server ignores the nonce value entirely and uses the session.

---

## File layout

```
lib/captcha/
  config.ts               — character definitions, CHAPTER_2_CHANCE constant
  verified-session.ts     — iron-session options for the bot_verified cookie
                            (shared by middleware + verify action)
  images/                 — opaque numbered jpgs (01.jpg … 25.jpg). NOT served
                            statically; only the proxy route reads them.

app/verify/
  page.tsx                — client component: progress bar, image, 4-button grid,
                            flash feedback, auto-redirect on success
  actions.ts              — startChallenge() and submitAnswer() server actions

app/api/captcha/
  image/route.ts          — GET handler: reads smse_captcha session, serves image
                            bytes (only accepts `\d+\.jpg` from the session)
```

---

## Session (`smse_captcha` cookie)

Uses iron-session with the same `SESSION_SECRET` as the main session, different cookie name.

```ts
type CaptchaSession = {
  questions?: CaptchaQuestion[];  // full question list including correct answers
  current?: number;               // index of current question (0-2)
  streak?: number;                // correct answers so far
};
```

**Expiry:** 30 minutes. If the session expires mid-challenge, `submitAnswer` detects the missing session and restarts.

The `correct` field on each stored question is **never returned to the client** — answer verification happens entirely server-side.

---

## Middleware integration

`middleware.ts` matcher: `["/admin/:path*", "/auth/:path*"]`

The bot check fires **only on the exact route `/auth/steam/login`**. All other routes — including the rest of `/auth/*` (callback, logout) — are always open. After the bot check passes on the login route, the request continues normally.

The admin gate (`/admin/*`) is independent of the captcha and checks for an iron-session with a valid steamid.

---

## Adding or updating characters

1. Add image files to the **private captcha-images repo** (not this one), using the next available numeric name (e.g. `26.jpg`, `27.jpg` …). Keep names opaque — avoid anything that leaks which character a file contains.
2. Add an entry to `NORMAL_CHARACTERS` in `lib/captcha/config.ts` that references those filenames.
3. Redeploy — `prebuild` pulls the updated set from the private repo. No DB migration needed.

To replace a Chapter 2 image: swap out the file it points to (currently `25.jpg`) and redeploy.

---

## Tuning Chapter 2 probability

Edit `CHAPTER_2_CHANCE` in `lib/captcha/config.ts`:

| Value | Approx. chance of seeing it in a full run |
|---|---|
| 0.0345 | ~10% (current) |
| 0.07 | ~20% |
| 0.15 | ~38% |
| 0.30 | ~66% |

---

## Threat model + remaining attack surface

What the current setup defends against, and what it still doesn't:

| Attack | Status |
|---|---|
| Forging `bot_verified=1` via curl | **Closed.** Cookie is iron-session sealed with `SESSION_SECRET`. |
| Guessing image URLs (`/captcha/Woc1.jpg`) | **Closed.** Images are outside `public/` and only the session-gated proxy reads them. |
| Path traversal via the image proxy | **Closed.** Route rejects anything that isn't `\d+\.jpg`. |
| Session filename leak to client | **Closed.** Browser only ever sees `/api/captcha/image?n=<uuid>`. |
| Cloning the public GitHub repo and precomputing perceptual hashes of the 25 images to auto-answer challenges | **Closed.** Images live in a private GitHub repo and are fetched into `lib/captcha/images/` at build time by `scripts/fetch-captcha-images.ts` using the `CAPTCHA_IMAGES_TOKEN` PAT. `lib/captcha/images/*.jpg` is gitignored. A `git clone` of the public repo produces no images. For local dev the script skips silently when it finds the full set already on disk. |
| Vision AI solving a novel image | **Partial.** Informal testing shows general-purpose vision models get roughly one of three right without a cheat table — enough to make brute-forcing 3-in-a-row expensive but not prohibitive. The Chapter 2 easter egg (answer: "tomorrow") is specifically designed to trip AIs that lack game context. |
