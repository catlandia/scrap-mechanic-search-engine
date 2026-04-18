# Captcha System

A custom Scrap Mechanic-themed captcha that gates Steam login on first visit. Doubles as a "are you actually a SM player" filter — the game is niche enough that bots won't have training data for it.

---

## How it works

The captcha is **only required before Steam login** — visitors can browse the site freely without passing it. When a visitor clicks "Sign in with Steam", middleware checks for a `bot_verified=1` cookie. If missing, the visitor is redirected to `/verify?next=/auth/steam/login` and returned to the Steam login flow after passing.

On success a `bot_verified=1` cookie is set (30-day expiry).

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

`middleware.ts` matcher: `["/admin/:path*", "/auth/:path*"]`

The bot check fires **only on the exact route `/auth/steam/login`**. All other routes — including the rest of `/auth/*` (callback, logout) — are always open. After the bot check passes on the login route, the request continues normally.

The admin gate (`/admin/*`) is independent of the captcha and checks for an iron-session with a valid steamid.

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
