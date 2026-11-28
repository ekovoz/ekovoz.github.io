// ============================================================================
// web/mostrador/chrome_and_plane_bindings.js — Enlaces de cromo foveal,
// popover Aa·ES sin solapamiento, plano dual anti-error de modo y filtrado por obra.
// Extraído de stage_dom_bindings.js (`D1'`, `D3`, `D4'`, `D13`).
// ============================================================================

import { isTechnicalPlaneEnabled } from "./projection_contract.js";
import { createNativeDialogController, setWorkspaceMode } from "./state_store.js";

/**
 * Formatea la insignia compacta del botón `Aa` indicando el idioma de menú activo (`D4'`).
 */
export function formatAppearanceTriggerBadge(_uiLocale = "es") {
  return "Aa";
}

export function syncAppearanceTriggerBadge(targetDoc, getEl, uiLocale = "es") {
  if (!targetDoc || typeof getEl !== "function") return null;
  const badgeText = formatAppearanceTriggerBadge(uiLocale);
  const btn = getEl("btnAppearanceMenu", targetDoc);
  if (btn) {
    btn.textContent = badgeText;
    const isEn = String(uiLocale || "es").toLowerCase().startsWith("en");
    btn.setAttribute?.(
      "aria-label",
      isEn ? "Appearance, typography & UI language (Aa)" : "Apariencia, tipografía e idioma de menús (Aa)",
    );
  }
  return badgeText;
}

/**
 * Filtra los selectores del cajón de idioma de texto según la obra activa (`D4'`),
 * evitando mostrar las 24 Biblias o el explorador SIL 7,164 cuando se está en Los Felices.
 */
export function filterCorpusLanguageDrawerByWork(activeWork = "biblia", targetDoc, getEl) {
  if (!targetDoc || typeof getEl !== "function") return "biblia";
  const work = String(activeWork || "biblia").trim().toLowerCase();
  const isBible = work === "biblia";
  const bibleOnlyIds = [
    "bibleVerifiedCorpusPills",
    "corpusVerifiedSectionTitle",
    "corpusExplorerSectionTitle",
    "quickLangFilterInput",
    "polyglotWindowCountBadge",
    "polyglotRecycledListHost",
    "corpusGeoFilterDetails",
  ];
  for (const id of bibleOnlyIds) {
    const el = getEl(id, targetDoc);
    if (el) el.hidden = !isBible;
  }
  const sisterBar = getEl("corpusWorkLanguagesBar", targetDoc);
  if (sisterBar) {
    sisterBar.hidden = isBible;
    for (const pill of Array.from(sisterBar.querySelectorAll?.("[data-work-scope]") || [])) {
      const sc = pill.getAttribute?.("data-work-scope");
      pill.hidden = sc !== work;
    }
  }
  const drawer = getEl("bibleLanguageAndRegisterDrawer", targetDoc);
  if (drawer) drawer.setAttribute?.("data-active-work", work);
  return work;
}

/**
 * Enlaza `#appearancePopover`, idioma de menús en `Aa · <ISO>`, toggle `Modo Pro`,
 * píldora persistente `Modo Pro · Salir` (`D1'`), CTA foveal `Imprimir / PDF` (`D2'`)
 * y el diálogo del pie `Acerca de, Guías y Verificación` (`D9`).
 */
