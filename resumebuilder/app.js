(function () {
  "use strict";

  const { esc, onAccent, render } = window.ResumeRender;

  const STORAGE_KEY = "resume-builder:v1";
  const PDF_TIP_KEY = "resume-builder:pdf-tip-hidden";
  const PAPER_WIDTH = 816;
  const SWATCHES = ["#313d4f", "#1f3a5f", "#0f5c5c", "#2f5d3a", "#6b2737", "#5b3f8c", "#2b2b2b"];
  const FONTS = ["Ubuntu", "Lato", "Roboto", "Source Sans 3", "Merriweather"];
  const BASIC_KEYS = ["name", "title", "summary", "email", "phone", "location", "linkedin", "website"];

  const TYPES = {
    entries: {
      label: "Entries",
      hint: "Experience, education, projects, volunteering",
      title: "Experience",
      add: "Add entry",
      item: () => ({ title: "", subtitle: "", start: "", end: "", location: "", description: "", label: "", bullets: [""] })
    },
    tags: { label: "Tags", hint: "Skills, tools, interests", title: "Skills" },
    publications: {
      label: "Publications",
      hint: "Papers, theses, articles",
      title: "Publications",
      add: "Add publication",
      item: () => ({ kind: "Journal", year: "", title: "", authors: "", venue: "" })
    },
    compact: {
      label: "Short list",
      hint: "Certifications, languages, awards",
      title: "Certifications",
      add: "Add item",
      item: () => ({ title: "", detail: "", date: "" })
    },
    text: { label: "Text", hint: "A free paragraph", title: "About" }
  };

  const $ = (sel) => document.querySelector(sel);
  const app = $("#app");
  const editor = $("#editor");
  const preview = $("#preview");
  const paperWrap = $("#paperWrap");
  const paper = $("#paper");
  const select = $("#resumeSelect");
  const importInput = $("#importFile");
  const pdfDialog = $("#pdfDialog");
  const statusEl = $("#status");
  const toastEl = $("#toast");
  const installBtn = $("#installBtn");

  const uid = () => Math.random().toString(36).slice(2, 10);
  const str = (v) => (typeof v === "string" ? v : v == null ? "" : String(v));
  const icon = (name, cls = "i") => `<svg class="${cls}"><use href="#i-${name}"/></svg>`;
  const clone = (v) => JSON.parse(JSON.stringify(v));

  function stripIds(value) {
    if (Array.isArray(value)) return value.map(stripIds);
    if (value && typeof value === "object") {
      const out = {};
      for (const [k, v] of Object.entries(value)) if (k !== "id") out[k] = stripIds(v);
      return out;
    }
    return value;
  }

  /* Data model */

  function normalizeItem(type, raw) {
    const it = raw && typeof raw === "object" ? raw : {};
    const id = it.id || uid();
    if (type === "publications") {
      return { id, kind: str(it.kind), year: str(it.year), title: str(it.title), authors: str(it.authors), venue: str(it.venue) };
    }
    if (type === "compact") return { id, title: str(it.title), detail: str(it.detail), date: str(it.date) };
    return {
      id,
      title: str(it.title),
      subtitle: str(it.subtitle),
      start: str(it.start),
      end: str(it.end),
      location: str(it.location),
      description: str(it.description),
      label: str(it.label),
      bullets: Array.isArray(it.bullets) ? it.bullets.map(str) : []
    };
  }

  function normalizeSection(raw) {
    const s = raw && typeof raw === "object" ? raw : {};
    const type = TYPES[s.type] ? s.type : "entries";
    const out = { id: s.id || uid(), type, title: s.title == null ? TYPES[type].title : str(s.title) };
    if (type === "tags") {
      out.groups = (Array.isArray(s.groups) ? s.groups : []).map((g) => ({
        id: (g && g.id) || uid(),
        label: str(g && g.label),
        tags: Array.isArray(g && g.tags) ? g.tags.map(str).filter((t) => t.trim()) : []
      }));
    } else if (type === "text") {
      out.body = str(s.body);
    } else {
      out.items = (Array.isArray(s.items) ? s.items : []).map((it) => normalizeItem(type, it));
    }
    return out;
  }

  function normalize(raw) {
    const r = raw && typeof raw === "object" ? raw : {};
    const d = r.design || {};
    const b = r.basics || {};
    return {
      id: r.id || uid(),
      design: {
        template: d.template === "sidebar" ? "sidebar" : "classic",
        accent: /^#[0-9a-f]{6}$/i.test(d.accent) ? d.accent : SWATCHES[0],
        font: FONTS.includes(d.font) ? d.font : FONTS[0]
      },
      basics: Object.fromEntries(BASIC_KEYS.map((k) => [k, str(b[k])])),
      sections: (Array.isArray(r.sections) ? r.sections : []).map(normalizeSection)
    };
  }

  const fresh = (resume) => normalize(stripIds(clone(resume)));

  function blankResume() {
    return normalize({
      basics: {
        name: "Your Name",
        title: "Professional Title",
        summary: "Two or three sentences about your experience, strengths, and what you are looking for next."
      },
      sections: [
        {
          type: "entries",
          title: "Work Experience",
          items: [{ title: "Job Title", subtitle: "Company", start: "01/2024", end: "Present", location: "City, Country", label: "Achievements/Tasks", bullets: ["Describe a result you achieved, with a number if you can."] }]
        },
        {
          type: "entries",
          title: "Education",
          items: [{ title: "Degree", subtitle: "School", start: "09/2016", end: "06/2020", location: "City, Country" }]
        },
        { type: "tags", title: "Skills", groups: [{ label: "", tags: ["Skill one", "Skill two", "Skill three"] }] }
      ]
    });
  }

  /* Storage */

  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (data && Array.isArray(data.resumes) && data.resumes.length) {
        const resumes = data.resumes.map(normalize);
        return { resumes, activeId: resumes.some((r) => r.id === data.activeId) ? data.activeId : resumes[0].id };
      }
    } catch {
      /* fall through to the sample data */
    }
    const resumes = (window.SEED_RESUMES || []).map(normalize);
    if (!resumes.length) resumes.push(blankResume());
    return { resumes, activeId: resumes[0].id };
  }

  const store = load();
  const active = () => store.resumes.find((r) => r.id === store.activeId) || store.resumes[0];

  let saveTimer;

  function save() {
    clearTimeout(saveTimer);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
      setStatus("Saved in this browser");
    } catch {
      setStatus("Not saved. Export a JSON backup.");
    }
  }

  function scheduleSave() {
    setStatus("Saving…");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 400);
  }

  const setStatus = (text) => (statusEl.textContent = text);

  let toastTimer;
  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2400);
  }

  /* Paths into the active resume, e.g. "sections.0.items.2.bullets" */

  const getAt = (path) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), active());

  function setAt(path, value) {
    const keys = path.split(".");
    const last = keys.pop();
    keys.reduce((o, k) => o[k], active())[last] = value;
  }

  /* Editor UI state */

  const collapsedSections = new Set();
  const expandedItems = new Set();
  let pendingFocus = null;

  function field(label, path, value, opts = {}) {
    const control = opts.area
      ? `<textarea data-path="${path}" rows="${opts.rows || 3}" placeholder="${esc(opts.placeholder)}">${esc(value)}</textarea>`
      : `<input type="${opts.type || "text"}" data-path="${path}" value="${esc(value)}" placeholder="${esc(opts.placeholder)}" autocomplete="off">`;
    return `<label class="field${opts.wide ? " wide" : ""}"><span>${esc(label)}</span>${control}</label>`;
  }

  function designCard(r) {
    const d = r.design;
    const tpl = (value, name) =>
      `<button type="button" class="tpl" data-action="template" data-value="${value}" aria-pressed="${d.template === value}">
        <span class="thumb thumb-${value}"><i></i><i></i><i></i><i></i></span><span>${name}</span>
      </button>`;
    const swatches = SWATCHES.map(
      (c) => `<button type="button" class="swatch" style="background:${c}" data-action="accent" data-value="${c}" aria-pressed="${c === d.accent.toLowerCase()}" aria-label="Accent color ${c}"></button>`
    ).join("");
    return `<section class="card" style="--accent:${d.accent}">
      <div class="card-head"><h2 class="card-title">Design</h2></div>
      <div class="card-body">
        <p class="field-label">Template</p>
        <div class="templates">${tpl("classic", "Header block")}${tpl("sidebar", "Sidebar")}</div>
        <p class="field-label">Accent color</p>
        <div class="swatches">
          ${swatches}
          <label class="custom-color" title="Custom color"><span class="sr-only">Custom accent color</span><input type="color" data-path="design.accent" value="${d.accent}"></label>
        </div>
        <p class="field-label">Font</p>
        <select data-path="design.font" aria-label="Font">${FONTS.map((f) => `<option${f === d.font ? " selected" : ""}>${f}</option>`).join("")}</select>
      </div>
    </section>`;
  }

  function basicsCard(r) {
    const b = r.basics;
    const f = (label, key, opts) => field(label, `basics.${key}`, b[key], opts);
    return `<section class="card">
      <div class="card-head"><h2 class="card-title">Personal details</h2></div>
      <div class="card-body"><div class="fields">
        ${f("Full name", "name")}
        ${f("Job title", "title")}
        ${f("Email", "email", { type: "email" })}
        ${f("Phone", "phone", { type: "tel" })}
        ${f("Location", "location")}
        ${f("LinkedIn", "linkedin", { placeholder: "linkedin.com/in/…" })}
        ${f("Website", "website", { wide: true, placeholder: "example.com" })}
        ${f("Summary", "summary", { wide: true, area: true, rows: 5 })}
      </div></div>
    </section>`;
  }

  function summaryOf(type, it) {
    const parts = type === "publications" ? [it.title] : [it.title, type === "compact" ? it.detail : it.subtitle];
    return parts.filter((p) => str(p).trim()).join(" — ") || "Untitled";
  }

  function itemFields(type, it, path) {
    const f = (label, key, opts) => field(label, `${path}.${key}`, it[key], opts);
    if (type === "publications") {
      return `<div class="fields">
        ${f("Type", "kind", { placeholder: "Journal" })}
        ${f("Year", "year")}
        ${f("Title", "title", { wide: true, area: true, rows: 2 })}
        ${f("Authors", "authors", { wide: true, area: true, rows: 2 })}
        ${f("Journal or venue", "venue", { wide: true })}
      </div>`;
    }
    if (type === "compact") {
      return `<div class="fields">${f("Title", "title", { wide: true })}${f("Detail", "detail")}${f("Date", "date")}</div>`;
    }
    const bullets = it.bullets
      .map(
        (b, k) => `<div class="bullet">
          <span class="grip grip-bullet" title="Drag to reorder">${icon("grip")}</span>
          <textarea data-path="${path}.bullets.${k}" rows="2" aria-label="Bullet ${k + 1}">${esc(b)}</textarea>
          <button type="button" class="icon-btn danger" data-action="remove-at" data-path="${path}.bullets" data-index="${k}" aria-label="Delete bullet">${icon("x")}</button>
        </div>`
      )
      .join("");
    return `<div class="fields">
        ${f("Title or role", "title")}
        ${f("Organization", "subtitle")}
        ${f("Start", "start", { placeholder: "MM/YYYY" })}
        ${f("End", "end", { placeholder: "Present" })}
        ${f("Location or note", "location", { wide: true })}
        ${f("Description", "description", { wide: true, area: true, rows: 2 })}
        ${f("List heading", "label", { wide: true, placeholder: "Achievements/Tasks" })}
      </div>
      <p class="field-label">Bullet points</p>
      <div class="bullets" data-list="${path}.bullets" data-handle=".grip-bullet">${bullets}</div>
      <button type="button" class="btn small dashed list-add" data-action="add-bullet" data-path="${path}.bullets">${icon("plus")}Add bullet</button>`;
  }

  function itemCard(type, it, listPath, j) {
    const open = expandedItems.has(it.id);
    return `<div class="item">
      <div class="item-head" role="button" tabindex="0" data-action="toggle-item" data-id="${it.id}" aria-expanded="${open}">
        <span class="grip grip-item" title="Drag to reorder">${icon("grip")}</span>
        <span class="item-summary" data-summary="${it.id}">${esc(summaryOf(type, it))}</span>
        <button type="button" class="icon-btn" data-action="duplicate-at" data-path="${listPath}" data-index="${j}" aria-label="Duplicate">${icon("copy")}</button>
        <button type="button" class="icon-btn danger" data-action="remove-at" data-path="${listPath}" data-index="${j}" aria-label="Delete">${icon("trash")}</button>
        <span class="icon-btn" aria-hidden="true">${icon("chevron", "i chevron")}</span>
      </div>
      <div class="item-body"${open ? "" : " hidden"}>${itemFields(type, it, `${listPath}.${j}`)}</div>
    </div>`;
  }

  function tagsEditor(s, base) {
    const groups = s.groups
      .map((g, k) => {
        const tagsPath = `${base}.groups.${k}.tags`;
        const chips = g.tags
          .map(
            (t, m) => `<span class="chip">${esc(t)}<button type="button" data-action="remove-at" data-path="${tagsPath}" data-index="${m}" aria-label="Remove ${esc(t)}">${icon("x")}</button></span>`
          )
          .join("");
        return `<div class="group">
          <div class="group-head">
            <span class="grip grip-group" title="Drag to reorder">${icon("grip")}</span>
            <input type="text" data-path="${base}.groups.${k}.label" value="${esc(g.label)}" placeholder="Group label (optional)" aria-label="Group label">
            <button type="button" class="icon-btn danger" data-action="remove-at" data-path="${base}.groups" data-index="${k}" aria-label="Delete group">${icon("trash")}</button>
          </div>
          <div class="chips" data-list="${tagsPath}" data-chips>
            ${chips}<input type="text" class="chip-input" data-tags="${tagsPath}" placeholder="Type a tag, press Enter" aria-label="Add tag">
          </div>
        </div>`;
      })
      .join("");
    return `<div class="groups" data-list="${base}.groups" data-handle=".grip-group">${groups}</div>
      <button type="button" class="btn small dashed list-add" data-action="add-group" data-path="${base}.groups">${icon("plus")}Add group</button>`;
  }

  function sectionEditor(s, base) {
    if (s.type === "text") return `<div class="fields">${field("Text", `${base}.body`, s.body, { wide: true, area: true, rows: 4 })}</div>`;
    if (s.type === "tags") return tagsEditor(s, base);
    const listPath = `${base}.items`;
    return `<div class="items" data-list="${listPath}" data-handle=".grip-item">${s.items.map((it, j) => itemCard(s.type, it, listPath, j)).join("")}</div>
      <button type="button" class="btn small dashed list-add" data-action="add-item" data-path="${listPath}" data-type="${s.type}">${icon("plus")}${TYPES[s.type].add}</button>`;
  }

  function sectionCard(s, i) {
    const open = !collapsedSections.has(s.id);
    const base = `sections.${i}`;
    return `<section class="card">
      <div class="card-head">
        <span class="grip grip-section" title="Drag to reorder">${icon("grip")}</span>
        <input type="text" class="section-title" data-path="${base}.title" value="${esc(s.title)}" aria-label="Section title">
        <span class="badge">${TYPES[s.type].label}</span>
        <button type="button" class="icon-btn" data-action="toggle-section" data-id="${s.id}" aria-expanded="${open}" aria-label="${open ? "Collapse" : "Expand"} section">${icon("chevron", "i chevron")}</button>
        <button type="button" class="icon-btn danger" data-action="remove-section" data-index="${i}" aria-label="Delete section">${icon("trash")}</button>
      </div>
      <div class="card-body"${open ? "" : " hidden"}>${sectionEditor(s, base)}</div>
    </section>`;
  }

  function addSectionControl() {
    const options = Object.entries(TYPES)
      .map(([type, t]) => `<button type="button" data-action="add-section" data-type="${type}"><span>${t.label}</span><small>${t.hint}</small></button>`)
      .join("");
    return `<div class="add-section">
      <div class="menu" id="sectionMenu" hidden>${options}</div>
      <button type="button" class="btn dashed" data-action="toggle-menu">${icon("plus")}Add section</button>
    </div>`;
  }

  function autosize(el) {
    if (!el.offsetParent) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + 2 + "px";
  }

  function renderEditor() {
    const r = active();
    const scroll = editor.scrollTop;
    editor.innerHTML =
      designCard(r) +
      basicsCard(r) +
      `<div id="sections" data-list="sections" data-handle=".grip-section">${r.sections.map(sectionCard).join("")}</div>` +
      addSectionControl();
    editor.scrollTop = scroll;
    editor.querySelectorAll("textarea").forEach(autosize);
    initSortables();
    if (pendingFocus) {
      const el = editor.querySelector(pendingFocus);
      pendingFocus = null;
      if (el) {
        el.focus({ preventScroll: true });
        el.scrollIntoView({ block: "nearest" });
      }
    }
  }

  function initSortables() {
    if (!window.Sortable) return;
    editor.querySelectorAll("[data-list]").forEach((el) => {
      const chips = el.hasAttribute("data-chips");
      const options = {
        animation: 150,
        draggable: chips ? ".chip" : ">*",
        ghostClass: "sortable-ghost",
        dragClass: "sortable-drag",
        onEnd(e) {
          const from = e.oldDraggableIndex;
          const to = e.newDraggableIndex;
          if (from == null || to == null || from === to) return;
          const list = getAt(el.dataset.list);
          list.splice(to, 0, list.splice(from, 1)[0]);
          changed(true);
        }
      };
      if (chips) {
        options.filter = "button, input";
        options.preventOnFilter = false;
      } else {
        options.handle = el.dataset.handle;
      }
      window.Sortable.create(el, options);
    });
  }

  /* Preview */

  function renderPreview() {
    const r = active();
    const out = render(r);
    paper.className = out.className;
    paper.style.setProperty("--accent", r.design.accent);
    paper.style.setProperty("--on-accent", onAccent(r.design.accent));
    paper.style.setProperty("--font", `"${r.design.font}"`);
    paper.innerHTML = out.html;
  }

  function fitPreview() {
    const pad = parseFloat(getComputedStyle(preview).paddingLeft) || 0;
    const avail = preview.clientWidth - pad * 2;
    if (avail <= 0) return;
    paperWrap.style.zoom = Math.min(1, avail / PAPER_WIDTH).toFixed(3);
  }

  function changed(structural) {
    if (structural) renderEditor();
    renderPreview();
    scheduleSave();
  }

  /* Resume switcher */

  function labels() {
    const seen = {};
    return store.resumes.map((r) => {
      const base = r.basics.name.trim() || "Untitled resume";
      seen[base] = (seen[base] || 0) + 1;
      return seen[base] > 1 ? `${base} (${seen[base]})` : base;
    });
  }

  const activeLabel = () => labels()[store.resumes.indexOf(active())];

  function refreshSwitcher() {
    const names = labels();
    select.innerHTML = store.resumes
      .map((r, i) => `<option value="${r.id}"${r.id === store.activeId ? " selected" : ""}>${esc(names[i])}</option>`)
      .join("");
  }

  function afterSwitch() {
    collapsedSections.clear();
    expandedItems.clear();
    refreshSwitcher();
    changed(true);
    editor.scrollTop = 0;
  }

  /* Import / export / PDF */

  function slug(text) {
    return (
      text
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "resume"
    );
  }

  function exportJson() {
    const r = active();
    const data = { app: "resume-builder", version: 1, design: r.design, basics: r.basics, sections: stripIds(r.sections) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug(activeLabel())}-resume.json`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("JSON backup downloaded");
  }

  async function importJson(file) {
    try {
      const data = JSON.parse(await file.text());
      const list = Array.isArray(data) ? data : Array.isArray(data && data.resumes) ? data.resumes : [data];
      const valid = list.filter((x) => x && typeof x === "object" && (x.basics || Array.isArray(x.sections)));
      if (!valid.length) throw new Error("No resume found");
      const added = valid.map(fresh);
      store.resumes.push(...added);
      store.activeId = added[0].id;
      afterSwitch();
      toast(added.length > 1 ? `Imported ${added.length} resumes` : `Imported ${activeLabel()}`);
    } catch {
      toast("That file isn't a resume JSON export");
    }
  }

  function openPdf() {
    let skipTip = false;
    try {
      skipTip = localStorage.getItem(PDF_TIP_KEY) === "1";
    } catch {
      /* show the tip */
    }
    if (skipTip) printResume();
    else pdfDialog.showModal();
  }

  function printResume() {
    if ($("#pdfDontAsk").checked) {
      try {
        localStorage.setItem(PDF_TIP_KEY, "1");
      } catch {
        /* the tip shows again next time */
      }
    }
    if (pdfDialog.open) pdfDialog.close();
    save();
    const previousTitle = document.title;
    document.title = `${activeLabel()} Resume`;
    window.addEventListener("afterprint", () => (document.title = previousTitle), { once: true });
    window.print();
  }

  /* Events */

  function updateSummary(path) {
    const m = /^(sections\.(\d+)\.items\.\d+)\.(title|subtitle|detail)$/.exec(path);
    if (!m) return;
    const item = getAt(m[1]);
    const el = editor.querySelector(`[data-summary="${item.id}"]`);
    if (el) el.textContent = summaryOf(active().sections[+m[2]].type, item);
  }

  function toggleItem(head) {
    const id = head.dataset.id;
    const open = !expandedItems.has(id);
    if (open) expandedItems.add(id);
    else expandedItems.delete(id);
    head.setAttribute("aria-expanded", String(open));
    const body = head.nextElementSibling;
    body.hidden = !open;
    if (open) body.querySelectorAll("textarea").forEach(autosize);
  }

  function addTags(input) {
    const parts = input.value.split(",").map((s) => s.trim()).filter(Boolean);
    input.value = "";
    if (!parts.length) return;
    getAt(input.dataset.tags).push(...parts);
    pendingFocus = `[data-tags="${input.dataset.tags}"]`;
    changed(true);
  }

  editor.addEventListener("input", (e) => {
    const t = e.target;
    const path = t.dataset.path;
    if (!path) return;
    setAt(path, t.value);
    if (t.tagName === "TEXTAREA") autosize(t);
    updateSummary(path);
    if (path === "basics.name") refreshSwitcher();
    changed(false);
  });

  editor.addEventListener("change", (e) => {
    if ((e.target.dataset.path || "").startsWith("design.")) renderEditor();
  });

  editor.addEventListener("keydown", (e) => {
    const t = e.target;
    if (t.dataset.tags) {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        addTags(t);
      } else if (e.key === "Backspace" && !t.value) {
        const list = getAt(t.dataset.tags);
        if (list.length) {
          list.pop();
          pendingFocus = `[data-tags="${t.dataset.tags}"]`;
          changed(true);
        }
      }
    } else if (t.classList.contains("item-head") && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      toggleItem(t);
    }
  });

  editor.addEventListener("focusout", (e) => {
    if (e.target.dataset.tags && e.target.value.trim()) addTags(e.target);
  });

  document.addEventListener("click", (e) => {
    const menu = $("#sectionMenu");
    if (menu && !menu.hidden && !e.target.closest(".add-section")) menu.hidden = true;

    const el = e.target.closest("[data-action]");
    if (!el) return;
    const r = active();
    const path = el.dataset.path;
    const index = Number(el.dataset.index);

    switch (el.dataset.action) {
      case "template":
        r.design.template = el.dataset.value;
        changed(true);
        break;
      case "accent":
        r.design.accent = el.dataset.value;
        changed(true);
        break;
      case "toggle-section": {
        const id = el.dataset.id;
        if (collapsedSections.has(id)) collapsedSections.delete(id);
        else collapsedSections.add(id);
        renderEditor();
        break;
      }
      case "toggle-item":
        toggleItem(el);
        break;
      case "remove-section": {
        const s = r.sections[index];
        if (confirm(`Delete the "${s.title || "Untitled"}" section and everything in it?`)) {
          r.sections.splice(index, 1);
          changed(true);
        }
        break;
      }
      case "remove-at":
        getAt(path).splice(index, 1);
        changed(true);
        break;
      case "duplicate-at": {
        const list = getAt(path);
        const type = r.sections[Number(path.split(".")[1])].type;
        const copy = normalizeItem(type, stripIds(clone(list[index])));
        list.splice(index + 1, 0, copy);
        expandedItems.add(copy.id);
        changed(true);
        break;
      }
      case "add-item": {
        const list = getAt(path);
        const item = normalizeItem(el.dataset.type, TYPES[el.dataset.type].item());
        list.push(item);
        expandedItems.add(item.id);
        pendingFocus = `[data-path="${path}.${list.length - 1}.title"]`;
        changed(true);
        break;
      }
      case "add-bullet": {
        const list = getAt(path);
        list.push("");
        pendingFocus = `[data-path="${path}.${list.length - 1}"]`;
        changed(true);
        break;
      }
      case "add-group": {
        const list = getAt(path);
        list.push({ id: uid(), label: "", tags: [] });
        pendingFocus = `[data-path="${path}.${list.length - 1}.label"]`;
        changed(true);
        break;
      }
      case "toggle-menu":
        menu.hidden = !menu.hidden;
        break;
      case "add-section": {
        const type = el.dataset.type;
        const t = TYPES[type];
        const s = normalizeSection({
          type,
          title: t.title,
          items: t.item ? [t.item()] : undefined,
          groups: type === "tags" ? [{ label: "", tags: [] }] : undefined
        });
        r.sections.push(s);
        (s.items || []).forEach((it) => expandedItems.add(it.id));
        pendingFocus = `[data-path="sections.${r.sections.length - 1}.title"]`;
        changed(true);
        break;
      }
      case "new-resume": {
        const created = blankResume();
        store.resumes.push(created);
        store.activeId = created.id;
        afterSwitch();
        toast("New resume created");
        break;
      }
      case "duplicate-resume": {
        const copy = fresh(r);
        store.resumes.splice(store.resumes.indexOf(r) + 1, 0, copy);
        store.activeId = copy.id;
        afterSwitch();
        toast("Resume duplicated");
        break;
      }
      case "delete-resume": {
        if (store.resumes.length === 1) {
          toast("Keep at least one resume");
          break;
        }
        if (!confirm(`Delete "${activeLabel()}"? This can't be undone.`)) break;
        const i = store.resumes.indexOf(r);
        store.resumes.splice(i, 1);
        store.activeId = store.resumes[Math.max(0, i - 1)].id;
        afterSwitch();
        toast("Resume deleted");
        break;
      }
      case "import":
        importInput.click();
        break;
      case "export":
        exportJson();
        break;
      case "pdf":
        openPdf();
        break;
      case "print":
        printResume();
        break;
      case "close-dialog":
        pdfDialog.close();
        break;
      case "install":
        if (installPrompt) {
          installPrompt.prompt();
          installPrompt = null;
          installBtn.hidden = true;
        }
        break;
      case "view":
        app.dataset.view = el.dataset.value;
        document.querySelectorAll('[data-action="view"]').forEach((b) => b.setAttribute("aria-pressed", String(b === el)));
        fitPreview();
        break;
    }
  });

  select.addEventListener("change", () => {
    store.activeId = select.value;
    afterSwitch();
  });

  importInput.addEventListener("change", () => {
    const file = importInput.files[0];
    importInput.value = "";
    if (file) importJson(file);
  });

  window.addEventListener("pagehide", save);
  new ResizeObserver(fitPreview).observe(preview);

  /* Installable app and offline support */

  let installPrompt = null;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    installPrompt = e;
    installBtn.hidden = false;
  });

  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    installBtn.hidden = true;
    toast("Resume Builder installed");
  });

  window.addEventListener("offline", () => toast("You're offline. Editing and saving still work."));

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }

  refreshSwitcher();
  renderEditor();
  renderPreview();
  fitPreview();
  save();
})();
