# Wedding Website — Eugénia & João

## Context

Building a one-page wedding invitation site for the user's mother (Eugénia Duarte) and her partner (João Barreto). The site replaces a paper invitation: guests open the link, watch an envelope open as they scroll, see the invitation image, then access all the practical wedding info (date, venue, RSVP, honeymoon gift, important information, and gallery). All copy is in European Portuguese. Mobile-first because most guests will open it on their phones, but it must look polished on desktop too.

Several pieces of content (chapel photo, photo gallery, bank-transfer value) are not yet known — the build uses clearly marked placeholders in a single config file so the user can fill them in later without touching layout code. The invitation image is user-provided and lives at `/assets/invitation.png`; HTML references include a query-string version so the envelope animation does not show a stale cached copy.

---

## Hosting & invitation context

- **Hosts:** the couple themselves (Eugénia + João). No external parent hosts named on the invite.
- **Officiant:** not named on the invite.
- **Ceremony type:** Catholic church wedding. The invite does **not** explicitly say "church" — in Portugal this is the default assumption.
- **Distribution:** invite shared via WhatsApp link. Guests already have the host's phone contact, so no "RSVP contact name / phone" line is needed in the copy — RSVPs go through the form on the site.
- **Transport:** none provided. Guests drive or arrange their own way. No transport / shuttle info on the site.
- **Gifts:** no registry. Honeymoon contribution via bank transfer details on the site.
- **Cultural / family details:** none on the invite — no padrinhos list, no in-memoriam line, no family crest or monogram.
- **Save-the-date:** none sent. The WhatsApp invite is the first announcement, so the launch date matters.
- **Guest list:** rough headcount only — no exact final count needed for the build.

---

## Tech stack

- **Plain HTML / CSS / vanilla JS** with ES modules (`<script type="module">`). No framework, no bundler.
- **Hosting:** Vercel (static deploy, free tier).
- **Fonts:** self-hosted WOFF2 in `/assets/fonts/` (faster, GDPR-clean, no Google Fonts CDN).
- **Analytics:** Vercel Analytics (privacy-friendly).

Rationale: a single-page site with no routing, one POST endpoint, and no component reuse doesn't earn a build step. Astro / Next.js would be overhead.

---

## File structure

```
wedding-invite/
├── index.html
├── vercel.json
├── package.json                  (only for Prettier + Vercel Analytics)
├── /assets/
│   ├── invitation.png            (user-provided)
│   ├── chapel.png               (user-provided chapel photo)
│   ├── japan.png                (user-provided honeymoon illustration)
│   ├── envelope-front.svg
│   ├── envelope-flap.svg
│   ├── paper-texture.png         (optional, for invitation card)
│   ├── /carosel photos/          (carousel photos)
│   └── /fonts/                   (self-hosted WOFF2)
├── /css/
│   └── styles.css
└── /js/
    ├── main.js                   (entry: animation, RSVP, maps, ICS, carousel, accordion)
    └── config.js                 (single source of truth — see below)
```

### `config.js` is the only file the user edits to update content

```js
export const config = {
  couple: { bride: "Eugénia Duarte", groom: "João Barreto" },
  date: "2026-10-03T13:00:00+01:00",     // start (ISO with timezone)
  endDate: "2026-10-03T23:00:00+01:00",  // explicit end for the .ics DTEND
  rsvpDeadline: "2026-08-01",
  ceremony: {
    name: "Capela de Nossa Senhora do Mar",
    address: "Zambujeira do Mar",
    photo: "/assets/chapel-transparent.png?v=3",
    lat: 0, lng: 0,                    // for maps deep-links (0 = address fallback)
  },
  reception: {
    name: "Bar da Praia",
    address: "Almograve",
    lat: 0, lng: 0,
  },
  honeymoon: {
    image: { src: "/assets/japan.png?v=2", alt: "Ilustração de um templo no Japão" },
    bankTransfer: { label: "NIF", value: "PLACEHOLDER_NIF" },
    description: "...",
  },
  gallery: ["/assets/carosel photos/1.jpg", ...],
  importantInfo: [ { q: "...", a: "..." } ],
  rsvpEndpoint: "PLACEHOLDER_GOOGLE_APPS_SCRIPT_URL",
};
```

