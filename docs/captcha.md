# Captcha System

A custom Scrap Mechanic-themed captcha that gates all public routes on first visit. Doubles as a "are you actually a SM player" filter — the game is niche enough that bots won't have training data for it.

---

## How it works

Every visitor must pass a 3-question challenge before accessing the site. On success a `bot_verified=1` cookie is set (30-day expiry). Middleware checks this cookie on every request — if missing, the visitor is redirected to `/verify?next=<original_path>` and returned there after passing.

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

Images live in `public/captcha/` (e.g. `Mechanic1.jpg`, `Mechanic2.jpg`, `Mechanic3.jpg`).

### Chapter 2 easter egg

The Chapter 2 image shows the in-game "Scrap Mechanic Chapter 2" sign. Its correct answer is the literal word **tomorrow** — one of the 4 buttons will say "tomorrow" alongside normal character names. Chance of appearing: ~3.45% per question slot, giving ~10% probability of seeing it at least once across a full 3-question run.

---

## Security: image hiding

The character filename (e.g. `Mechanic1.jpg`) is **never sent to the client**. Instead:

1. The server stores the actual image path inside the encrypted `smse_captcha` iron-session cookie
2. The client receives only `{ options, questionNumber, streak }` — no image field
3. The page renders `<img src="/api/captcha/image?q=<n>" />` — an opaque proxy URL
4. `GET /api/captcha/image` reads the session server-side and streams the raw image bytes
5. All inspecting the network tab reveals is `/api/captcha/image?q=1`

The `?q=<questionNumber>` parameter exists only for browser cache-busting — the server ignores it and uses the session to know which image to serve.

---

## File layout

```
lib/captcha/
  config.ts               — character definitions, CHAPTER_2_CHANCE constant

app/verify/
  page.tsx                — client component: progress bar, image, 4-button grid,
                            flash feedback, auto-redirect on success
  actions.ts              — startChallenge() and submitAnswer() server actions

app/api/captcha/
  image/route.ts          — GET handler: reads smse_captcha session, serves image bytes
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

`middleware.ts` runs on all routes except:
- `/_next/static`, `/_next/image`, `favicon.ico`, `captcha/`, `logo.png` (static assets — excluded via matcher pattern)
- `/auth/*` — Steam OpenID flow
- `/verify/*` — the captcha page itself
- `/api/cron/*` — server-to-server cron endpoints
- `/api/captcha/*` — the image proxy (must be reachable from `/verify` before verification)

After the bot check passes, the existing admin gate runs as before.

---

## Adding or updating characters

1. Add image files to `public/captcha/` (name them `CharacterN.jpg`)
2. Add an entry to `NORMAL_CHARACTERS` in `lib/captcha/config.ts`
3. Redeploy — no DB migration needed

To replace a Chapter 2 image: swap out `public/captcha/Chapter2.jpg` and redeploy.

---

## Tuning Chapter 2 probability

Edit `CHAPTER_2_CHANCE` in `lib/captcha/config.ts`:

| Value | Approx. chance of seeing it in a full run |
|---|---|
| 0.0345 | ~10% (current) |
| 0.07 | ~20% |
| 0.15 | ~38% |
| 0.30 | ~66% |
