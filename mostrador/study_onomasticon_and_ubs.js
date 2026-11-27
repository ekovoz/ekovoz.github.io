// ============================================================================
// web/mostrador/study_onomasticon_and_ubs.js — Explorador del Onomasticon (3,657)
// y Comparador Interactivo de 6 Tradiciones Bicanonicas UBS (ORG/LXX/VUL/RSC/RSO/ENG)
// Decisiones D5-R2, D6-R2 · Cero estilos inline · Costura limpia ∂(C)=0
// ============================================================================

import { escapeHtml } from "./bridge_and_chapter.js";
import { compareUbsSixTraditions } from "./canonical_versification.js";
import { bindSurfaceActions, patchTextAndAttrs } from "./dom_patch.js";

const CURATED_ONOMASTICON_SEED = Object.freeze([
  { id: "ONO-0001", entity_class: "PERSON", strong: "H0085", name_es: "Abraham", name_en: "Abraham", original: "אַבְרָהָם", first_ref: "GEN.17.5", cv_skeleton: "VC.CV.CVC" },
  { id: "ONO-0002", entity_class: "PERSON", strong: "H8283", name_es: "Sara", name_en: "Sarah", original: "שָׂרָה", first_ref: "GEN.17.15", cv_skeleton: "CV.CV" },
  { id: "ONO-0003", entity_class: "PERSON", strong: "H3327", name_es: "Isaac", name_en: "Isaac", original: "יִצְחָק", first_ref: "GEN.17.19", cv_skeleton: "VC.CVC" },
  { id: "ONO-0010", entity_class: "PLACE", strong: "H3389", name_es: "Jerusalén", name_en: "Jerusalem", original: "יְרוּשָׁלִַם", first_ref: "JOS.10.1", cv_skeleton: "CV.CV.CV.CVC" },
  { id: "ONO-0014", entity_class: "PERSON", strong: "H1732", name_es: "David", name_en: "David", original: "דָּוִד", first_ref: "RUT.4.17", cv_skeleton: "CV.CVC" },
  { id: "ONO-0022", entity_class: "PLACE", strong: "H1035", name_es: "Belén", name_en: "Bethlehem", original: "בֵּית לֶחֶם", first_ref: "GEN.35.19", cv_skeleton: "CVC.CV.CVC" },
  { id: "ONO-0041", entity_class: "GENTILIC", strong: "H3478", name_es: "Israelita / Israel", name_en: "Israel / Israelite", original: "יִשְׂרָאֵל", first_ref: "GEN.32.28", cv_skeleton: "VC.CV.VC" },
  { id: "ONO-0055", entity_class: "GENTILIC", strong: "H3063", name_es: "Judaíta / Judá", name_en: "Judah / Judean", original: "יְהוּדָה", first_ref: "GEN.29.35", cv_skeleton: "CV.CV.CV" },
  { id: "ONO-NT-P-G2424", entity_class: "PERSON", strong: "G2424", name_es: "Jesús", name_en: "Jesus", original: "Ἰησοῦς", first_ref: "MAT.1.1", cv_skeleton: "CV.CVC" },
  { id: "ONO-NT-P-G3972", entity_class: "PERSON", strong: "G3972", name_es: "Pablo", name_en: "Paul", original: "Παῦλος", first_ref: "ACT.13.9", cv_skeleton: "CV.CVC" },
  { id: "ONO-NT-L-G1056", entity_class: "PLACE", strong: "G1056", name_es: "Galilea", name_en: "Galilee", original: "Γαλιλαία", first_ref: "MAT.2.22", cv_skeleton: "CV.CV.CV" },
  { id: "ONO-NT-G-G1672", entity_class: "GENTILIC", strong: "G1672", name_es: "Griego / Helenista", name_en: "Greek", original: "Ἕλλην", first_ref: "JHN.7.35", cv_skeleton: "VC.CVC" },
]);

function normalizeOnomasticonClass(rawClass = "", id = "") {
  const upper = String(rawClass || "").trim().toUpperCase();
  if (upper === "PERSON" || upper === "PLACE" || upper === "GENTILIC") return upper;
  if (String(id).includes("-L-")) return "PLACE";
  if (String(id).includes("-G-")) return "GENTILIC";
  return "PERSON";
}

