import { config } from "./config.js";

/* =========================================================
   Helpers
   ========================================================= */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const isPlaceholder = (v) => typeof v === "string" && v.startsWith("PLACEHOLDER");

const formatDateLong = (iso) => {
  if (isPlaceholder(iso)) return "Data por confirmar";
  const d = new Date(iso);
  // pt-PT renders weekday + month lowercase by default ("sábado, 3 de outubro de 2026");
  // capitalize both via formatToParts so we get "Sábado, 3 de Outubro 2026".
  const parts = new Intl.DateTimeFormat("pt-PT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).formatToParts(d);
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const date = parts
    .map((p) => (p.type === "weekday" || p.type === "month" ? cap(p.value) : p.value))
    .join("");
  return `${date} ${d.getFullYear()}`;
};

const formatTime = (iso) => {
  if (isPlaceholder(iso)) return "";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
};

const formatDeadline = (iso) => {
  if (isPlaceholder(iso)) return "—";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("pt-PT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
};

/* =========================================================
   Bind config to the DOM
   ========================================================= */

function bindContent() {
  const map = {
    bride: config.couple.bride,
    groom: config.couple.groom,
    dateLong: formatDateLong(config.date),
    dateTime: formatTime(config.date),
    ceremonyName: config.ceremony.name,
    ceremonyAddress: config.ceremony.address,
    receptionName: config.reception.name,
    receptionAddress: config.reception.address,
    rsvpDeadline: formatDeadline(config.rsvpDeadline),
    honeymoonDesc: config.honeymoon.description,
    honeymoonTransferLabel: config.honeymoon.bankTransfer.label,
    honeymoonTransferValue: config.honeymoon.bankTransfer.value,
    honeymoonTransferAction: `Copiar ${config.honeymoon.bankTransfer.label}`,
    footerText: config.footer.text,
  };

  for (const [key, value] of Object.entries(map)) {
    $$(`[data-bind="${key}"]`).forEach((el) => {
      el.textContent = value;
    });
  }

  bindImage("ceremonyPhoto", {
    src: config.ceremony.photo,
    alt: config.ceremony.name,
  });
  bindImage("honeymoonPhoto", config.honeymoon.image);
}

function bindImage(key, image) {
  $$(`[data-bind-src='${key}']`).forEach((el) => {
    const src = image?.src;
    if (isPlaceholder(src)) {
      el.hidden = true;
      return;
    }
    el.onerror = () => {
      el.hidden = true;
    };
    el.hidden = false;
    el.src = src;
    el.alt = image?.alt || "";
  });
}

/* =========================================================
   Maps deep-links
   ========================================================= */

function buildMapLinks({ lat, lng, name, address }) {
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0);
  // Without coords, search by "<place name>, <town>" so the pin lands on the
  // actual venue (e.g. "Capela de Nossa Senhora do Mar, Zambujeira do Mar")
  // and not on the town centre.
  const q = hasCoords ? `${lat},${lng}` : encodeURIComponent(`${name}, ${address}`);
  return {
    google: `https://www.google.com/maps/search/?api=1&query=${q}`,
    apple: hasCoords
      ? `http://maps.apple.com/?ll=${lat},${lng}&q=${encodeURIComponent(name)}`
      : `http://maps.apple.com/?q=${q}`,
    waze: hasCoords
      ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
      : `https://waze.com/ul?q=${q}&navigate=yes`,
  };
}

function applyMapLinks(venue) {
  const links = buildMapLinks(venue);
  $$("[data-map]").forEach((el) => {
    el.href = links[el.dataset.map];
  });
}

/* =========================================================
   Calendar (.ics) generation
   ========================================================= */

function pad(n) {
  return String(n).padStart(2, "0");
}

function toIcsDate(d) {
  // UTC format: YYYYMMDDTHHMMSSZ
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

function toIcsLocalDateTime(iso) {
  const match = String(iso).match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/,
  );

  if (!match) return toIcsDate(new Date(iso));

  const [, year, month, day, hour, minute, second = "00"] = match;
  return `${year}${month}${day}T${hour}${minute}${second}`;
}

function escapeIcsText(text) {
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function toIcsDuration(start, end) {
  const minutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `PT${hours ? `${hours}H` : ""}${remainingMinutes ? `${remainingMinutes}M` : ""}`;
}

function buildIcs() {
  const start = new Date(config.date);
  const end = new Date(config.endDate);
  const timeZone = config.calendarTimeZone || "Europe/Lisbon";

  // Stable UID for this corrected import shape; avoids iOS reusing older cached
  // zero-duration imports that used the first UID.
  const uid = `eugenia-joao-${start.getUTCFullYear()}-10h@wedding.invite`;
  const summary = `Casamento — ${config.couple.bride} & ${config.couple.groom}`;
  const description = `Casamento de ${config.couple.bride} e ${config.couple.groom}. Cerimónia em ${config.ceremony.name}; receção em ${config.reception.name}.`;
  const location = `${config.ceremony.name}, ${config.ceremony.address}`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//wedding-invite//PT",
    "METHOD:PUBLISH",
    "CALSCALE:GREGORIAN",
    `X-WR-TIMEZONE:${timeZone}`,
    "BEGIN:VTIMEZONE",
    `TZID:${timeZone}`,
    "BEGIN:DAYLIGHT",
    "TZOFFSETFROM:+0000",
    "TZOFFSETTO:+0100",
    "TZNAME:WEST",
    "DTSTART:19700329T010000",
    "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
    "END:DAYLIGHT",
    "BEGIN:STANDARD",
    "TZOFFSETFROM:+0100",
    "TZOFFSETTO:+0000",
    "TZNAME:WET",
    "DTSTART:19701025T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
    "END:STANDARD",
    "END:VTIMEZONE",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `LAST-MODIFIED:${toIcsDate(new Date())}`,
    "SEQUENCE:2",
    `DTSTART;TZID=${timeZone}:${toIcsLocalDateTime(config.date)}`,
    `DURATION:${toIcsDuration(start, end)}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `LOCATION:${escapeIcsText(location)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return `${lines.join("\r\n")}\r\n`;
}

function setupCalendar() {
  const btn = $("[data-action='add-to-calendar']");
  if (!btn) return;

  btn.addEventListener("click", () => {
    if (isPlaceholder(config.date)) return;
    const ics = buildIcs();
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "casamento-eugenia-joao.ics";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}

function setupHoneymoonCopy() {
  const btn = $("[data-action='copy-transfer']");
  if (!btn) return;

  const transfer = config.honeymoon.bankTransfer;
  btn.addEventListener("click", async () => {
    if (!transfer.value || isPlaceholder(transfer.value)) {
      btn.textContent = `${transfer.label} por confirmar`;
      return;
    }

    try {
      await navigator.clipboard.writeText(transfer.value);
      btn.textContent = `${transfer.label} copiado`;
    } catch (err) {
      btn.textContent = `Copia manualmente o ${transfer.label}`;
    }

    setTimeout(() => {
      btn.textContent = `Copiar ${transfer.label}`;
    }, 2400);
  });
}

/* =========================================================
   Dialogs (maps + RSVP)
   ========================================================= */

function setupDialogs() {
  const mapsDialog = $("#maps-dialog");
  const rsvpDialog = $("#rsvp-dialog");

  $$("[data-action='open-maps']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const which = btn.dataset.venue; // "ceremony" or "reception"
      const venue = config[which];
      if (venue) applyMapLinks(venue);
      mapsDialog?.showModal();
    });
  });

  $("[data-action='open-rsvp']")?.addEventListener("click", () => {
    rsvpDialog?.showModal();
  });

  $("[data-action='close-rsvp']")?.addEventListener("click", () => {
    rsvpDialog?.close();
  });

  // Close when clicking the backdrop (outside .sheet__inner).
  for (const dlg of [mapsDialog, rsvpDialog]) {
    dlg?.addEventListener("click", (e) => {
      if (e.target === dlg) dlg.close();
    });
  }
}

/* =========================================================
   RSVP
   ========================================================= */

const RSVP_MIN_DWELL_MS = 2000;
let pageLoadAt = 0;

function setupRsvpToggles() {
  // Conditional fields driven by checkboxes (e.g. "+1 name", kids list).
  $$("[data-toggle]").forEach((cb) => {
    const target = $(`[data-when="${cb.dataset.toggle}"]`);
    if (!target) return;
    const sync = () => {
      target.hidden = !cb.checked;
    };
    cb.addEventListener("change", sync);
    sync();
  });
}

function makeKidRow() {
  const row = document.createElement("div");
  row.className = "kid-row";
  row.innerHTML = `
    <input type="text" name="kidName[]" placeholder="Nome" />
    <input type="text" name="kidAge[]" placeholder="Idade" inputmode="numeric" />
    <button type="button" aria-label="Remover">×</button>
  `;
  row.querySelector("button").addEventListener("click", () => row.remove());
  return row;
}

function setupKids() {
  const list = $("[data-kids]");
  const addBtn = $("[data-action='add-kid']");
  const kidsToggle = $("[name='hasKids']");
  if (!list || !addBtn) return;
  const ensureFirstKidRow = () => {
    if (kidsToggle?.checked && list.children.length === 0) {
      list.appendChild(makeKidRow());
    }
  };
  addBtn.addEventListener("click", () => {
    list.appendChild(makeKidRow());
  });
  kidsToggle?.addEventListener("change", ensureFirstKidRow);
  ensureFirstKidRow();
}

function setupDeadline() {
  if (isPlaceholder(config.rsvpDeadline)) return;
  const deadline = new Date(config.rsvpDeadline);
  // Treat the deadline as end-of-day local time.
  deadline.setHours(23, 59, 59, 999);
  if (Date.now() <= deadline.getTime()) return;

  $(".rsvp__form").hidden = true;
  $(".rsvp__closed").hidden = false;
}

function setupRsvpSubmit() {
  const form = $(".rsvp__form");
  if (!form) return;
  const status = $(".rsvp__status");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.className = "rsvp__status";
    status.textContent = "";

    // Anti-spam: honeypot must be empty + minimum dwell time.
    const data = new FormData(form);
    if (data.get("website")) return; // bot
    if (Date.now() - pageLoadAt < RSVP_MIN_DWELL_MS) return; // bot

    const name = String(data.get("name") || "").trim();
    if (!name) {
      status.className = "rsvp__status is-error";
      status.textContent = "Indica o teu nome para continuar.";
      form.elements.name?.focus();
      return;
    }

    const attending = data.get("attending");
    if (!attending) {
      status.className = "rsvp__status is-error";
      status.textContent = "Indica se vais estar presente.";
      form.querySelector("[name='attending']")?.focus();
      return;
    }

    if (isPlaceholder(config.rsvpEndpoint)) {
      status.className = "rsvp__status is-error";
      status.textContent = "Endpoint não configurado. Avisa os anfitriões.";
      return;
    }

    // Aggregate kid rows into structured fields.
    const kidNames = data.getAll("kidName[]");
    const kidAges = data.getAll("kidAge[]");
    const hasKids = Boolean(data.get("hasKids"));
    const kids = hasKids
      ? kidNames
          .map((n, i) => ({ name: n, age: kidAges[i] || "" }))
          .filter((k) => k.name.trim())
      : [];

    const payload = new URLSearchParams({
      name,
      attending,
      hasPlusOne: data.get("hasPlusOne") ? "yes" : "no",
      plusOneName: data.get("plusOneName") || "",
      hasKids: hasKids ? "yes" : "no",
      kids: JSON.stringify(kids),
      dietary: data.get("dietary") || "",
      submittedAt: new Date().toISOString(),
    });

    status.textContent = "A enviar…";

    try {
      const res = await fetch(config.rsvpEndpoint, {
        method: "POST",
        // application/x-www-form-urlencoded avoids CORS preflight.
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: payload.toString(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      status.className = "rsvp__status is-success";
      status.textContent = "Recebido — obrigado!";
      form.reset();
      // Re-sync conditional fields after reset.
      $$("[data-toggle]").forEach((cb) => cb.dispatchEvent(new Event("change")));
    } catch (err) {
      status.className = "rsvp__status is-error";
      status.textContent = "Não foi possível enviar. Tenta novamente.";
    }
  });
}

/* =========================================================
   Gallery carousel & important info rendering
   ========================================================= */

function renderGallery() {
  const track = $("[data-gallery]");
  const carousel = $("[data-gallery-carousel]");
  const prev = $("[data-gallery-prev]");
  const next = $("[data-gallery-next]");
  if (!track) return;
  if (!config.gallery.length) {
    track.closest("section").hidden = true;
    return;
  }

  track.closest("section").hidden = false;

  track.innerHTML = config.gallery
    .map((src, i) => `<img src="${src}" alt="Foto ${i + 1} de Eugénia e João" loading="lazy" />`)
    .join("");

  if (!carousel || !prev || !next) return;

  if (config.gallery.length < 2) {
    prev.hidden = true;
    next.hidden = true;
    return;
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const slideCount = config.gallery.length;
  let autoAdvance = 0;

  const getSlideStep = () => {
    const slide = track.querySelector("img");
    if (!slide) return track.clientWidth;
    const styles = window.getComputedStyle(track);
    return slide.getBoundingClientRect().width + parseFloat(styles.columnGap || styles.gap || 0);
  };
  const getCurrentIndex = () => Math.round(track.scrollLeft / getSlideStep());
  const goToSlide = (index, behavior = "smooth") => {
    const wrappedIndex = (index + slideCount) % slideCount;
    track.scrollTo({
      left: wrappedIndex * getSlideStep(),
      behavior: prefersReducedMotion ? "auto" : behavior,
    });
  };
  const scrollBySlide = (direction) => {
    goToSlide(getCurrentIndex() + direction);
  };
  const stopAutoAdvance = () => {
    window.clearInterval(autoAdvance);
    autoAdvance = 0;
  };
  const startAutoAdvance = () => {
    if (prefersReducedMotion || autoAdvance) return;
    autoAdvance = window.setInterval(() => {
      if (document.hidden || track.matches(":hover")) return;
      goToSlide(getCurrentIndex() + 1);
    }, 2000);
  };

  prev.addEventListener("click", () => {
    stopAutoAdvance();
    scrollBySlide(-1);
    startAutoAdvance();
  });
  next.addEventListener("click", () => {
    stopAutoAdvance();
    scrollBySlide(1);
    startAutoAdvance();
  });
  track.addEventListener("pointerdown", stopAutoAdvance);
  track.addEventListener("pointerup", startAutoAdvance);
  track.addEventListener("touchend", startAutoAdvance, { passive: true });
  window.addEventListener("resize", () => goToSlide(getCurrentIndex(), "auto"), { passive: true });
  startAutoAdvance();
}

function renderImportantInfo() {
  const list = $("[data-important-info]");
  if (!list) return;
  if (!config.importantInfo.length) {
    list.parentElement.hidden = true;
    return;
  }
  list.innerHTML = config.importantInfo
    .map(
      ({ q, a }) => `
        <details>
          <summary>${q}</summary>
          <p>${a}</p>
        </details>
      `,
    )
    .join("");
}

/* =========================================================
   Envelope scroll-driven animation
   Drives the --progress CSS variable on each frame based on how far
   the user has scrolled through the hero section.
   ========================================================= */

function setupAnimationFallback() {
  const hero = $(".hero");
  const envelope = $(".envelope");
  const root = document.documentElement;
  if (!hero) return;

  let raf = 0;
  let lastSettled = false;
  const update = () => {
    raf = 0;
    const rect = hero.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    if (total <= 0) return;
    const progressed = Math.min(Math.max(-rect.top / total, 0), 1);
    root.style.setProperty("--progress", progressed.toFixed(4));

    /* The card only counts as settled after the geometric slide-out is
       complete, not merely after the first movement phase starts. */
    const settled = progressed >= 0.9;
    if (settled !== lastSettled) {
      envelope?.classList.toggle("is-settled", settled);
      lastSettled = settled;
    }
  };

  const onScroll = () => {
    if (raf) return;
    raf = requestAnimationFrame(update);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  update();
}

/* =========================================================
   Init
   ========================================================= */

pageLoadAt = Date.now();

bindContent();
setupCalendar();
setupHoneymoonCopy();
setupDialogs();
setupRsvpToggles();
setupKids();
setupDeadline();
setupRsvpSubmit();
renderGallery();
renderImportantInfo();
setupAnimationFallback();
