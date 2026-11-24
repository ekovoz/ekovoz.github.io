// ============================================================================
// web/mostrador/workshop_audit_and_langs.js — Subpestaña 3 de Taller (5 Idiomas CC0,
// Anclas Léxicas Strong/VSO y Manejadores de Auditoría Externa P1..P8)
// Extraído de drawer_workshop.js (SLICE-R10-10 · D7-R10 / D8-R10 / B2 / B5)
// ============================================================================

import { escapeHtml } from "./bridge_and_chapter.js";
import { runClientExternalAudit8Locks } from "./concordance_search.js";
import { renderStpDraftCheckHtml } from "./mejorar.js";

const WORKSHOP_5_CC0_LANGS = Object.freeze([
  { code: "es", labelEs: "🇲🇽 Español", labelEn: "🇲🇽 Spanish" },
  { code: "en", labelEs: "🇺🇸 English", labelEn: "🇺🇸 English" },
  { code: "stp", labelEs: "🏔️ O'dam (Tepehuano)", labelEn: "🏔️ O'dam (Tepehuano)" },
  { code: "he", labelEs: "🇮🇱 Hebreo (WLC)", labelEn: "🇮🇱 Hebrew (WLC)" },
  { code: "grc", labelEs: "🏛️ Griego (SBLGNT)", labelEn: "🏛️ Greek (SBLGNT)" },
]);

const COMBINING_DIACRITICS_REGEX = /[\u0300-\u036f\u0591-\u05c7\u064b-\u065f\u0670]/g;

function foldConsonants(s) {
  const clean = String(s || "")
    .normalize("NFKC")
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS_REGEX, "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
  return /^[a-z0-9]+$/.test(clean) ? clean.replace(/[aeiou]/g, "") : clean;
}