function filterOnomasticonItems(entries = [], query = "", entityClass = "ALL", limit = 50, page = 1) {
  const list = Array.isArray(entries) && entries.length > 0 ? entries : CURATED_ONOMASTICON_SEED;
  const q = String(query || "").trim().toLowerCase();
  const cls = String(entityClass || "ALL").trim().toUpperCase();
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 24));
  const safePage = Math.max(1, Math.trunc(Number(page) || 1));
  const allMatched = [];
  for (const item of list) {
    const normCls = normalizeOnomasticonClass(item.entity_class, item.id);
    if (cls !== "ALL" && normCls !== cls) continue;
    if (q) {
      const hay = `${item.id || ""} ${item.name_es || ""} ${item.name_en || ""} ${item.strong || ""} ${item.original || ""} ${item.first_ref || ""}`.toLowerCase();
      if (!hay.includes(q)) continue;
    }
    allMatched.push({ ...item, entity_class: normCls });
  }
  const totalPages = Math.max(1, Math.ceil(allMatched.length / safeLimit));
  const clampedPage = Math.min(safePage, totalPages);
  const start = (clampedPage - 1) * safeLimit;
  return {
    items: allMatched.slice(start, start + safeLimit),
    totalMatched: allMatched.length,
    page: clampedPage,
    totalPages,
  };
}

function renderOnomasticonRowsHtml(items = [], isEn = false) {
  if (!Array.isArray(items) || items.length === 0) {
    return `<p class="onomasticon-empty">${isEn ? "No matching proper names in the active filter." : "Sin nombres propios coincidentes en el filtro activo."}</p>`;
  }
  return items
    .map(
      (r) =>
        `<div class="onomasticon-entry-row" data-onomasticon-id="${escapeHtml(r.id)}" data-onomasticon-class="${escapeHtml(r.entity_class)}">` +
        `<div class="onomasticon-entry-main">` +
        `<strong>${escapeHtml(isEn && r.name_en ? r.name_en : r.name_es)}</strong> ` +
        `<code>${escapeHtml(r.original || "")}</code> ` +
        `<span class="uls-badge">${escapeHtml(r.strong || r.id)} · ${escapeHtml(r.entity_class)}</span>` +
        `</div>` +
        `<button type="button" class="uls-chip onomasticon-jump-btn" data-onomasticon-ref="${escapeHtml(r.first_ref || "GEN.1.1")}">📖 ${escapeHtml(r.first_ref || "GEN.1.1")}</button>` +
        `</div>`,
    )
    .join("");
}

