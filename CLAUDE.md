# CLAUDE.md

## Project

One-page wedding invitation site for **Eugénia Duarte & João Barreto** (October 2026, Portugal). Replaces a paper invitation — guests open a WhatsApp link, watch an envelope animation, then scroll through ceremony info, RSVP, hotels, and a honeymoon-contribution section.

All copy is in **European Portuguese (pt-PT)** — not Brazilian. Mobile-first because most guests open it on their phone (typically iOS Safari via WhatsApp), but it must look polished on desktop too.

Static site, deployed on Vercel free tier.

---

## Source of truth

[requirements.md](requirements.md) is the single source of truth for scope, content decisions, and architecture.

**Any change to specs, scope, content rules, or technical decisions → update [requirements.md](requirements.md) in the same change.** Never let code drift from the document. If a user request implies a spec change (e.g. "actually skip the countdown", "RSVPs should email me too"), update the relevant section before or alongside the code change.

If a request contradicts something in [requirements.md](requirements.md), surface the conflict before implementing — don't silently override.

---

## Hard constraints (do not violate without asking)

- **No framework, no bundler.** Plain HTML / CSS / vanilla JS with ES modules. Do not suggest React, Next, Astro, Vite, etc. The rationale is in [requirements.md](requirements.md) — a single-page site doesn't earn a build step.
- **No Google Fonts CDN.** Self-host WOFF2 in `/assets/fonts/` (faster, GDPR-clean).
- **No external analytics other than Vercel Analytics.**
- **All user-editable content lives in [js/config.js](js/config.js).** Do not hardcode dates, names, venue strings, important information, hotel data, chapel photo paths, carousel photo paths, or bank-transfer details into HTML or other JS files. If it's content the host might want to change, it goes in `config.js`.
- **All visible copy in pt-PT.** Including microcopy, error states, button labels, alt text. Do not mix in English or Brazilian Portuguese.

---

## Style for this codebase

- Mobile-first CSS. Use `clamp()` for fluid type. Use `100svh` (not `100vh`) for sticky/full-height elements — iOS URL bar.
- Animate only `transform` and `opacity`. No animating `top` / `left` / `width` / `height`.
- Honor `prefers-reduced-motion` everywhere there's animation.
- Semantic HTML landmarks; alt text on every image; visible focus rings; contrast ≥ 4.5:1.
- No emojis in code or copy unless the host explicitly asks.

---

## Think through every interaction detail

The host has called this out explicitly: don't ship a feature without walking through its full UX. This site is small, so half-implemented details are obvious. Before adding or changing anything interactive, walk through every state it can be in — empty, partial, full, error, success, disabled, post-deadline. If a state isn't handled, flag it instead of shipping it half-done.

Concrete patterns to keep applying:

### Conditional reveals
Don't show a field a user can't fill in yet. The "+1" name input only appears when "Vou levar acompanhante" is ticked. Kid name/age rows only appear when "Vou levar crianças" is ticked. Implementation is generic: `data-toggle="X"` on a checkbox, `data-when="X" hidden` on the dependent field — see [main.js](js/main.js) `setupRsvpToggles`. When you add a new optional field, ask "is this only relevant in some cases?" — if yes, gate it.

### Progressive disclosure
The page surface stays calm; complexity opens on demand. Date is plain text → tap → `.ics` download → iPhone shows the native "Add to Calendar" sheet. Address is plain text → tap → bottom-sheet `<dialog>` with map options. RSVP is a single button → tap → form modal. Don't pre-render UI users probably won't engage with. Don't put 3 buttons on the page when 1 button + a sheet works.

### Native primitives over custom widgets
- `<dialog>` over custom modals (focus trap, ESC, backdrop come free).
- `.ics` blob download over fake calendar UIs.
- `<details>/<summary>` over JS accordions.
- Real `<input type="radio">` + `<fieldset>/<legend>` over divs that look like radios.

### Empty / loading / closed states
- `config.hotels` empty → "Sugestões em breve", not a broken grid.
- `config.gallery` or `config.importantInfo` empty → hide the whole section, don't leave a dangling title.
- After `rsvpDeadline` → swap the form for a closed message; Apps Script must reject server-side too.
- Reduced-motion → snap to the open envelope state.

### Anti-spam without friction
Honeypot field (off-screen) + 2-second minimum dwell time. No CAPTCHA. Bots fail both; humans never see them.

---

## Local preview

```bash
python3 -m http.server 8000
```

Open http://localhost:8000.

**To view on phone (same WiFi):** find the Mac's local IP with `ipconfig getifaddr en0`, then on the phone open `http://<that-ip>:8000`. Python's `http.server` binds to all interfaces by default, so no extra flags needed.

A bare `file://` open will break ES module imports — always use a static server.

---

## Working agreements

- **Don't commit or push without being asked.** This repo is personal and the host will review changes before they go live.
- **Don't deploy to Vercel without being asked.** The site is unlisted but the URL gets shared — accidental pushes go straight to guests.
- **Before declaring a feature done**, run the relevant item from the Verification checklist in [requirements.md](requirements.md). For UI work, that means actually loading the page in a browser, not just type-checking.
- **iOS Safari is the priority target.** When in doubt about a CSS or animation choice, pick what works on iOS Safari first and degrade elsewhere.
- **Placeholders are fine** — the host will fill in real content (invitation image, chapel photo, venue, hotels, bank-transfer value, etc.) later. Mark them clearly with `PLACEHOLDER` so they're greppable.
