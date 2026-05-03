# Eugénia & João — Wedding Invitation Site

One-page wedding invitation. Plain HTML/CSS/JS, no build step. Deploys to Vercel as a static site.

## Editing content

All content lives in [`js/config.js`](js/config.js). Edit that file to change names, date, venue, hotels, important information, photos, etc. Anything marked `PLACEHOLDER_…` must be filled in before launch.

Replace the invitation image at [`assets/invitation.png`](assets/invitation.png). Recommended: a tall portrait image, ~1200 px wide, ~250 KB.

Carousel photos go in [`assets/carosel photos/`](<assets/carosel photos/>). Reference each one in `config.gallery`.

## Local preview

```bash
cd /Users/constancacasimiro/wedding-invite
python3 -m http.server 8000
# open http://localhost:8000
```

Any static file server works (Python, `npx serve`, VS Code Live Server). A bare `file://` open will break ES module imports.

## Deploying to Vercel

1. Push the folder to a GitHub repo.
2. On vercel.com → "New Project" → import the repo. Default settings work (it's a static site, no framework).
3. Add the custom domain on the project's "Domains" tab.

## Setting up RSVP (Google Sheet + Apps Script)

The form posts to a Google Apps Script web app, which writes a row to a Google Sheet **and** emails the host.

### One-time setup

1. **Create a Google Sheet** named "Casamento — RSVP". Add a header row:

   `submittedAt | name | attending | hasPlusOne | plusOneName | hasKids | kids | dietary`

2. **Open the Apps Script editor:** in the Sheet, `Extensions → Apps Script`.

3. **Paste this script** (replace the email address):

   ```js
   const HOST_EMAIL = "jenaejoaocasamento@gmail.com";
   const RSVP_DEADLINE = "2026-08-01"; // ISO date — must match config.js

   function doPost(e) {
     const p = e.parameter;

     // Reject submissions after the deadline.
     if (new Date() > new Date(RSVP_DEADLINE + "T23:59:59")) {
       return jsonResponse({ ok: false, reason: "deadline" }, 403);
     }

     const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
     sheet.appendRow([
       p.submittedAt || new Date().toISOString(),
       p.name || "",
       p.attending || "",
       p.hasPlusOne || "",
       p.plusOneName || "",
       p.hasKids || "",
       p.kids || "",
       p.dietary || "",
     ]);

     try {
       MailApp.sendEmail({
         to: HOST_EMAIL,
         subject: `RSVP: ${p.name} — ${p.attending}`,
         body: [
           `Nome: ${p.name}`,
           `Presente: ${p.attending}`,
           `Acompanhante: ${p.hasPlusOne} ${p.plusOneName || ""}`,
           `Crianças: ${p.hasKids} ${p.kids || ""}`,
           `Restrições: ${p.dietary || "—"}`,
         ].join("\n"),
       });
     } catch (err) {
       // Email is best-effort; don't fail the RSVP if it bounces.
     }

     return jsonResponse({ ok: true });
   }

   function jsonResponse(obj, status) {
     return ContentService
       .createTextOutput(JSON.stringify(obj))
       .setMimeType(ContentService.MimeType.JSON);
   }
   ```

4. **Deploy as a web app:**
   - Click `Deploy → New deployment`.
   - Type: **Web app**.
   - Execute as: **Me**.
   - Who has access: **Anyone**.
   - Click **Deploy**, authorize, copy the resulting `https://script.google.com/macros/s/.../exec` URL.

5. **Paste the URL** into `config.rsvpEndpoint` in [`js/config.js`](js/config.js).

### Updating the script later

If you change the script, click `Deploy → Manage deployments → ✏️ → New version → Deploy`. The URL stays the same; the version increments.

### What the Sheet will contain

Each submission appends a new row. Treat the latest row per `name` as canonical — guests can resubmit to edit. Sort by `submittedAt` to see the most recent first.

## Honeymoon (bank transfer)

Set `config.honeymoon.bankTransfer` in [`js/config.js`](js/config.js). The page shows the transfer detail directly and the button copies it to the clipboard.

Current setup:

```js
honeymoon: {
  bankTransfer: {
    label: "NIF",
    value: "PLACEHOLDER_NIF",
  },
}
```

If the host decides this should be NIB or IBAN instead of NIF, change only `label` and `value`.

### Testing

Before sharing the invite, replace `PLACEHOLDER_NIF` with the real value, open the site, click "Copiar NIF", and paste somewhere to confirm the copied value is correct.

## Pre-launch checklist

- [ ] Replaced every `PLACEHOLDER_…` in `config.js`.
- [ ] Invitation image in `assets/invitation.png`.
- [ ] Carousel photos in `assets/carosel photos/` and listed in `config.gallery`.
- [ ] Chapel photo added as `assets/chapel.png`.
- [ ] Hotels filled in `config.hotels`.
- [ ] Important information filled in `config.importantInfo`.
- [ ] Bank-transfer value added to `config.honeymoon.bankTransfer.value`.
- [ ] "Copiar NIF" tested with the real value.
- [ ] Apps Script deployed; URL in `config.rsvpEndpoint`.
- [ ] `HOST_EMAIL` and `RSVP_DEADLINE` set inside the Apps Script.
- [ ] Tested on iPhone Safari, Android Chrome, desktop Chrome, desktop Safari.
- [ ] Reduced-motion behaves correctly (skip animation, snap to open).
- [ ] WhatsApp preview shows the OG image — check by pasting the URL into a chat with yourself.

## File map

```
index.html              — page structure
css/styles.css          — all styles
js/main.js              — animation, RSVP, ICS, maps, carousel
js/config.js            — content (the only file you edit)
assets/invitation.png   — main invitation image
assets/carosel photos/  — carousel photos
assets/fonts/           — self-hosted WOFF2 (drop fonts here)
vercel.json             — caching headers
```