export function renderOnomasticonExplorerHtml({
  entries = CURATED_ONOMASTICON_SEED,
  totalCount = 3657,
  query = "",
  entityClass = "ALL",
  page = 1,
  pageSize = 24,
  uiLocale = "es",
} = {}) {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const cls = String(entityClass || "ALL").trim().toUpperCase();
  const safeList = Array.isArray(entries) && entries.length > 0 ? entries : CURATED_ONOMASTICON_SEED;
  const isFullHydrated = safeList.length >= 100;
  const { items: results, totalMatched, page: activePage, totalPages } = filterOnomasticonItems(
    safeList,
    query,
    cls,
    pageSize,
    page,
  );
  const effectiveTotal = Math.max(Number(totalCount) || 3657, safeList.length || 0);

  const filterButtons = [
    ["ALL", isEn ? `All (${effectiveTotal.toLocaleString("en-US")})` : `Todos (${effectiveTotal.toLocaleString("en-US")})`],
    ["PERSON", isEn ? "Anthroponyms (People)" : "Antropónimos (Personas)"],
    ["PLACE", isEn ? "Toponyms (Places)" : "Topónimos (Lugares)"],
    ["GENTILIC", isEn ? "Gentilics / Peoples" : "Gentilicios / Pueblos"],
  ]
    .map(([code, label]) => {
      const active = cls === code;
      return `<button type="button" class="uls-chip onomasticon-filter-btn${active ? " is-active" : ""}" data-onomasticon-filter="${code}" aria-pressed="${active ? "true" : "false"}">${escapeHtml(label)}</button>`;
    })
    .join(" ");

  const rowsHtml = renderOnomasticonRowsHtml(results, isEn);
  const sourceBannerText = isFullHydrated
    ? isEn
      ? `Full catalog active (${safeList.length.toLocaleString("en-US")} entries · showing ${results.length} · p.${activePage}/${totalPages})`
      : `Catálogo completo cargado (${safeList.length.toLocaleString("en-US")} nombres · mostrando ${results.length} · pág. ${activePage}/${totalPages})`
    : isEn
      ? `Curated sample (${safeList.length} of ${effectiveTotal.toLocaleString("en-US")} names)`
      : `Muestra curada (${safeList.length} de ${effectiveTotal.toLocaleString("en-US")} nombres)`;
  const pagerHtml =
    totalPages > 1
      ? `<div class="ek-row-wrap">` +
      `<button type="button" class="uls-chip" data-onomasticon-page="${Math.max(1, activePage - 1)}"${activePage <= 1 ? " disabled" : ""}>◀</button>` +
      `<button type="button" class="uls-chip" data-onomasticon-page="${Math.min(totalPages, activePage + 1)}"${activePage >= totalPages ? " disabled" : ""}>▶</button>` +
      `</div>`
      : "";

  return (
    `<section id="studyOnomasticonExplorerPanel" class="onomasticon-explorer-card" data-onomasticon-total="${effectiveTotal}" data-onomasticon-loaded-count="${safeList.length}" data-onomasticon-hydrated="${isFullHydrated ? "true" : "false"}" data-onomasticon-filter-active="${escapeHtml(cls)}" data-onomasticon-page="${activePage}">` +
    `<header class="onomasticon-explorer-header">` +
    `<strong>📛 ${isEn ? `Biblical Onomasticon Explorer (${effectiveTotal.toLocaleString("en-US")} names + NT supplement)` : `Explorador del Onomasticon Bíblico (${effectiveTotal.toLocaleString("en-US")} nombres + suplemento NT)`}</strong>` +
    `</header>` +
    `<div class="onomasticon-controls">` +
    `<input type="search" id="onomasticonSearchInput" class="field-search-input" value="${escapeHtml(query)}" aria-label="${isEn ? "Search proper names, Strong ID, or verse" : "Buscar nombres propios, Strong o pasaje"}" placeholder="${isEn ? "Search Abraham, Jerusalem, G2424, GEN.17..." : "Buscar Abraham, Jerusalén, H0085, GEN.17..."}" />` +
    `<div class="onomasticon-filter-row" role="group" aria-label="${isEn ? "Name categories" : "Categorías del Onomasticon"}">${filterButtons}</div>` +
    `</div>` +
    `<div class="onomasticon-source-banner" data-onomasticon-source="${isFullHydrated ? "full" : "sample"}" data-onomasticon-matched="${totalMatched}"><span>${escapeHtml(sourceBannerText)}</span>${pagerHtml}</div>` +
    `<div id="onomasticonResultsList" class="onomasticon-results-list" data-results-count="${results.length}">${rowsHtml}</div>` +
    `</section>`
  );
}

export function renderUbsSixTraditionsComparatorHtml({
  book = "PSA",
  chapter = 23,
  verse = 1,
  activeTradition = "ORG",
  uiLocale = "es",
} = {}) {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const cleanTrad = ["ORG", "LXX", "VUL", "RSC", "RSO", "ENG"].includes(String(activeTradition || "").toUpperCase())
    ? String(activeTradition).toUpperCase()
    : "ORG";
  const cmp = compareUbsSixTraditions(book, chapter, verse, uiLocale);

  const selectorPills = ["ORG", "LXX", "VUL", "RSC", "RSO", "ENG"]
    .map((code) => {
      const tr = cmp.traditions[code];
      const selected = code === cleanTrad;
      return (
        `<button type="button" class="uls-chip ubs-tradition-btn${selected ? " is-active" : ""}" ` +
        `data-ubs-tradition="${code}" aria-pressed="${selected ? "true" : "false"}">` +
        `${code}: <strong>${escapeHtml(tr.ref)}</strong>` +
        `</button>`
      );
    })
    .join(" ");

  const focused = cmp.traditions[cleanTrad] || cmp.traditions.ORG;
  const tableRows = ["ORG", "LXX", "VUL", "RSC", "RSO", "ENG"]
    .map((code) => {
      const tr = cmp.traditions[code];
      return (
        `<tr data-ubs-row="${code}" data-ubs-divergent="${tr.divergesFromEng ? "true" : "false"}">` +
        `<td><code>${code}</code></td>` +
        `<td>${escapeHtml(tr.label)}</td>` +
        `<td><strong>${escapeHtml(tr.ref)}</strong></td>` +
        `<td>${escapeHtml(tr.note)}</td>` +
        `</tr>`
      );
    })
    .join("");

  return (
    `<section id="studyUbsComparatorPanel" class="ubs-comparator-card" data-ubs-regime="${escapeHtml(cmp.regime)}" data-ubs-has-divergence="${cmp.hasDivergence ? "true" : "false"}" data-active-tradition="${escapeHtml(cleanTrad)}">` +
    `<header class="ubs-comparator-header">` +
    `<strong>⚖️ ${isEn ? "Parallel Verse & Chapter Numbering (6 Traditions)" : "Numeración en Biblias y Manuscritos Paralelos (6 tradiciones)"}</strong>` +
    `<span class="uls-badge">${escapeHtml(cmp.summary)}</span>` +
    `</header>` +
    `<div class="ubs-tradition-pills" role="group" aria-label="${isEn ? "Select UBS Tradition" : "Seleccionar tradición UBS"}">${selectorPills}</div>` +
    `<p class="ubs-focused-note" data-focused-tradition="${escapeHtml(cleanTrad)}">` +
    `<strong>${escapeHtml(cleanTrad)} · ${escapeHtml(focused.ref)}:</strong> ${escapeHtml(focused.label)} — ${escapeHtml(focused.note)}` +
    `</p>` +
    `<table class="ubs-comparator-table">` +
    `<thead><tr><th>UBS</th><th>${isEn ? "Tradition" : "Tradición"}</th><th>${isEn ? "Ref" : "Cita"}</th><th>${isEn ? "Alignment Note" : "Nota de alineación"}</th></tr></thead>` +
    `<tbody>${tableRows}</tbody>` +
    `</table>` +
    `</section>`
  );
}

