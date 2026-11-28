// ============================================================================
// web/mostrador/polyglot_picker_view.js — Navegador Políglota 7,164 Lenguas (`SLICE-V3HIG-10`)
// Separa `uiLocale` (Aa / Preferencias) del Idioma Bíblico (Tier 0-1 + explorador 7,164 con
// ventana DOM reciclada de <= 36 nodos, GOLD-684) y selector libre de lengua puente `62/38`.
// ============================================================================

import { escapeHtml } from "./bridge_and_chapter.js";
import {
  indexRegionShards,
  listCountriesInRegion,
  listLanguagesInCountry,
  listLanguagesWindow,
  searchLanguages,
} from "./lang_funnel.js";
import {
  localizeBridgeLangSelectLabels,
  partitionLanguagesTier1AndLongTail,
  renderDecoupledLanguageSelectorHtml,
} from "./language_selector_view.js";
import { hydratePackLanguagesFromManifest } from "./reference.js";

export const POLYGLOT_RECYCLED_WINDOW_CAP = 36;

/**
 * Crea o reutiliza una ventana DOM acotada de máximo 36 nodos `[data-polyglot-row]`
 * sin inflar el DOM cuando se recorren las 7,164 lenguas SIL (`GOLD-684`).
 */
function ensurePolyglotRecycledWindowRows(hostEl, totalSlots = POLYGLOT_RECYCLED_WINDOW_CAP, targetDoc = null) {
  if (!hostEl) return [];
  const cap = Math.max(1, Math.min(POLYGLOT_RECYCLED_WINDOW_CAP, Number(totalSlots) || POLYGLOT_RECYCLED_WINDOW_CAP));
  if (Array.isArray(hostEl._recycledRows) && hostEl._recycledRows.length === cap) {
    return hostEl._recycledRows;
  }
  const createEl = typeof targetDoc?.createElement === "function"
    ? (tag) => targetDoc.createElement(tag)
    : null;
  const rows = [];
  if (createEl && typeof hostEl.appendChild === "function") {
    hostEl.innerHTML = "";
    for (let i = 0; i < cap; i += 1) {
      const btn = createEl("button");
      btn.type = "button";
      btn.className = "uls-chip polyglot-window-row";
      btn.setAttribute?.("role", "option");
      btn.setAttribute?.("data-polyglot-row", String(i));
      btn.hidden = true;
      hostEl.appendChild(btn);
      rows.push(btn);
    }
  }
  hostEl._recycledRows = rows;
  return rows;
}

/**
 * Proyecta hasta `<= 36` lenguas en la ventana reciclada y retorna el subconjunto renderizado.
 */
function cleanPolyglotLabel(rawLabel = "", code = "") {
  const clean = String(rawLabel || code || "").trim();
  const c = String(code || "").trim().toLowerCase();
  const stripped = clean.replace(/^[\u{1F1E6}-\u{1F1FF}]{2}\s*/u, "").trim();
  if (!c) return stripped;
  const rxDup = new RegExp(`\\(${c}\\)\\s*·\\s*${c}$`, "i");
  return stripped.replace(rxDup, `(${c})`).trim();
}

