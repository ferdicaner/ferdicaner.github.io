(function () {
  const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESC[c]);
  const has = (v) => String(v ?? "").trim() !== "";
  const lines = (s) => esc(s).replace(/\n/g, "<br>");

  function safeUrl(raw) {
    const v = String(raw || "").trim();
    if (!v) return "";
    try {
      const url = new URL(/^https?:\/\//i.test(v) ? v : "https://" + v);
      return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
    } catch {
      return "";
    }
  }

  const displayUrl = (raw) => String(raw || "").trim().replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");

  function onAccent(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || "").trim());
    if (!m) return "#ffffff";
    const n = parseInt(m[1], 16);
    const lin = (c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    const L = 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
    return L > 0.36 ? "#1d1d1f" : "#ffffff";
  }

  const ICON = {
    email: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M11 18h2"/></svg>',
    location: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.1-7-11.5a7 7 0 0 1 14 0C19 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"/></svg>',
    website: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>'
  };

  function contacts(b) {
    const out = [];
    if (has(b.email)) out.push({ icon: "email", text: b.email.trim(), href: "mailto:" + b.email.trim() });
    if (has(b.phone)) out.push({ icon: "phone", text: b.phone.trim(), href: "tel:" + b.phone.replace(/[^\d+]/g, "") });
    if (has(b.location)) out.push({ icon: "location", text: b.location.trim() });
    if (has(b.linkedin)) out.push({ icon: "linkedin", text: displayUrl(b.linkedin), href: safeUrl(b.linkedin) });
    if (has(b.website)) out.push({ icon: "website", text: displayUrl(b.website), href: safeUrl(b.website) });
    return out;
  }

  const breakable = (text) => esc(text).replace(/@/g, "<wbr>@").replace(/\//g, "/<wbr>");

  const contactItem = (c) =>
    `<li>${ICON[c.icon]}${c.href ? `<a href="${esc(c.href)}" target="_blank" rel="noopener">${breakable(c.text)}</a>` : `<span>${breakable(c.text)}</span>`}</li>`;

  const contactList = (b) => {
    const list = contacts(b);
    return list.length ? `<ul class="r-contact">${list.map(contactItem).join("")}</ul>` : "";
  };

  function entry(it) {
    const bullets = (it.bullets || []).filter(has);
    const dates = [it.start, it.end].filter(has).map((s) => s.trim()).join(" – ");
    return `<article class="r-entry">
      ${has(it.title) ? `<h3>${esc(it.title)}</h3>` : ""}
      ${has(it.subtitle) ? `<p class="r-org">${esc(it.subtitle)}</p>` : ""}
      ${dates || has(it.location) ? `<div class="r-meta"><span>${esc(dates)}</span><span class="r-right">${esc(it.location)}</span></div>` : ""}
      ${has(it.description) ? `<p class="r-desc">${lines(it.description)}</p>` : ""}
      ${bullets.length && has(it.label) ? `<p class="r-label">${esc(it.label)}</p>` : ""}
      ${bullets.length ? `<ul class="r-bullets">${bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}
    </article>`;
  }

  const pills = (tags) => `<div class="r-pills">${tags.map((t) => `<span>${esc(t)}</span>`).join("")}</div>`;

  function tagsBody(sec) {
    const groups = (sec.groups || [])
      .map((g) => ({ label: g.label, tags: (g.tags || []).filter(has) }))
      .filter((g) => g.tags.length);
    if (!groups.length) return "";
    if (!groups.some((g) => has(g.label))) return pills(groups.flatMap((g) => g.tags));
    return `<div class="r-taggroups">${groups
      .map((g) => `<p class="r-group">${esc(g.label)}</p>${pills(g.tags)}`)
      .join("")}</div>`;
  }

  function authors(text, name) {
    const safe = esc(text);
    const n = esc(name).trim();
    return n ? safe.split(n).join(`<b>${n}</b>`) : safe;
  }

  function publication(it, name) {
    const kind = [it.kind, it.year].filter(has).join(" · ");
    return `<article class="r-pub">
      ${kind ? `<p class="r-kind">${esc(kind)}</p>` : ""}
      ${has(it.title) ? `<h4>${esc(it.title)}</h4>` : ""}
      ${has(it.authors) ? `<p class="r-authors">${authors(it.authors, name)}</p>` : ""}
      ${has(it.venue) ? `<p class="r-venue">${esc(it.venue)}</p>` : ""}
    </article>`;
  }

  function compactRow(it) {
    return `<div class="r-row">
      <div><p class="r-row-title">${esc(it.title)}</p>${has(it.detail) ? `<p class="r-row-detail">${esc(it.detail)}</p>` : ""}</div>
      ${has(it.date) ? `<span class="r-row-date">${esc(it.date)}</span>` : ""}
    </div>`;
  }

  function sectionBody(sec, name) {
    const items = sec.items || [];
    switch (sec.type) {
      case "entries": {
        const list = items.filter((it) => has(it.title) || has(it.subtitle) || (it.bullets || []).some(has));
        return list.map(entry).join("");
      }
      case "tags":
        return tagsBody(sec);
      case "publications": {
        const list = items.filter((it) => has(it.title));
        return list.length ? `<div class="r-pubs">${list.map((it) => publication(it, name)).join("")}</div>` : "";
      }
      case "compact": {
        const list = items.filter((it) => has(it.title) || has(it.detail));
        return list.length ? `<div class="r-compact">${list.map(compactRow).join("")}</div>` : "";
      }
      case "text":
        return has(sec.body) ? `<p class="r-text">${lines(sec.body)}</p>` : "";
      default:
        return "";
    }
  }

  function section(sec, name) {
    const body = sectionBody(sec, name);
    if (!body) return "";
    return `<section class="r-section r-${sec.type}">${has(sec.title) ? `<h2>${esc(sec.title)}</h2>` : ""}<div class="r-body">${body}</div></section>`;
  }

  function heading(b, roleClass) {
    return `${has(b.name) ? `<h1>${esc(b.name)}</h1>` : ""}${has(b.title) ? `<p class="${roleClass}">${esc(b.title)}</p>` : ""}${has(b.summary) ? `<p class="r-summary">${lines(b.summary)}</p>` : ""}`;
  }

  function classic(r) {
    const b = r.basics;
    return `<header class="r-hero">${heading(b, "r-role")}</header>
      ${contactList(b)}
      ${r.sections.map((s) => section(s, b.name)).join("")}`;
  }

  const SIDE_TYPES = new Set(["tags", "compact"]);

  function sidebar(r) {
    const b = r.basics;
    const side = r.sections.filter((s) => SIDE_TYPES.has(s.type));
    const main = r.sections.filter((s) => !SIDE_TYPES.has(s.type));
    const contact = contactList(b);
    return `<aside class="r-aside">
        ${contact ? `<section class="r-section"><h2>Contact</h2><div class="r-body">${contact}</div></section>` : ""}
        ${side.map((s) => section(s, b.name)).join("")}
      </aside>
      <div class="r-main">
        <header class="r-head">${heading(b, "r-role")}</header>
        ${main.map((s) => section(s, b.name)).join("")}
      </div>`;
  }

  const TEMPLATES = { classic, sidebar };

  window.ResumeRender = {
    esc,
    onAccent,
    render(resume) {
      const name = TEMPLATES[resume.design.template] ? resume.design.template : "classic";
      return { className: `r r-${name}`, html: TEMPLATES[name](resume) };
    }
  };
})();