async function fetchPackDatasetIfAvailable(state, dataLayer) {
  if (Array.isArray(state.onomasticonEntries) && state.onomasticonEntries.length > 0) {
    return state.onomasticonEntries;
  }
  if (typeof dataLayer?.loadOnomasticonCatalog === "function") {
    try {
      const loaded = await dataLayer.loadOnomasticonCatalog();
      if (Array.isArray(loaded?.entries) && loaded.entries.length > 0) {
        state.onomasticonEntries = loaded.entries;
        state.onomasticonTotalCount = Number(loaded.total_count || loaded.entries.length) || 3657;
        return state.onomasticonEntries;
      }
    } catch {
      // Fallback to built-in seed in headless/offline minimal harnesses
    }
  }
  return CURATED_ONOMASTICON_SEED;
}

export async function hydrateOnomasticonAndUbsPanels(ctx = {}) {
  const { state = {}, dataLayer = null, targetDoc = null, getEl, navigate, hydrateBookAndChapterSelectors, parseBiblicalCoordinateReference } = ctx;
  const resolve = typeof getEl === "function" ? (id) => getEl(id, targetDoc) : (id) => targetDoc?.getElementById?.(id) || null;
  const uiLocale = state.uiLocale || "es";

  const ubsHost = resolve("studyUbsComparatorHost");
  if (ubsHost) {
    ubsHost.innerHTML = renderUbsSixTraditionsComparatorHtml({
      book: state.book || "GEN",
      chapter: state.chapter || 1,
      verse: state.verse || 1,
      activeTradition: state.ubsActiveTradition || "ORG",
      uiLocale,
    });
    if (typeof ubsHost.addEventListener === "function") {
      const handleUbsTradition = (_e, btn) => {
        const trad = btn?.getAttribute?.("data-ubs-tradition");
        if (!trad) return;
        state.ubsActiveTradition = trad;
        ubsHost.innerHTML = renderUbsSixTraditionsComparatorHtml({
          book: state.book || "GEN",
          chapter: state.chapter || 1,
          verse: state.verse || 1,
          activeTradition: trad,
          uiLocale: state.uiLocale || "es",
        });
        patchTextAndAttrs(ubsHost, [{ attrs: { "data-ubs-rendered": trad } }]);
      };
      bindSurfaceActions(
        ubsHost,
        Object.fromEntries(["ORG", "LXX", "VUL", "RSC", "RSO", "ENG"].map((k) => [k, handleUbsTradition])),
        { scope: "ubs-tradition", actionAttr: "data-ubs-tradition", events: ["click"] },
      );
    }
  }

  const onoHost = resolve("studyOnomasticonExplorerHost");
  if (onoHost) {
    const entries = await fetchPackDatasetIfAvailable(state, dataLayer);
    const rerenderOno = () => {
      onoHost.innerHTML = renderOnomasticonExplorerHtml({
        entries,
        totalCount: state.onomasticonTotalCount || 3657,
        query: state.onomasticonQuery || "",
        entityClass: state.onomasticonFilter || "ALL",
        page: state.onomasticonPage || 1,
        pageSize: 24,
        uiLocale: state.uiLocale || "es",
      });
    };
    rerenderOno();
    if (typeof onoHost.addEventListener === "function" && !onoHost._onoBound) {
      onoHost._onoBound = true;
      const onSearch = (e) => {
        if (e?.target?.id !== "onomasticonSearchInput") return;
        state.onomasticonQuery = String(e.target.value || "");
        state.onomasticonPage = 1;
        const activeEntries =
          Array.isArray(state.onomasticonEntries) && state.onomasticonEntries.length > 0
            ? state.onomasticonEntries
            : entries;
        const listEl = resolve("onomasticonResultsList");
        if (listEl) {
          const isEnSearch = String(state.uiLocale || "es").trim().toLowerCase().startsWith("en");
          const { items } = filterOnomasticonItems(
            activeEntries,
            state.onomasticonQuery,
            state.onomasticonFilter || "ALL",
            24,
            1,
          );
          listEl.setAttribute("data-results-count", String(items.length));
          listEl.innerHTML = renderOnomasticonRowsHtml(items, isEnSearch);
        }
      };
      onoHost.addEventListener("input", onSearch);
      onoHost.addEventListener("change", onSearch);
      onoHost.addEventListener("click", async (e) => {
        const pageBtn = e?.target?.closest ? e.target.closest("[data-onomasticon-page]") : e?.target?.getAttribute?.("data-onomasticon-page") ? e.target : null;
        const nextPage = pageBtn?.getAttribute?.("data-onomasticon-page");
        if (nextPage) {
          state.onomasticonPage = Math.max(1, Number(nextPage) || 1);
          rerenderOno();
          return;
        }
        const filterBtn = e?.target?.closest ? e.target.closest("[data-onomasticon-filter]") : e?.target?.getAttribute?.("data-onomasticon-filter") ? e.target : null;
        const nextCls = filterBtn?.getAttribute?.("data-onomasticon-filter");
        if (nextCls) {
          state.onomasticonFilter = nextCls;
          state.onomasticonPage = 1;
          rerenderOno();
          return;
        }
        const jumpBtn = e?.target?.closest ? e.target.closest("[data-onomasticon-ref]") : e?.target?.getAttribute?.("data-onomasticon-ref") ? e.target : null;
        const targetRef = jumpBtn?.getAttribute?.("data-onomasticon-ref");
        if (targetRef && typeof parseBiblicalCoordinateReference === "function" && typeof navigate === "function") {
          const parsed = parseBiblicalCoordinateReference(targetRef);
          if (parsed && parsed.bookCode) {
            await navigate({ book: parsed.bookCode, chapter: parsed.chapter || 1, verse: parsed.verse || 1 }, targetDoc);
            if (typeof hydrateBookAndChapterSelectors === "function") hydrateBookAndChapterSelectors(targetDoc);
          }
        }
      });
    }
  }
}