export function bindChromeAndPlaneEvents({
  state = {},
  store = null,
  targetDoc,
  getEl,
  isEnRole = false,
  syncActiveChromeProjection,
  syncBodyWorkAndOverlayAttrs,
  transitionSheet,
  appearances = {},
  onQuickPrintOpen = null,
} = {}) {
  if (!targetDoc || typeof getEl !== "function") return () => { };

  const themeBindings = appearances.themes || [
    ["btnThemeLight", "light"],
    ["btnThemeSepia", "sepia"],
    ["btnThemeDark", "dark"],
  ];
  const fontBindings = appearances.fonts || [
    ["btnFontSerif", "serif"],
    ["btnFontSans", "sans"],
  ];
  const scaleBindings = appearances.scales || [
    ["btnScaleDown", -0.1],
    ["btnScaleUp", 0.1],
  ];

  const appearanceBtn = getEl("btnAppearanceMenu", targetDoc);
  const appearancePopover = getEl("appearancePopover", targetDoc);

  syncAppearanceTriggerBadge(targetDoc, getEl, state.uiLocale || "es");
  filterCorpusLanguageDrawerByWork(state.activeWork || "biblia", targetDoc, getEl);

  const closeAppearancePopover = () => {
    if (!appearancePopover || appearancePopover.hidden) return;
    appearancePopover.hidden = true;
    appearanceBtn?.setAttribute?.("aria-expanded", "false");
    if (state.activeModal === "appearance") state.activeModal = null;
    syncBodyWorkAndOverlayAttrs?.(targetDoc);
  };

  if (appearanceBtn && typeof appearanceBtn.addEventListener === "function") {
    appearanceBtn.addEventListener("click", () => {
      if (!appearancePopover) return;
      const nextHidden = !appearancePopover.hidden;
      if (!nextHidden) {
        const corpD = getEl("bibleLanguageAndRegisterDrawer", targetDoc);
        if (corpD) corpD.open = false;
      }
      appearancePopover.hidden = nextHidden;
      appearanceBtn.setAttribute?.("aria-expanded", nextHidden ? "false" : "true");
      state.activeModal = nextHidden ? null : "appearance";
      syncBodyWorkAndOverlayAttrs?.(targetDoc);
      if (!nextHidden && appearancePopover.style) {
        appearancePopover.style.maxHeight = "calc(100dvh - 64px)";
        appearancePopover.style.overflowY = "auto";
        const winW = Number(targetDoc?.defaultView?.innerWidth || (typeof window !== "undefined" ? window.innerWidth : 0)) || 0;
        if (winW > 0 && typeof appearancePopover.getBoundingClientRect === "function") {
          const rect = appearancePopover.getBoundingClientRect();
          if (rect.left < 8) {
            appearancePopover.style.right = "auto";
            appearancePopover.style.left = "8px";
          } else if (rect.right > winW - 8) {
            appearancePopover.style.left = "auto";
            appearancePopover.style.right = "8px";
          }
        }
      }
    });
  }

  if (typeof targetDoc.addEventListener === "function" && !targetDoc._appearanceDismissBound) {
    targetDoc._appearanceDismissBound = true;
    targetDoc.addEventListener("keydown", (ev) => {
      if (ev?.key === "Escape") closeAppearancePopover();
    });
    targetDoc.addEventListener("click", (ev) => {
      const tgt = ev?.target;
      if (
        appearancePopover &&
        !appearancePopover.hidden &&
        tgt !== appearanceBtn &&
        !appearanceBtn?.contains?.(tgt) &&
        !appearancePopover.contains?.(tgt)
      ) {
        closeAppearancePopover();
      }
    });
  }

  const applyStorePatchAndProject = (patch = {}, domain = "appearance") => {
    const targetStore = store || state.store;
    if (targetStore && typeof targetStore.setState === "function") {
      targetStore.setState(patch, domain);
    } else {
      Object.assign(state, patch);
    }
    if (typeof syncActiveChromeProjection === "function") {
      syncActiveChromeProjection(targetDoc);
    } else if (targetDoc?.documentElement?.setAttribute) {
      if (state.activeIntent) targetDoc.documentElement.setAttribute("data-intent", state.activeIntent);
      if (state.appearanceTheme) targetDoc.documentElement.setAttribute("data-theme", state.appearanceTheme);
      if (state.fontFamily) targetDoc.documentElement.setAttribute("data-font-family", state.fontFamily);
      targetDoc.documentElement.style?.setProperty?.("--bible-font-scale", String(state.fontScale || 1.0));
    }
  };

  for (const [themeBtnId, themeKey] of themeBindings) {
    const tThemeBtn = getEl(themeBtnId, targetDoc);
    if (tThemeBtn && typeof tThemeBtn.addEventListener === "function") {
      tThemeBtn.addEventListener("click", () => {
        applyStorePatchAndProject({ appearanceTheme: themeKey }, "appearance");
        for (const [id, key] of themeBindings) {
          getEl(id, targetDoc)?.setAttribute?.("aria-pressed", key === themeKey ? "true" : "false");
        }
      });
    }
  }

  for (const [fontBtnId, fontKey] of fontBindings) {
    const fBtn = getEl(fontBtnId, targetDoc);
    if (fBtn && typeof fBtn.addEventListener === "function") {
      fBtn.addEventListener("click", () => {
        applyStorePatchAndProject({ fontFamily: fontKey }, "appearance");
        getEl("btnFontSerif", targetDoc)?.setAttribute?.("aria-pressed", fontKey === "serif" ? "true" : "false");
        getEl("btnFontSans", targetDoc)?.setAttribute?.("aria-pressed", fontKey === "sans" ? "true" : "false");
      });
    }
  }

  for (const [scaleBtnId, delta] of scaleBindings) {
    const sBtn = getEl(scaleBtnId, targetDoc);
    if (sBtn && typeof sBtn.addEventListener === "function") {
      sBtn.addEventListener("click", () => {
        const cur = Number(state.fontScale) || 1.0;
        const nextScale = Number(Math.max(0.85, Math.min(1.5, cur + delta)).toFixed(2));
        applyStorePatchAndProject({ fontScale: nextScale }, "appearance");
      });
    }
  }

  const readerBtn = getEl("btnWorkspaceReader", targetDoc);
  const techBtn = getEl("btnToggleTechnicalPlane", targetDoc);
  const exitProPill = getEl("btnExitTechnicalPlanePill", targetDoc);
  const syncPlaneButtonsDom = () => {
    const on = isTechnicalPlaneEnabled(state, targetDoc?.defaultView?.location?.search || "");
    const enNow = String(state.uiLocale || (isEnRole ? "en" : "es")).toLowerCase().startsWith("en");
    if (readerBtn) {
      readerBtn.setAttribute?.("aria-pressed", on ? "false" : "true");
      readerBtn.textContent = enNow ? "Print" : "Imprenta";
    }
    if (techBtn) {
      techBtn.setAttribute?.("aria-pressed", on ? "true" : "false");
      techBtn.textContent = enNow ? "Collaborate" : "Colaborar";
    }
    if (exitProPill) {
      exitProPill.hidden = !on;
      exitProPill.setAttribute?.("aria-pressed", on ? "true" : "false");
      exitProPill.textContent = enNow ? "Exit Collaborate" : "Salir de Colaborar";
    }
  };
  syncPlaneButtonsDom();

  const toggleSurfacePlane = (forceMode = null) => {
    const onNow = isTechnicalPlaneEnabled(state, targetDoc?.defaultView?.location?.search || "");
    const next = forceMode || (onNow ? "editorial" : "technical");
    const nextWorkspace = next === "technical" ? "studio" : "reader";
    const targetStore = store || state.store;
    if (targetStore) setWorkspaceMode(targetStore, nextWorkspace);
    else {
      state.surfacePlane = next;
      state.workspaceMode = nextWorkspace;
    }
    const isCollaborateSheet =
      state.activeSheet === "study" || state.activeSheet === "field" || state.activeSheet === "improve";
    if (nextWorkspace === "studio" && !isCollaborateSheet && typeof transitionSheet === "function") {
      void transitionSheet("study", targetDoc, { fromUser: true, mode: "open" });
    } else if (nextWorkspace === "reader" && isCollaborateSheet && typeof transitionSheet === "function") {
      const winW = Number(targetDoc?.defaultView?.innerWidth || (typeof window !== "undefined" ? window.innerWidth : 0)) || 0;
      if (winW > 0 && winW < 960) {
        void transitionSheet(null, targetDoc, { fromUser: true, mode: "close" });
      } else {
        void transitionSheet("print", targetDoc, { fromUser: true, mode: "open" });
      }
    }
    syncActiveChromeProjection?.(targetDoc);
    syncPlaneButtonsDom();
  };

  if (readerBtn && typeof readerBtn.addEventListener === "function") {
    readerBtn.addEventListener("click", () => toggleSurfacePlane("editorial"));
  }
  if (techBtn && typeof techBtn.addEventListener === "function") {
    techBtn.addEventListener("click", () => toggleSurfacePlane("technical"));
  }
  if (exitProPill && typeof exitProPill.addEventListener === "function") {
    exitProPill.addEventListener("click", () => toggleSurfacePlane("editorial"));
  }

  const corpusLangBtn = getEl("sovereignCorpusLangBtn", targetDoc);
  const corpusDrawer = getEl("bibleLanguageAndRegisterDrawer", targetDoc);
  if (corpusLangBtn && typeof corpusLangBtn.addEventListener === "function") {
    corpusLangBtn.addEventListener("click", () => {
      closeAppearancePopover();
      if (!corpusDrawer) return;
      corpusDrawer.open = !corpusDrawer.open;
      corpusLangBtn.setAttribute("aria-expanded", corpusDrawer.open ? "true" : "false");
      filterCorpusLanguageDrawerByWork(state.activeWork || "biblia", targetDoc, getEl);
      if (corpusDrawer.open) {
        setTimeout(() => {
          try { getEl("quickLangFilterInput", targetDoc)?.focus({ preventScroll: true }); } catch { }
        }, 0);
      }
      syncBodyWorkAndOverlayAttrs?.(targetDoc);
    });
  }

  const aboutBtn = getEl("btnOpenAboutGuidesVerify", targetDoc);
  const aboutDialog = getEl("aboutGuidesVerifyDialog", targetDoc);
  const aboutCloseBtn = getEl("btnCloseAboutGuidesDialog", targetDoc);
  if (aboutDialog) {
    const aboutCtrl = createNativeDialogController(aboutDialog, {
      modalId: "support",
      openerFallback: aboutBtn,
      targetDoc,
      store,
    });
    aboutBtn?.addEventListener?.("click", () => {
      closeAppearancePopover();
      aboutCtrl.open(aboutBtn);
    });
    aboutCloseBtn?.addEventListener?.("click", () => aboutCtrl.close());
  }

  return closeAppearancePopover;
}