function findSurfaceAnchorToken(surfaceStr, rowCandidates, allowCognateMatch) {
  const raw = String(surfaceStr || "");
  const rawLow = raw.toLowerCase();
  for (const cand of rowCandidates) {
    const clean = String(cand || "").trim();
    const minLen = /^[a-z0-9]+$/i.test(clean) ? 3 : 2;
    if (clean.length >= minLen && rawLow.includes(clean.toLowerCase())) {
      return clean;
    }
  }
  if (!allowCognateMatch || !raw) return "";
  const surfWords = raw.split(/[\s,.;:!?()«»“”"'‖]+/).filter((w) => w.length >= 2);
  for (const cand of rowCandidates) {
    const candSkel = foldConsonants(cand);
    const minLen = /^[a-z0-9]+$/.test(candSkel) ? 3 : 2;
    if (candSkel.length < minLen) continue;
    for (const sw of surfWords) {
      const swSkel = foldConsonants(sw);
      if (swSkel.length >= minLen && (swSkel === candSkel || swSkel.includes(candSkel) || candSkel.includes(swSkel))) {
        return sw;
      }
    }
  }
  return "";
}

export function deriveVerseLockAnchors(state, oldSurfStr = "") {
  const verseNum = Number(state?.verse);
  const rawRows = Array.isArray(state?.lastNavResult?.matrix?.rows)
    ? state.lastNavResult.matrix.rows
    : [];
  const verseMatrixRows = rawRows.filter((r) => {
    if (!r) return false;
    const vVal = Array.isArray(r) ? r[0] : (r.verse ?? r.v);
    return Number(vVal) === verseNum;
  });
  const derivedProperNouns = [];
  let derivedAgent = "";
  let derivedPatient = "";
  const activeLang = String(state?.lang || "").toLowerCase();
  const isVernacularBridge = activeLang !== "es" && activeLang !== "en";
  for (const r of verseMatrixRows) {
    const isArr = Array.isArray(r);
    const morphTag = String(isArr ? (r[4] ?? "") : (r.morph ?? r.c06_morph ?? ""));
    const domLn = String(isArr ? (r[5] ?? "") : (r.domain ?? r.c07 ?? ""));
    const realiaC14 = String(isArr ? (r[12] ?? "") : (r.realia ?? r.c14 ?? r.realia_c14 ?? ""));
    const glossCandidates = [
      String(isArr ? (r[1] ?? "") : (r.surface ?? r.c03_surface ?? "")).trim(),
      String(isArr ? (r[6] ?? "") : (r.gloss_en ?? r.c08_gloss_en ?? "")).trim(),
      String(isArr ? (r[7] ?? "") : (r.gloss_es ?? r.c09_gloss_es ?? "")).trim(),
      String(isArr ? (r[14] ?? "") : (r.translit ?? r.c06_translit ?? "")).trim(),
    ].filter(Boolean);
    const isProperRow =
      /(?:^|[\/\-H])Np\b|\b(?:NP|PRI|PROP)\b/.test(morphTag) ||
      /\bLN:93\./i.test(domLn) ||
      /\b(?:ONO-[A-Z0-9-]+|PER-[0-9]+|LOC-[0-9]+|ONOMASTICON:PROPER_DESIGNATOR)\b/i.test(realiaC14);
    const matchedTok = findSurfaceAnchorToken(
      oldSurfStr,
      glossCandidates,
      isVernacularBridge && isProperRow,
    );
    if (matchedTok) {
      if (isProperRow && !derivedProperNouns.includes(matchedTok)) {
        derivedProperNouns.push(matchedTok);
      }
      const clauseCol = isArr ? (r[8] ?? "") : (r.clause ?? r.c10_clause ?? "");
      const pragCol = isArr ? (r[10] ?? "") : (r.prag ?? r.c12_prag ?? "");
      const roleTag = `${clauseCol} ${pragCol}`.toUpperCase();
      if (!derivedAgent && /\b(?:SUBJ|AG|A0|A0_AGENT)\b/.test(roleTag)) {
        derivedAgent = matchedTok;
      } else if (!derivedPatient && /\b(?:OBJ|PAT|A1|A1_PATIENT)\b/.test(roleTag)) {
        derivedPatient = matchedTok;
      }
    }
  }
  const expectedProperNouns =
    Array.isArray(state?.expectedProperNouns) && state.expectedProperNouns.length > 0
      ? state.expectedProperNouns
      : derivedProperNouns;
  return {
    expectedProperNouns,
    expectedAgent: state?.expectedAgent || derivedAgent,
    expectedPatient: state?.expectedPatient || derivedPatient,
  };
}

export function renderWorkshop5LangsSwitcherHtml(
  activeTallerLang = "es",
  masterCensusSummary = null,
  uiLocale = "es",
) {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const cleanActive = WORKSHOP_5_CC0_LANGS.some((l) => l.code === activeTallerLang)
    ? activeTallerLang
    : "es";
  const tier2Corpora = Array.isArray(masterCensusSummary?.tier2_nt_human_ot_workshop_corpora)
    ? masterCensusSummary.tier2_nt_human_ot_workshop_corpora
    : ["stp"];
  const buttonsHtml = WORKSHOP_5_CC0_LANGS.map((entry) => {
    const active = entry.code === cleanActive;
    const isTier2 = tier2Corpora.includes(entry.code);
    return (
      `<button type="button" class="uls-chip workshop-lang-switch-btn${active ? " is-selected" : ""}" ` +
      `data-taller-lang-pick="${entry.code}" aria-pressed="${active ? "true" : "false"}">` +
      `${isEn ? entry.labelEn : entry.labelEs}${isTier2 ? " · NT+Taller OT" : ""}` +
      `</button>`
    );
  }).join("");

  return (
    `<section id="workshop5LangsSwitcher" class="ek-card-muted ek-span-full ek-stack-sm" data-active-taller-lang="${escapeHtml(cleanActive)}" data-tier2-corpora="${escapeHtml(tier2Corpora.join(","))}">` +
    `<div class="ek-row-between">` +
    `<strong class="ek-title-sm">🌍 ${isEn ? "Workshop CC0 Language Artifacts (5 verified folders)" : "Kits de Taller CC0 por idioma (5 carpetas verificadas)"}</strong>` +
    `<span class="uls-badge" data-tier2-workshop-badge="true">${isEn ? "Human NT + OT Workshop" : "NT humano + Taller AT"}: ${escapeHtml(tier2Corpora.map((c) => c.toUpperCase()).join(", "))}</span>` +
    `</div>` +
    `<div class="ek-row-wrap" role="group" aria-label="${isEn ? "Select CC0 Workshop Language" : "Seleccionar idioma de kit de taller CC0"}">${buttonsHtml}</div>` +
    `</section>`
  );
}

export function renderWorkshopAuditSubtabHtml({
  mod = {},
  state = {},
} = {}) {
  const activeTallerLang =
    String(state.activeTallerLang || (WORKSHOP_5_CC0_LANGS.some((l) => l.code === state.lang) ? state.lang : "es"))
      .trim()
      .toLowerCase() || "es";
  const uiLocale = state.uiLocale || "es";
  const switcherHtml = renderWorkshop5LangsSwitcherHtml(
    activeTallerLang,
    state.masterCensusSummary || null,
    uiLocale,
  );
  const draftOpts = {
    ...(Array.isArray(state.topUncertaintyQueue) && state.topUncertaintyQueue.length > 0
      ? { uncertaintyQueue: state.topUncertaintyQueue }
      : {}),
    lang: activeTallerLang,
  };
  const rawDraftHtml =
    activeTallerLang === "stp"
      ? typeof mod.renderStpDraftCheckHtml === "function"
        ? mod.renderStpDraftCheckHtml(draftOpts)
        : renderStpDraftCheckHtml(draftOpts)
      : "";
  const sanitizedDraftHtml = String(rawDraftHtml || "")
    .replace(/<!doctype[^>]*>/gi, "")
    .replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, "")
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, "")
    .replace(/<\/?(?:html|body|meta)[^>]*>/gi, "");
  const relocatedAuditHtml =
    typeof mod.renderWorkshopAuditPanelsHtml === "function"
      ? mod.renderWorkshopAuditPanelsHtml({
          lang: activeTallerLang,
          uiLocale,
          uqPage: state.uncertaintyQueuePage || 1,
          externalAuditText: state.externalAuditText || "",
          externalAuditResult: state.externalAuditResult || null,
          activeTier3aPair: state.activeTier3aPair || "",
        })
      : "";
  const catalogHtml =
    typeof mod.renderTallerArtifactsCatalogHtml === "function"
      ? mod.renderTallerArtifactsCatalogHtml({
          lang: activeTallerLang,
          includeCensusCard: true,
          includeEightLocksBar: false,
          masterCensusSummary: state.masterCensusSummary || null,
          uiLocale,
        })
      : "";
  return switcherHtml + relocatedAuditHtml + catalogHtml + sanitizedDraftHtml;
}