const DEFAULT_FORMULAIC_QUOTES_SEED = Object.freeze([
  { nt_ref: "MAT.1.23", ot_ref: "ISA.7.14", strong_anchor: "H6005_Immanuel_G1694" },
  { nt_ref: "MAT.4.4", ot_ref: "DEU.8.3", strong_anchor: "H3899_lechem_G0740" },
  { nt_ref: "MAT.5.5", ot_ref: "PSA.37.11", strong_anchor: "H6035_anav_G4239" },
  { nt_ref: "MAT.27.46", ot_ref: "PSA.22.1", strong_anchor: "H0410_El_G2316" },
  { nt_ref: "ROM.1.17", ot_ref: "HAB.2.4", strong_anchor: "H0530_emunah_G4102" },
  { nt_ref: "JHN.1.23", ot_ref: "ISA.40.3", strong_anchor: "H6963_qol_G5456" },
]);

export function renderFormulaicParallelsCardHtml({
  book = "GEN",
  chapter = 1,
  verse = 1,
  formulaicIndex = null,
  uiLocale = "es",
} = {}) {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const cleanBook = String(book || "GEN").trim().toUpperCase();
  const cleanChapter = Number(chapter) || 1;
  const cleanVerse = Number(verse) || 1;
  const osisRef = `${cleanBook}.${cleanChapter}.${cleanVerse}`;
  const chapPrefix = `${cleanBook}.${cleanChapter}.`;

  const rawQuotes = Array.isArray(formulaicIndex?.ot_in_nt_quotations) && formulaicIndex.ot_in_nt_quotations.length > 0
    ? formulaicIndex.ot_in_nt_quotations
    : DEFAULT_FORMULAIC_QUOTES_SEED;
  const rawTemplates = Array.isArray(formulaicIndex?.templates) ? formulaicIndex.templates : [];

  const exactQuotes = rawQuotes.filter((q) => {
    const nt = String(q?.nt_ref || "").toUpperCase();
    const ot = String(q?.ot_ref || "").toUpperCase();
    return nt === osisRef || ot === osisRef || nt.startsWith(chapPrefix) || ot.startsWith(chapPrefix);
  });
  const matchedQuotes = (exactQuotes.length > 0 ? exactQuotes : rawQuotes).slice(0, 6);
  const matchingTemplates = rawTemplates
    .filter((tpl) => {
      const anchor = String(tpl?.canonical_anchor_ref || "").toUpperCase();
      const samples = Array.isArray(tpl?.sample_instance_refs) ? tpl.sample_instance_refs : [];
      return anchor === osisRef || anchor.startsWith(chapPrefix) || samples.some((r) => String(r).toUpperCase().startsWith(chapPrefix));
    })
    .slice(0, 3);

  const quoteChips = matchedQuotes
    .map((q) => {
      const targetRef = String(q.nt_ref).toUpperCase() === osisRef ? q.ot_ref : q.nt_ref;
      const otherRef = String(q.nt_ref).toUpperCase() === osisRef ? q.nt_ref : q.ot_ref;
      return (
        `<button type="button" class="uls-chip formulaic-jump-chip" data-formulaic-ref="${escapeHtml(targetRef)}" data-strong-anchor="${escapeHtml(q.strong_anchor || "")}">` +
        `📜 ${escapeHtml(otherRef)} ↔ ${escapeHtml(targetRef)} (${escapeHtml(String(q.strong_anchor || "").split("_")[0])})` +
        `</button>`
      );
    })
    .join(" ");

  const tplSummaryHtml = (matchingTemplates.length > 0 ? matchingTemplates : rawTemplates.slice(0, 2)).length > 0
    ? `<div id="formulaicSkeletonsDetails" class="tech-details ek-mt-xs">` +
    `<div class="ek-meta ek-stack-xs ek-mt-xs">` +
    (matchingTemplates.length > 0 ? matchingTemplates : rawTemplates.slice(0, 2))
      .map(
        (t) =>
          `<div data-formulaic-template="${escapeHtml(t.template_id || "")}">` +
          `<strong>🧬 ${escapeHtml(t.category || t.template_id)}</strong> (${Number(t.covered_verses_count || 0)} vv. · ${escapeHtml(t.canonical_anchor_ref)})` +
          (t.parameterized_skeleton ? `<br><code>${escapeHtml(t.parameterized_skeleton)}</code>` : "") +
          `</div>`,
      )
      .join("") +
    `</div></div>`
    : "";

  const totalParallels = rawQuotes.length + rawTemplates.length;
  const deduplicatedOtVerses = Number(formulaicIndex?.total_deduplicated_ot_verses || 4200);
  const formattedDeduplicated = deduplicatedOtVerses.toLocaleString("en-US");
  return (
    `<article id="formulaicParallelsCard" class="ek-card-muted" data-formulaic-osis="${escapeHtml(osisRef)}" data-formulaic-total="${totalParallels}" data-formulaic-matched="${matchedQuotes.length}" data-deduplicated-ot-verses="${deduplicatedOtVerses}">` +
    `<div class="ek-row-between">` +
    `<strong>🔗 ${isEn ? "OT ↔ NT Formulaic Parallels" : "Paralelos Formulaicos AT ↔ NT"}</strong>` +
    `<span class="uls-badge ek-badge-compact">${exactQuotes.length > 0 ? `${exactQuotes.length} ${isEn ? "in chapter" : "en capítulo"}` : `${rawQuotes.length} ${isEn ? "indexed quotes" : "citas indexadas"}`}</span>` +
    `</div>` +
    `<p class="ek-meta ek-mt-xs">${isEn ? `${formattedDeduplicated} Old Testament anchor verses deduplicated across canonical templates` : `${formattedDeduplicated} versículos del Antiguo Testamento unificados en plantillas canónicas`}</p>` +
    `<div class="ek-row-wrap ek-mt-xs">${quoteChips}</div>` +
    tplSummaryHtml +
    `</article>`
  );
}
