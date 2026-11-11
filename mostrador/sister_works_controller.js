// ============================================================================
// @ekovoz-spec[REQ-BIB-012 | D8-R37 (8A) | sister_works_controller.js]
// web/mostrador/sister_works_controller.js — Controlador de Escenario para Obras Hermanas (Los Felices + 1 Evangelio)
// ============================================================================

import { escapeHtml, CROSS_WORK_BRIDGE_TABLE } from "./bridge_and_chapter.js";
import { renderEvangeliosPlateActionsHtml } from "./evangelios.js";
import { parseBiblicalCoordinateReference } from "./reference.js";

/**
 * Resuelve la entrada semanal activa de *1 Evangelio* y su ancla bíblica en `CROSS_WORK_BRIDGE_TABLE` (`D8-R37`).
 */
export function resolveEvangeliosActiveSelection({
  corpus = null,
  quarterFilter = "T1",
  weekId = "",
  fallbackLang = "es",
} = {}) {
  const entries = Array.isArray(corpus?.entries) ? corpus.entries : [];
  if (entries.length === 0) return null;
  const matchedGlobal = weekId ? entries.find((e) => e.id === weekId) : null;
  const effectiveQuarter = matchedGlobal?.quarter || quarterFilter || "T1";
  const quarterEntries = entries.filter((e) => e.quarter === effectiveQuarter);
  const pool = quarterEntries.length > 0 ? quarterEntries : entries;
  const activeEntry = matchedGlobal || pool.find((e) => e.id === weekId) || pool[0];
  const bridgeAnchor = Object.values(CROSS_WORK_BRIDGE_TABLE.evangeliosAnchors || {}).find(
    (a) => a.weekId === activeEntry.id,
  );
  let coordinate = null;
  if (bridgeAnchor) {
    coordinate = {
      book: bridgeAnchor.book,
      chapter: bridgeAnchor.chapter,
      verse: bridgeAnchor.verse,
    };
  } else if (activeEntry?.reference) {
    const parsedEv = parseBiblicalCoordinateReference(activeEntry.reference);
    if (parsedEv && parsedEv.bookCode) {
      coordinate = {
        book: parsedEv.bookCode,
        chapter: parsedEv.chapter || 1,
        verse: parsedEv.verse || 1,
      };
    }
  }
  return {
    activeEntry,
    pool,
    effectiveQuarter,
    activeLang: ["es", "en", "pt", "fr", "quc", "gn", "stp"].includes(fallbackLang)
      ? fallbackLang
      : "es",
    coordinate,
  };
}

/**
 * Construye las opciones HTML del selector semanal `#evangeliosWeekSelect` (`D8-R37` / `D8-R38`).
 */
export function buildEvangeliosWeekOptionsHtml(pool = [], activeEntryId = "s01", activeEvLang = "es") {
  const isEn = String(activeEvLang || "es").toLowerCase().startsWith("en");
  const weekWord = isEn ? "Week" : "Semana";
  return (Array.isArray(pool) ? pool : [])
    .map((e) => {
      const tObj = e.texts?.[activeEvLang] || e.texts?.es || {};
      const sel = e.id === activeEntryId ? " selected" : "";
      const labelTitle = tObj.title || e.plate_id || e.id;
      return `<option value="${escapeHtml(e.id)}"${sel}>${weekWord} ${e.week} (${escapeHtml(e.quarter)}) · ${escapeHtml(labelTitle)} — ${escapeHtml(e.reference)}</option>`;
    })
    .join("");
}

/**
 * Renderiza la tarjeta principal de *1 Evangelio* (`#evangeliosActivePlateCard`) con perícopas y ecos AT (`D8-R37` / `D8-R38`).
 */
export function renderEvangeliosStageCardHtml(activeEntry, activeEvLang = "es") {
  if (!activeEntry) return "";
  const isEn = String(activeEvLang || "es").toLowerCase().startsWith("en");
  const weekWord = isEn ? "Week" : "Semana";
  const openBibleLabel = isEn ? "Open in The Bible" : "Abrir en La Biblia";
  const gestureLabel = isEn ? "Liturgical Gesture" : "Gesto Litúrgico";
  const bridgeLabel = isEn ? "Bridge" : "Puente";
  const tObj = activeEntry.texts?.[activeEvLang] || activeEntry.texts?.es || {};
  const bridgeObj = activeEvLang === "es" ? activeEntry.texts?.en : activeEntry.texts?.es;
  const labelTitle = tObj.title || activeEntry.plate_id || activeEntry.id;
  return (
    `<header style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:0.4rem;margin-bottom:0.5rem;">` +
    `<strong>${weekWord} ${activeEntry.week}/52 (${escapeHtml(activeEntry.quarter)}) · ${escapeHtml(labelTitle)}</strong>` +
    `<button type="button" class="uls-chip" data-evangelios-ref="${escapeHtml(activeEntry.reference)}" style="min-height:48px;padding:0.35rem 0.75rem;font-size:0.8rem;">📖 ${openBibleLabel}: ${escapeHtml(activeEntry.reference)}</button>` +
    `</header>` +
    `<p style="margin:0 0 0.45rem 0;font-size:0.82rem;color:var(--accent-amber);"><strong>🕊️ ${gestureLabel}:</strong> ${escapeHtml(activeEntry.gesture || "")}</p>` +
    `<blockquote style="margin:0 0 0.45rem 0;font-size:0.95rem;line-height:1.5;">${escapeHtml(tObj.text || "")}</blockquote>` +
    (bridgeObj && bridgeObj.text
      ? `<p style="margin:0;font-size:0.8rem;color:var(--text-secondary);border-top:1px dashed var(--card-border);padding-top:0.4rem;"><em>${bridgeLabel}:</em> ${escapeHtml(bridgeObj.text)}</p>`
      : "") +
    renderEvangeliosPlateActionsHtml({
      weekId: activeEntry.id,
      passageRef: activeEntry.reference,
      lang: activeEvLang,
    })
  );
}

/**
 * Sincroniza la visibilidad Harel XOR entre las 3 obras hermanas (`biblia`, `felices`, `evangelios`) (`D8-R37`).
 */
export function syncSisterWorksTabsDom(cleanWork = "biblia", getElFn) {
  if (typeof getElFn !== "function") return cleanWork;
  const bibSec = getElFn("bibleSovereignSection");
  const felSec = getElFn("felicesSovereignSection");
  const evaSec = getElFn("evangeliosSovereignSection");
  const tabBib = getElFn("tabWorkBiblia");
  const tabFel = getElFn("tabWorkFelices");
  const tabEva = getElFn("tabWorkEvangelios");

  const applySec = (sec, active) => {
    if (!sec) return;
    sec.hidden = !active;
    if (sec.style) sec.style.display = active ? "" : "none";
    if (typeof sec.setAttribute === "function") {
      sec.setAttribute("data-active-work", active ? "true" : "false");
    }
  };
  applySec(bibSec, cleanWork === "biblia");
  applySec(felSec, cleanWork === "felices");
  applySec(evaSec, cleanWork === "evangelios");

  if (tabBib) tabBib.setAttribute("aria-selected", cleanWork === "biblia" ? "true" : "false");
  if (tabFel) tabFel.setAttribute("aria-selected", cleanWork === "felices" ? "true" : "false");
  if (tabEva) tabEva.setAttribute("aria-selected", cleanWork === "evangelios" ? "true" : "false");
  return cleanWork;
}