export function createWorkshopAuditHandlers({
  state,
  targetDoc,
  getEl,
  oldInput,
  refreshPatchPreview,
  navigate,
  hydrateBookAndChapterSelectors,
} = {}) {
  const onAuditChange = async (e) => {
    const targetId = e?.target?.id || "";
    if (targetId === "externalAuditTextInput") {
      state.externalAuditText = String(e.target.value ?? "");
      return;
    }
    if (targetId === "externalAuditFileInput") {
      const file = e?.target?.files?.[0];
      if (!file || typeof file.text !== "function") return;
      const rawDraft = await file.text();
      state.externalAuditText = rawDraft;
      state.externalAuditResult = runClientExternalAudit8Locks({
        rawText: rawDraft,
        oldSurface: oldInput?.value || "",
      });
      state.refreshWorkshopAuditSubtab?.();
      (state.refreshPatchPreview || refreshPatchPreview)();
    }
  };
  const onAuditClick = async (e) => {
    const langPickBtn = e?.target?.closest
      ? e.target.closest("[data-taller-lang-pick]")
      : e?.target?.getAttribute?.("data-taller-lang-pick")
        ? e.target
        : null;
    const pickedTallerLang = langPickBtn?.getAttribute?.("data-taller-lang-pick");
    if (pickedTallerLang) {
      state.activeTallerLang = String(pickedTallerLang).toLowerCase();
      state.refreshWorkshopAuditSubtab?.();
      return true;
    }
    const uqPageBtn = e?.target?.closest
      ? e.target.closest("[data-uq-page]")
      : e?.target?.getAttribute?.("data-uq-page")
        ? e.target
        : null;
    const uqPageVal = uqPageBtn?.getAttribute?.("data-uq-page");
    if (uqPageVal !== null && uqPageVal !== undefined) {
      state.uncertaintyQueuePage = Math.max(1, Number(uqPageVal) || 1);
      state.refreshWorkshopAuditSubtab?.();
      (state.refreshPatchPreview || refreshPatchPreview)();
      return true;
    }
    const tier3aBtn = e?.target?.closest
      ? e.target.closest("[data-tier3a-pair]")
      : e?.target?.getAttribute?.("data-tier3a-pair")
        ? e.target
        : null;
    const tier3aKey = tier3aBtn?.getAttribute?.("data-tier3a-pair");
    if (tier3aKey) {
      state.activeTier3aPair = state.activeTier3aPair === tier3aKey ? "" : tier3aKey;
      state.refreshWorkshopAuditSubtab?.();
      (state.refreshPatchPreview || refreshPatchPreview)();
      return true;
    }
    const runAuditBtn = e?.target?.closest
      ? e.target.closest("#btnRunExternalAudit")
      : e?.target?.id === "btnRunExternalAudit"
        ? e.target
        : null;
    if (runAuditBtn) {
      const auditInput = getEl("externalAuditTextInput", targetDoc);
      const rawDraft = String(auditInput?.value ?? state.externalAuditText ?? "");
      state.externalAuditText = rawDraft;
      state.externalAuditResult = runClientExternalAudit8Locks({
        rawText: rawDraft,
        oldSurface: oldInput?.value || "",
      });
      state.refreshWorkshopAuditSubtab?.();
      (state.refreshPatchPreview || refreshPatchPreview)();
      return true;
    }
    const jumpOsisBtn = e?.target?.closest
      ? e.target.closest("[data-jump-osis]")
      : e?.target?.getAttribute?.("data-jump-osis")
        ? e.target
        : null;
    const jumpOsisRef = jumpOsisBtn?.getAttribute?.("data-jump-osis");
    if (jumpOsisRef) {
      const m = String(jumpOsisRef).trim().match(/^([A-Z0-9]+)\.(\d+)(?:\.(\d+))?/i);
      if (m) {
        await navigate(
          {
            book: m[1].toUpperCase(),
            chapter: Number(m[2]) || 1,
            verse: Number(m[3]) || 1,
          },
          targetDoc,
        );
        hydrateBookAndChapterSelectors(targetDoc);
      }
      return true;
    }
    return false;
  };
  return { onAuditChange, onAuditClick };
}