---

## Page sections (scroll order, all in Portuguese)

1. **Envelope hero** — sticky for ~150svh of scroll; flap opens, invitation slides up.
2. **Invitation image** — the user-provided picture, settled in place after the animation.
3. **Couple + headline** — currently hidden because the invitation image already repeats the couple identity. Keep the section in markup so it can be re-enabled later.
4. **Date (clickable)** — clicking downloads a `wedding.ics` file that adds the event to any calendar.
5. **Cerimónia** — chapel name + address; tap to open the maps dialog with the chapel's deep-links.
6. **Receção** — reception venue name + address; tap to open the maps dialog with the reception's deep-links.
7. **Chapel photo** — chapel image from `config.ceremony.photo`, shown immediately after the ceremony/reception addresses as a PNG with alpha transparency preserved. The image element and parent section must not add a white or coloured background.
8. **RSVP** — button reveals a form (see RSVP section below).
9. **Lua-de-mel no Japão** — short paragraph + visible bank-transfer detail (`NIF` placeholder) + "Copiar NIF" button, with the Japan illustration below the transfer details.
10. **Informações importantes** — accordion of host-written practical notes, including clothing, coat, shoes, where to stay, parking, timings, and rain plan.
11. **Galeria** — final photo carousel from `/assets/carosel photos/`.