export function renderPolyglotRecycledWindow(hostEl, entries = [], { activeLang = "", targetDoc = null } = {}) {
  const sliced = (Array.isArray(entries) ? entries : []).slice(0, POLYGLOT_RECYCLED_WINDOW_CAP);
  if (!hostEl) return sliced;
  hostEl.setAttribute?.("data-polyglot-window", "true");
  hostEl.setAttribute?.("data-polyglot-visible-count", String(sliced.length));
  const pool = ensurePolyglotRecycledWindowRows(hostEl, POLYGLOT_RECYCLED_WINDOW_CAP, targetDoc);
  if (pool.length === POLYGLOT_RECYCLED_WINDOW_CAP) {
    for (let i = 0; i < POLYGLOT_RECYCLED_WINDOW_CAP; i += 1) {
      const row = pool[i];
      const item = sliced[i];
      if (!item) {
        row.hidden = true;
        row.setAttribute?.("aria-selected", "false");
        row.removeAttribute?.("data-corpus-lang");
        continue;
      }
      const code = String(item.code || item.iso639_3 || "").trim();
      const label = cleanPolyglotLabel(item.displayLabel || item.name || code, code);
      const isSelected = Boolean(code && code === activeLang);
      row.hidden = false;
      row.innerHTML = code
        ? `[${escapeHtml(code.toUpperCase())}] <bdi dir="auto">${escapeHtml(label)}</bdi>`
        : `<bdi dir="auto">${escapeHtml(label)}</bdi>`;
      row.setAttribute?.("data-corpus-lang", code);
      row.setAttribute?.("data-iso", String(item.iso639_3 || code));
      row.setAttribute?.("aria-selected", isSelected ? "true" : "false");
    }
  } else {
    hostEl.innerHTML = sliced
      .map((item) => {
        const code = String(item.code || item.iso639_3 || "").trim();
        const label = cleanPolyglotLabel(item.displayLabel || item.name || code, code);
        const sel = code === activeLang ? "true" : "false";
        const isoTag = code ? `<span class="ek-iso-tag">${escapeHtml(code.toUpperCase())}</span>` : "";
        return `<button type="button" class="uls-chip polyglot-window-row" role="option" data-polyglot-row="pool" data-corpus-lang="${escapeHtml(code)}" aria-selected="${sel}">${isoTag}<bdi dir="auto">${escapeHtml(label)}</bdi></button>`;
      })
      .join("");
  }
  return sliced;
}

/**
 * Conecta el navegador políglota de corpus (7,164 lenguas SIL + 24 biblias), el selector de lengua
 * puente libre (`62/38`) y el selector de idioma de interfaz (`uiLocale`) dentro de Preferencias `Aa`.
 */
export function bindCorpusPolyglotAndUiPreferences({
  state,
  dataLayer,
  targetDoc,
  getEl,
  navigate,
  setUiLocale,
  updateDoseLinks,
  hydrateEvangeliosSection,
  syncFelicesWithCorpusLang,
  renderViewportFromState,
  syncUrlFromState,
  hydratePrintDrawerPanels,
} = {}) {
  const regionSelect = getEl("bibleSelectRegion", targetDoc);
  const countrySelect = getEl("bibleSelectCountry", targetDoc);
  const langSelect = getEl("bibleSelectLang", targetDoc);
  if (langSelect && langSelect.options) {
    const allowDraftLangs =
      Boolean(state?.previewEvangelios) ||
      (Array.isArray(state?.previewWorks) && state.previewWorks.length > 0) ||
      /[?&]preview=(?:1|true|all|aud|kgv)\b/i.test(String(targetDoc?.defaultView?.location?.search || state?.search || ""));
    for (const opt of Array.from(langSelect.options)) {
      const val = String(opt?.value || "").trim().toLowerCase();
      if (val === "aud" || val === "kgv") {
        opt.hidden = !allowDraftLangs;
        opt.disabled = !allowDraftLangs;
      }
    }
  }
  const langFilterInput = getEl("quickLangFilterInput", targetDoc);
  const windowHost = getEl("polyglotRecycledListHost", targetDoc);
  const bridgeSelect = getEl("bibleBridgeLangSelect", targetDoc);
  if (bridgeSelect) {
    localizeBridgeLangSelectLabels(bridgeSelect, state.uiLocale || "es");
  }

  const ensureRegionIndexLoaded = async () => {
    if (state.regionIndex) return state.regionIndex;
    const catalog = dataLayer ? await dataLayer.loadCatalog() : { languages: [] };
    const shards =
      typeof dataLayer?.loadAllRegionShards === "function" ? await dataLayer.loadAllRegionShards() : [];
    state.regionIndex = indexRegionShards(shards, catalog || { languages: [] });
    return state.regionIndex;
  };

  const VERIFIED_CORPUS_ISO_SET = new Set([
    "es", "spa", "es-1909", "en", "eng", "pt", "por", "fr", "fra", "de", "deu",
    "it", "ita", "he", "heb", "grc", "ell", "ar", "arb", "fa", "fas", "ur", "urd",
    "hi", "hin", "bn", "ben", "id", "ind", "sw", "swh", "tr", "tur", "ru", "rus",
    "zh-hans", "cmn", "zho", "ja", "jpn", "ko", "kor", "stp", "arp", "bre", "cha",
  ]);
  const windowCountBadge = getEl("polyglotWindowCountBadge", targetDoc);

  const projectLangChoices = (items = [], { filterQuery = "" } = {}) => {
    const cleanQ = String(filterQuery || "").trim();
    const seenIso = new Set();
    const dedupedItems = [];
    for (const m of Array.isArray(items) ? items : []) {
      const c1 = String(m?.code || "").trim().toLowerCase();
      const c2 = String(m?.iso639_3 || "").trim().toLowerCase();
      const isoKey = c2 || c1;
      if (!isoKey || seenIso.has(isoKey)) continue;
      const isVerified = VERIFIED_CORPUS_ISO_SET.has(c1) || VERIFIED_CORPUS_ISO_SET.has(c2);
      if (!cleanQ && isVerified) continue;
      seenIso.add(isoKey);
      dedupedItems.push(
        isVerified
          ? { ...m, sovereignSeal: m.sovereignSeal || "verified" }
          : m,
      );
    }
    const partitioned = partitionLanguagesTier1AndLongTail(dedupedItems, {
      activeWork: state.activeWork || "biblia",
      previewEvangelios: Boolean(state.previewEvangelios),
    });
    const visibleItems = [...partitioned.tier1, ...partitioned.longTail];
    if (windowHost && typeof windowHost.setAttribute === "function") {
      windowHost.setAttribute("data-active-work", partitioned.activeWork);
      windowHost.setAttribute("data-tier1-count", String(partitioned.counts.tier1Count));
      windowHost.setAttribute("data-longtail-count", String(partitioned.counts.longTailCount));
    }
    if (windowHost && typeof targetDoc?.createElement !== "function") {
      windowHost.innerHTML = renderDecoupledLanguageSelectorHtml({
        entries: visibleItems,
        activeLang: state.lang,
        activeWork: state.activeWork || "biblia",
        previewEvangelios: Boolean(state.previewEvangelios),
        uiLocale: state.uiLocale || "es",
      });
    }
    const capped = renderPolyglotRecycledWindow(windowHost, visibleItems, { activeLang: state.lang, targetDoc });
    if (windowCountBadge) {
      const isEnUi = String(state.uiLocale || "es").trim().toLowerCase().startsWith("en");
      windowCountBadge.textContent = capped.length > 0
        ? (isEnUi ? `Showing 1–${capped.length} of 7,164 languages` : `Mostrando 1–${capped.length} de 7,164 lenguas`)
        : (isEnUi ? "0 matches in 7,164 languages" : "0 coincidencias en 7,164 lenguas");
    }
  };

  const applyCorpusLanguageSelection = async (nextLang, regOverride = null) => {
    const targetLang = String(nextLang || "es").trim() || "es";
    const reg = regOverride || (targetLang === "es-1909" ? "clasica" : state.register);
    await navigate({ lang: targetLang, register: reg }, targetDoc);
    if (state.activeWork === "evangelios" && typeof hydrateEvangeliosSection === "function") {
      await hydrateEvangeliosSection(state.evangeliosQuarter || "T1", state.evangeliosWeekId || "s01");
    } else if (state.activeWork === "felices") {
      await syncFelicesWithCorpusLang(targetLang, targetDoc);
    }
  };

  if (regionSelect && typeof regionSelect.addEventListener === "function") {
    regionSelect.addEventListener("change", async (e) => {
      state.regionCode = e?.target?.value || regionSelect.value || "americas-mesoamerica";
      const idx = await ensureRegionIndexLoaded();
      const subregions = listCountriesInRegion(idx, state.regionCode);
      if (countrySelect && subregions.length > 0) {
        countrySelect.innerHTML = subregions
          .map((c) => `<option value="${escapeHtml(c.code || c.name)}">${escapeHtml(c.label || c.name)}</option>`)
          .join("");
      }
      projectLangChoices(listLanguagesWindow(idx, { macroRegionId: state.regionCode, limit: POLYGLOT_RECYCLED_WINDOW_CAP * 2 }));
    });
  }

  if (countrySelect && typeof countrySelect.addEventListener === "function") {
    countrySelect.addEventListener("change", async (e) => {
      const subName = String(e?.target?.value || countrySelect.value || "MX");
      state.countryIso2 = subName.toUpperCase().slice(0, 2);
      const idx = await ensureRegionIndexLoaded();
      const byCountry = listLanguagesInCountry(idx, state.regionCode || 1, subName);
      projectLangChoices(
        byCountry.length > 0
          ? byCountry.slice(0, POLYGLOT_RECYCLED_WINDOW_CAP * 2)
          : listLanguagesWindow(idx, {
            macroRegionId: state.regionCode || 1,
            subregionName: subName,
            limit: POLYGLOT_RECYCLED_WINDOW_CAP * 2,
          }),
      );
      await updateDoseLinks?.(targetDoc);
    });
  }

  if (langSelect && typeof langSelect.addEventListener === "function") {
    langSelect.addEventListener("change", async (e) => {
      await applyCorpusLanguageSelection(e?.target?.value || langSelect.value || "es");
    });
  }

  const corpusDrawer = getEl("bibleLanguageAndRegisterDrawer", targetDoc);
  const projectOnDemandSilWindow = async (rawQuery = "") => {
    const q = String(rawQuery || "").trim();
    const isEnUi = String(state.uiLocale || "es").trim().toLowerCase().startsWith("en");
    if (!q) {
      if (windowHost) windowHost.hidden = true;
      renderPolyglotRecycledWindow(windowHost, [], { activeLang: state.lang, targetDoc });
      if (windowCountBadge) {
        windowCountBadge.textContent = isEnUi
          ? "Search name or ISO to explore 7,164 languages (or filter by region)"
          : "Busca nombre o ISO para explorar 7,164 lenguas (o filtra por región)";
      }
      return;
    }
    if (windowHost) windowHost.hidden = false;
    const idx = await ensureRegionIndexLoaded();
    const matched = searchLanguages(idx, q, { limit: POLYGLOT_RECYCLED_WINDOW_CAP });
    projectLangChoices(Array.isArray(matched) ? matched : [], { filterQuery: q });
  };
  const syncWorkLanguagesBarScope = () => {
    const bar = getEl("corpusWorkLanguagesBar", targetDoc);
    if (!bar) return;
    const w = String(state.activeWork || "biblia").toLowerCase();
    let anyVisible = false;
    for (const pill of Array.from(bar.querySelectorAll?.("[data-work-scope]") || [])) {
      const sc = pill.getAttribute?.("data-work-scope");
      const show = (sc === "felices" && w === "felices") || (sc === "evangelios" && w === "evangelios" && Boolean(state.previewEvangelios));
      pill.hidden = !show;
      if (show) anyVisible = true;
    }
    bar.hidden = !anyVisible;
  };
  syncWorkLanguagesBarScope();
  if (corpusDrawer && typeof corpusDrawer.addEventListener === "function") {
    corpusDrawer.addEventListener("toggle", () => {
      if (!corpusDrawer.open) return;
      syncWorkLanguagesBarScope();
      projectOnDemandSilWindow(langFilterInput?.value || "").catch(() => { });
      if (langFilterInput && typeof langFilterInput.focus === "function") {
        setTimeout(() => { try { langFilterInput.focus({ preventScroll: true }); } catch { } }, 0);
      }
    });
  }

  if (langFilterInput && typeof langFilterInput.addEventListener === "function") {
    langFilterInput.addEventListener("input", async (e) => {
      await projectOnDemandSilWindow(e?.target?.value ?? langFilterInput.value ?? "");
    });
  }

  if (windowHost && typeof windowHost.addEventListener === "function") {
    windowHost.addEventListener("click", async (e) => {
      const btn = typeof e?.target?.closest === "function" ? e.target.closest("[data-corpus-lang]") : e?.target;
      const targetLang = btn?.getAttribute?.("data-corpus-lang");
      if (targetLang) await applyCorpusLanguageSelection(targetLang);
    });
  }

  if (bridgeSelect && typeof bridgeSelect.addEventListener === "function") {
    if (state.bridgeLang) bridgeSelect.value = state.bridgeLang;
    bridgeSelect.addEventListener("change", async (e) => {
      const chosenBridge = String(e?.target?.value || bridgeSelect.value || "").trim();
      state.bridgeLang = chosenBridge;
      state.lastBridgeLang = chosenBridge;
      await navigate({ lang: state.lang, register: state.register || "bilingue" }, targetDoc);
      renderViewportFromState?.(targetDoc);
      syncUrlFromState?.(targetDoc, { push: false });
      await hydratePrintDrawerPanels?.(targetDoc);
    });
  }

  const boundQuickIds = new Set();
  const quickLangButtons = [
    ["quickLangEs", "es"],
    ["quickLangEn", "en"],
    ["quickLangPt", "pt"],
    ["quickLangFr", "fr"],
    ["quickLangDe", "de"],
    ["quickLangIt", "it"],
    ["quickLangStp", "stp"],
    ["quickLangHe", "he"],
    ["quickLangGrc", "grc"],
    ["quickLangAr", "ar"],
    ["quickLangFa", "fa"],
    ["quickLangUr", "ur"],
    ["quickLangHi", "hi"],
    ["quickLangBn", "bn"],
    ["quickLangId", "id"],
    ["quickLangSw", "sw"],
    ["quickLangTr", "tr"],
    ["quickLangRu", "ru"],
    ["quickLangZhHans", "zh-Hans"],
    ["quickLangJa", "ja"],
    ["quickLangKo", "ko"],
    ["quickLangArp", "arp"],
    ["quickLangBre", "bre"],
    ["quickLangCha", "cha"],
  ];
  for (const [id, fallbackLang] of quickLangButtons) {
    const quickBtn = getEl(id, targetDoc);
    if (quickBtn && typeof quickBtn.addEventListener === "function") {
      boundQuickIds.add(id);
      quickBtn.addEventListener("click", async () => {
        const chosen = quickBtn.getAttribute?.("data-corpus-lang") || fallbackLang;
        await applyCorpusLanguageSelection(chosen);
      });
    }
  }

  for (const hostId of ["bibleVerifiedCorpusPills", "corpusWorkLanguagesBar"]) {
    const pillsEl = getEl(hostId, targetDoc);
    if (pillsEl && typeof pillsEl.addEventListener === "function") {
      pillsEl.addEventListener("click", async (e) => {
        const btn = typeof e?.target?.closest === "function" ? e.target.closest("[data-corpus-lang]") : e?.target;
        if (btn?.id && boundQuickIds.has(btn.id)) return;
        const targetLang = btn?.getAttribute?.("data-corpus-lang");
        if (targetLang) await applyCorpusLanguageSelection(targetLang);
      });
    }
  }

  const uiLangSelect = getEl("langSelect", targetDoc);
  const ulsTrigger = getEl("ulsTriggerBtn", targetDoc);
  if (uiLangSelect && typeof uiLangSelect.addEventListener === "function") {
    uiLangSelect.addEventListener("change", async (e) => {
      const nextUi = e?.target?.value || uiLangSelect.value || "en";
      await setUiLocale(nextUi, targetDoc);
      uiLangSelect.hidden = true;
      ulsTrigger?.setAttribute?.("aria-expanded", "false");
    });
  }
  if (ulsTrigger && typeof ulsTrigger.addEventListener === "function") {
    ulsTrigger.addEventListener("click", () => {
      if (!uiLangSelect) return;
      uiLangSelect.hidden = !uiLangSelect.hidden;
      ulsTrigger.setAttribute("aria-expanded", uiLangSelect.hidden ? "false" : "true");
    });
  }

  if (dataLayer && !state._packs24HydratedFromManifest) {
    state._packs24HydratedFromManifest = true;
    const loadPacksMeta =
      typeof dataLayer.loadOfflinePacksCatalog === "function"
        ? dataLayer.loadOfflinePacksCatalog()
        : typeof dataLayer.loadJson === "function"
          ? dataLayer.loadJson("data/packs/packs_manifest.json")
          : null;
    if (loadPacksMeta) {
      Promise.resolve(loadPacksMeta)
        .then((manifestData) => {
          if (!manifestData) return;
          const hydrated = hydratePackLanguagesFromManifest(manifestData);
          state.hydratedPacks24 = hydrated.packs;
          state.availablePackLangs24 = hydrated.langs;
          langSelect?.setAttribute?.("data-hydrated-packs-count", String(hydrated.totalPacks));
          if (bridgeSelect && Array.isArray(hydrated.packs) && typeof targetDoc?.createElement === "function") {
            const seenBridge = new Set(Array.from(bridgeSelect.options || []).map((o) => String(o?.value || "").trim()));
            for (const p of hydrated.packs) {
              if (!p.lang || seenBridge.has(p.lang)) continue;
              const opt = targetDoc.createElement("option");
              opt.value = p.lang;
              opt.textContent = p.lang.toUpperCase();
              bridgeSelect.appendChild?.(opt);
            }
          }
          if (langSelect && Array.isArray(hydrated.packs) && typeof targetDoc?.createElement === "function") {
            const existingVals = new Set(Array.from(langSelect.options || []).map((o) => String(o?.value || "").trim()));
            for (const p of hydrated.packs) {
              if (!p.lang || existingVals.has(p.lang)) continue;
              const opt = targetDoc.createElement("option");
              opt.value = p.lang;
              opt.textContent = p.lang.toUpperCase();
              opt.setAttribute?.("data-pack-url", p.sameOriginPackUrl);
              langSelect.appendChild?.(opt);
            }
          }
        })
        .catch(() => { });
    }
  }
}

export function syncDraftCorpusOptionsDom(langSelectEl, targetDoc, allowDraft) {
  if (!langSelectEl?.options) return;
  const draftDefs = [["aud", "Au'dam (aud · Draft)"], ["kgv", "Kalamang (kgv · Draft)"]];
  if (allowDraft && typeof langSelectEl.appendChild === "function" && targetDoc?.createElement) {
    for (const [code, label] of draftDefs) {
      if (!Array.from(langSelectEl.options).some((o) => String(o?.value || "").trim().toLowerCase() === code)) {
        const opt = targetDoc.createElement("option");
        opt.value = code;
        opt.textContent = label;
        langSelectEl.appendChild(opt);
      }
    }
  }
  for (const opt of Array.from(langSelectEl.options)) {
    const v = String(opt?.value || "").trim().toLowerCase();
    if (v === "aud" || v === "kgv") { opt.hidden = !allowDraft; opt.disabled = !allowDraft; }
  }
}