Countdown was removed from the original plan — host preference (didn't want a ticking days-remaining number on the page).

---

## Envelope animation

**Default path:** CSS Scroll-Driven Animations API (`animation-timeline: scroll()`). Supported in Safari 26+ and Chrome — gives GPU-driven smoothness for free.

**Fallback for older Safari:** `position: sticky` container + `IntersectionObserver` + scroll-progress driving CSS custom properties via `requestAnimationFrame`.

Mechanics:
- Layer order is `envelope-back` → `envelope-slot`/clipped `letter--inside` → `envelope-front` → `envelope-flap`, then an unclipped `letter--escaped` above all envelope layers.
- Visual treatment should be clean, minimal, and editorial rather than photorealistic: matte cream/beige stationery colours (`#f7f3ee` page background, `#efe6d8` envelope, `#e4d8c5` flap), perfectly straight symmetrical edges, a sharp triangular flap, intentional `12px` outer corner radius, thin and consistent low-contrast fold creases, no bottom centre seam, a subtle hinge edge on the flap fold, and only soft depth (`0 8px 20px rgba(0,0,0,0.06)`). Avoid glossy effects, heavy gradients, soft blobs, and dirty grey tones. Keep the effect CSS-only so the invitation still loads as a static, no-build site.
- The outer scene/envelope must not use `overflow: hidden`; only the inner `envelope-slot` may clip the letter while it is inside the pocket.
- Scroll progress 0.0–0.25 → flap rotates backward like paper from the top hinge (`rotateX(0deg)` → `rotateX(-160deg)`) with `transform-origin: top center`; it must remain visually attached to the envelope fold line throughout the motion.
- The flap layer sits behind the letter/front pocket throughout the animation so it reads as folded-back paper rather than a panel floating over the invitation; the card remains invisible until the flap begins opening.
- The front pocket is an open pocket shape, not a second closed flap; it should mask only the lower portion of the card while leaving the envelope mouth visually open.
- The flap and front-pocket opening must share the same V geometry: identical top-corner shoulders and centre tip alignment, so they read as parts of the same folded envelope. The flap point should not carry extra edge shadow or darker shading.
- The flap must never fade, dissolve, blur, or use mask/gradient fades during opening. It should animate only by `rotateX()` from `transform-origin: top center`. Use two pseudo-element faces with `backface-visibility: hidden` so exactly one solid triangle is visible at a time: the outside/front is slightly darker cream, and the underside/inside is light beige matching the envelope. Do not use `scaleY()` to simulate opening.
- 0.25–0.88 → invitation card translates upward from the envelope opening; its start position is anchored near the top/mouth of the envelope rather than the bottom pocket.
- The pocket mask opens upward with the letter during the slide-out, so the invitation visibly leaves the envelope before any duplicate/top-layer handoff happens.
- The handoff from the pocket layer to the unclipped escaped layer starts as soon as the invitation reaches its furthest-up / fully-out position and should be almost instant (`progress ≈ 0.88–0.89`), before the final downward settle.
- 0.88–1.0 → invitation settles noticeably downward above the open envelope while the whole scene lifts enough for the invite itself to finish vertically centred in the viewport.
- The envelope scene may translate upward during the final settle so the card remains centred on screen and never crops at the top of the viewport.
- After sticky range ends, normal scroll resumes into the rest of the page.
- `prefers-reduced-motion`: skip animation, snap straight to the open state.

iOS Safari pitfalls to avoid:
- No ancestor with `overflow: hidden` around the sticky element.
- Use `100svh` (not `100vh`) for sticky height — avoids URL-bar jump.
- Animate only `transform` and `opacity`. Add `will-change: transform` on flap and card.
- Pre-decode the invitation: `<img decoding="sync" fetchpriority="high">`.

---

## Date → calendar (.ics)

Generate the ICS file client-side as a Blob from `config.date`, trigger download on click.

- Include `METHOD:PUBLISH` and a stable `UID` (e.g. `eugenia-joao-2026@wedding.invite`) so re-downloads update the same event rather than duplicate it.
- Include `SUMMARY`, `LOCATION` (the **ceremony** venue — that's the 13:00 start), `DESCRIPTION` (couple names + a one-liner mentioning the reception venue), `DTSTART` (`config.date`), `DTEND` (`config.endDate` — explicit ISO timestamp, currently 23:00 on the wedding day; host's preferred end).

---

## Address → maps

There are **two** venues (cerimónia, receção). Each is a tappable card that opens a single shared maps `<dialog>`. The dialog's three deep-link hrefs are populated dynamically from the tapped venue's `config.{ceremony|reception}` data on each open — same dialog DOM, different links per venue.

Each link uses three explicit buttons (Google / Apple / Waze) — clearer than trying to detect the user's platform:

- **Google Maps:** `https://www.google.com/maps/search/?api=1&query={lat},{lng}` (universal).
- **Apple Maps:** `http://maps.apple.com/?ll={lat},{lng}` (works on Apple devices, opens Google Maps in browser elsewhere).
- **Waze:** `https://waze.com/ul?ll={lat},{lng}&navigate=yes`.

If lat/lng are still `0` (placeholder), the deep-link `query` is built from `"<name>, <address>"` (e.g. `"Capela de Nossa Senhora do Mar, Zambujeira do Mar"`) so the map pin lands on the actual venue rather than the town centre. Replacing them with actual coords is a polish step, not a blocker.

---

## RSVP

### Form fields
- Nome (text, required)
- Vais estar presente? (radio: Sim / Não, required)
- Trazes acompanhante? (checkbox) → if yes, "Nome do acompanhante" (text)
- Trazes crianças? (checkbox) → if yes, immediately show one "Nome" + "Idade" row, with an option to add more repeating rows (kids welcome — confirmed by user)
- Restrições alimentares (textarea, optional)
- Honeypot field (`name="website"`, hidden, skipped by humans, filled by bots)

### Submission flow
1. Client validates required fields + 2-second minimum time on page (anti-spam).
2. `fetch` POST as `application/x-www-form-urlencoded` (avoids CORS preflight) to the Google Apps Script web-app URL.
3. Apps Script appends a row to a Google Sheet **and** sends an email to the host via `MailApp.sendEmail()`.
4. Show inline success state ("Recebido — obrigado!"); error state with retry on failure.

### Edge cases
- **Duplicates / edits:** allow resubmission. Apps Script writes a `submittedAt` timestamp; the host sorts the Sheet by name + timestamp and treats the latest row per name as canonical. Microcopy on the form: "Podes voltar a submeter para alterar a tua resposta."
- **Deadline:** after `config.rsvpDeadline`, the form is replaced client-side with "Período de RSVP encerrado — contacta-nos diretamente." Apps Script also rejects late submissions server-side.
- **CORS:** Apps Script `doPost` returns `ContentService.createTextOutput(...).setMimeType(ContentService.MimeType.JSON)`. Document this in the setup guide.

### Setup guide for the user (to be written into the repo's README)
Numbered steps to: create the Sheet, paste the provided Apps Script (≈ 20 lines, included in plan), deploy as web app with "Anyone" access, copy the URL into `config.js`.

---

## Honeymoon gift

- No external payment page.
- Show the Japan illustration from `config.honeymoon.image` below the bank-transfer details at the same rendered size as the chapel image. Keep it as a PNG/WebP with alpha transparency preserved.
- Show the bank-transfer detail directly from `config.honeymoon.bankTransfer`.
- Current label is `NIF` because that is what the host requested; if this should actually be NIB/IBAN, change only `config.honeymoon.bankTransfer.label` and `value`.
- Button copies the value to the clipboard and shows a short inline state ("NIF copiado", "NIF por confirmar", or fallback copy guidance).

---

## Photo gallery

Scroll-snap carousel of photos. Images live in `/assets/carosel photos/` and are listed in `config.gallery`. Lazy-load (`loading="lazy"`). On mobile, show one full photo at a time, not a partial next slide. Previous/next buttons are visible when there is more than one photo and wrap around at the ends. The carousel auto-advances every 2 seconds unless `prefers-reduced-motion` is enabled. Buttons are hidden when there is only one photo. If `config.gallery` is empty, hide the whole section.

---

## Informações importantes

Native `<details>` / `<summary>` accordion — keyboard accessible by default, no custom widget needed.

Locked entries, in order:

1. **O que vestir?** — "Traje elegante descontraído, pronto para dançar. Cavalheiros dispensados de gravata."
2. **Devo levar casaco?** — "Sim. À noite na costa alentejana pode ficar frio, por isso traz um casaco."
3. **Que calçado devo levar?** — "Saltos altos opcionais, boa disposição obrigatória."
4. **Onde ficar?** — explain that there are no hotels in or around Almograve, but there are local accommodations and a youth hostel; advise guests to use Booking.com and book early if sleeping there.
5. **Onde posso estacionar?** — parking guidance.
6. **A que horas começa e acaba?** — ceremony and reception timing.
7. **E se chover?** — plans may change at the last minute and guests will be informed.

Do not include "Posso levar crianças?" or "Posso levar acompanhante?" here because those choices are already handled inside the RSVP form.

---

## Styling

- **Mobile-first** breakpoints. Use `clamp()` for fluid typography.
- **Typography scale:** keep section headings restrained; date, venue names, and dress-code title are secondary headings, not hero-scale text.
- **Palette:** soft cream / sage / dusty rose default — confirm with user before locking.
- **Fonts:** serif heading (e.g. Cormorant Garamond) + cursive accent (Great Vibes) + clean sans body. Self-hosted WOFF2.
- **Accessibility:** semantic landmarks (`<header>`, `<main>`, `<section>`, `<footer>`), visible focus rings, contrast ≥ 4.5:1 on body text, alt text on every image, `prefers-reduced-motion` honored.
- **Meta:** favicon, `<meta property="og:*">` for WhatsApp link previews (most guests will share via WhatsApp), Portuguese `lang="pt-PT"`.

---

## Critical files to create

- `/Users/constancacasimiro/wedding-invite/index.html`
- `/Users/constancacasimiro/wedding-invite/css/styles.css`
- `/Users/constancacasimiro/wedding-invite/js/main.js`
- `/Users/constancacasimiro/wedding-invite/js/config.js`
- `/Users/constancacasimiro/wedding-invite/vercel.json`
- `/Users/constancacasimiro/wedding-invite/README.md` (setup guide for Google Sheets + Apps Script + bank-transfer setup)

---

## Content status

### Locked in
- **Date:** 3 October 2026, 13:00 (Portugal time, +01:00 — still in WEST/DST).
- **Date display:** "Sábado, 3 de Outubro 2026".
- **Cerimónia:** Capela de Nossa Senhora do Mar, Zambujeira do Mar.
- **Receção:** Bar da Praia, Almograve.
- **RSVP deadline:** 1 August 2026.
- **Host email (RSVP notifications):** `jenaejoaocasamento@gmail.com`.
- **Informações importantes:** entries written, in order, for what to wear, coat, shoes, where to stay, parking, timing, and rain-plan flexibility. Crianças and acompanhante entries were removed from this accordion because those choices are handled in RSVP.
- **Footer:** "Vemo-nos lá — Jena e João", rendered in the same body font as the rest of the page.
- **Guest count (rough):** ~65.
- **Headline:** "Vem casar connosco" (default kept).
- **Countdown:** removed — host preference.

### Still pending before launch
- **Chapel photo** — save as `/assets/chapel-transparent.png`; keep PNG/WebP alpha transparency intact.
- **Lat/lng** for both venues — optional polish; address fallback works in the meantime.
- **Carousel photos** — current replacement set is saved into `/assets/carosel photos/` and listed in `config.gallery`.
- **Honeymoon bank-transfer value** — currently labelled as NIF per host request; replace `PLACEHOLDER_NIF` before launch.
- **Names format** — host is undecided between full names ("Eugénia Duarte & João Barreto") and first names only ("Eugénia & João"). Currently set to full names.
- **Confirmation of color palette + fonts** (default sage / cream / dusty rose pending host approval).
- **Apps Script web app deployed**, URL pasted into `config.rsvpEndpoint`.

---

## Verification

End-to-end check before declaring the site ready:

1. **Animation:** open the site on iPhone Safari, Android Chrome, desktop Chrome, desktop Safari. Scroll slowly and quickly — envelope opens smoothly, invitation slides out, no jank, no layout shift. Toggle "Reduce Motion" in OS settings → animation skips, opens instantly.
2. **Calendar:** click the date on iPhone, Android, macOS — confirm the event lands in Apple Calendar / Google Calendar with correct title, location, time, timezone.
3. **Maps:** for **both** venues (cerimónia and receção), click each of the 3 maps buttons on iPhone and Android — confirm each opens the correct app with the right venue pinned. Verify the dialog updates between taps (tapping ceremony then reception should not still show the ceremony's coords).
4. **RSVP:** submit the form with all field combinations (attending, +1, kids, dietary). Confirm a row appears in the Google Sheet and an email arrives to the host. Re-submit with same name → second row appears, microcopy is clear. Submit after `rsvpDeadline` → form is replaced with the "encerrado" message. Submit with the honeypot filled → request is rejected.
5. **Honeymoon:** click "Copiar NIF" with a real value configured → confirm the value is copied and the button state returns to "Copiar NIF"; with placeholder value, confirm it shows "NIF por confirmar".
6. **Informações importantes:** open / close each item with mouse and keyboard.
7. **Galeria:** with multiple photos configured, confirm mobile shows one full photo at a time, auto-advances slowly, wraps from last to first, and previous/next controls wrap on mobile and desktop. With no photos configured, confirm the whole section is hidden. With reduced motion enabled, confirm auto-advance does not run.
8. **Performance:** Lighthouse mobile score ≥ 90 on Performance and Accessibility. Total page weight under ~1.5 MB (compressed images).
9. **OG preview:** paste the URL into a WhatsApp chat → confirm the preview card looks correct.
