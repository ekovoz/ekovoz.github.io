// Gaveta bajo demanda: Sugerir Mejora Comunitaria (Verso/Palabra L1-L5 con raíz Strong + Cadena de UI).
// Ekovoz Mostrador Ronda 20 — 0 Bytes Audio, texto puro compatible con ekovoz-cli apply-patch.

export const CASCADE_LEVELS = Object.freeze(["L1", "L2", "L3", "L4", "L5"]);

function sanitizePipeField(value) {
  return String(value ?? "")
    .replace(/[|\r\n]+/g, " ")
    .trim();
}

export function buildPatchPayload({
  kind = "verse",
  lang = "stp",
  locale = "en",
  level = "L2",
  ref = "GEN.1.1",
  key = "",
  strongId = "H0430",
  oldSurface = "",
  newSurface = "",
  note = "",
} = {}) {
  const cleanKind = kind === "ui-string" ? "ui-string" : "verse";
  const cleanLevel = CASCADE_LEVELS.includes(String(level).toUpperCase())
    ? String(level).toUpperCase()
    : "L2";

  if (cleanKind === "ui-string") {
    const cleanLocale = sanitizePipeField(locale || "en");
    const cleanKey = sanitizePipeField(key || "mostrador.title");
    const cleanOld = sanitizePipeField(oldSurface);
    const cleanNew = sanitizePipeField(newSurface);
    const cleanNote = sanitizePipeField(note || "UI translation improvement (0 Bytes Audio)");
    const payloadLine = `EKOVOZ_UI_PATCH_PAYLOAD|${cleanLocale}|${cleanKey}|${cleanOld}|${cleanNew}|${cleanNote}`;
    const tomlBlock =
      `[[patches]]\n` +
      `kind = "ui-string"\n` +
      `locale = "${cleanLocale}"\n` +
      `key = "${cleanKey}"\n` +
      `old_surface = "${cleanOld.replace(/"/g, '\\"')}"\n` +
      `new_surface = "${cleanNew.replace(/"/g, '\\"')}"\n` +
      `note = "${cleanNote.replace(/"/g, '\\"')}"\n` +
      `audio_bytes = 0\n`;
    return {
      kind: "ui-string",
      locale: cleanLocale,
      key: cleanKey,
      old_surface: cleanOld,
      new_surface: cleanNew,
      note: cleanNote,
      audio_bytes: 0,
      payloadLine,
      tomlBlock,
    };
  }

  const cleanLang = sanitizePipeField(lang || "stp").toLowerCase();
  const cleanRef = sanitizePipeField(ref || "GEN.1.1").toUpperCase();
  const cleanStrong = sanitizePipeField(strongId || "H0430").toUpperCase();
  const cleanOld = sanitizePipeField(oldSurface);
  const cleanNew = sanitizePipeField(newSurface);
  const cleanNote = sanitizePipeField(note || `Community field patch (${cleanStrong}, 0 Bytes Audio)`);

  // Formato exacto consumido por `ekovoz-cli apply-patch --file` (REF|OLD|NEW|NOTE y EKOVOZ_PATCH_PAYLOAD)
  const payloadLine = `EKOVOZ_PATCH_PAYLOAD|${cleanLang}|${cleanLevel}|${cleanRef}|${cleanOld}|${cleanNew}|${cleanNote}`;
  const cliFileLine = `${cleanRef}|${cleanOld}|${cleanNew}|${cleanNote}`;
  const tomlBlock =
    `[[patches]]\n` +
    `kind = "verse"\n` +
    `lang = "${cleanLang}"\n` +
    `level = "${cleanLevel}"\n` +
    `ref = "${cleanRef}"\n` +
    `strong_id = "${cleanStrong}"\n` +
    `old_surface = "${cleanOld.replace(/"/g, '\\"')}"\n` +
    `new_surface = "${cleanNew.replace(/"/g, '\\"')}"\n` +
    `note = "${cleanNote.replace(/"/g, '\\"')}"\n` +
    `audio_bytes = 0\n`;

  return {
    kind: "verse",
    lang: cleanLang,
    level: cleanLevel,
    ref: cleanRef,
    strong_id: cleanStrong,
    old_surface: cleanOld,
    new_surface: cleanNew,
    note: cleanNote,
    audio_bytes: 0,
    payloadLine,
    cliFileLine,
    tomlBlock,
  };
}

export function renderImproveDrawerHtml({
  i18n = null,
  lang = "stp",
  locale = "en",
  ref = "GEN.1.1",
  strongId = "H0430",
  currentVerseText = "",
} = {}) {
  const t = (k, vars) => (i18n && typeof i18n.t === "function" ? i18n.t(k, vars) : k);
  const patch = buildPatchPayload({
    kind: "verse",
    lang,
    locale,
    level: "L2",
    ref,
    strongId,
    oldSurface: currentVerseText,
    newSurface: currentVerseText,
  });

  return (
    `<section class="improve-drawer" data-lang="${patch.lang}" data-ref="${patch.ref}" data-strong-id="${patch.strong_id}" data-audio-bytes="0">` +
    `<header style="margin-bottom:0.65rem;">` +
    `<h4 style="margin:0;" data-i18n="improve.title">${t("improve.title")}</h4>` +
    `<p style="margin:0.25rem 0 0 0;font-size:0.84rem;color:var(--text-secondary);" data-i18n="improve.subtitle">${t("improve.subtitle")}</p>` +
    `</header>` +
    `<div style="display:grid;gap:0.55rem;">` +
    `<label style="font-size:0.84rem;">` +
    `<span data-i18n="improve.kind_label">${t("improve.kind_label")}</span> ` +
    `<select id="improveKindSelect" style="min-height:44px;padding:0.4rem;">` +
    `<option value="verse" data-i18n="improve.kind_verse">${t("improve.kind_verse")} (${patch.ref} · ${patch.strong_id})</option>` +
    `<option value="ui-string" data-i18n="improve.kind_ui">${t("improve.kind_ui")} (${locale})</option>` +
    `</select>` +
    `</label>` +
    `<label style="font-size:0.84rem;">` +
    `<span data-i18n="improve.level_label">${t("improve.level_label")}</span> ` +
    `<select id="improveLevelSelect" style="min-height:44px;padding:0.4rem;">` +
    `<option value="L1">${t("improve.level.L1")}</option>` +
    `<option value="L2" selected>${t("improve.level.L2")}</option>` +
    `<option value="L3">${t("improve.level.L3")}</option>` +
    `<option value="L4">${t("improve.level.L4")}</option>` +
    `<option value="L5">${t("improve.level.L5")}</option>` +
    `</select>` +
    `</label>` +
    `<label style="font-size:0.84rem;">` +
    `<span data-i18n="improve.current">${t("improve.current")}</span>` +
    `<input id="improveOldSurfaceInput" type="text" value="${patch.old_surface.replace(/"/g, "&quot;")}" style="width:100%;min-height:44px;padding:0.4rem;">` +
    `</label>` +
    `<label style="font-size:0.84rem;">` +
    `<span data-i18n="improve.proposed">${t("improve.proposed")}</span>` +
    `<input id="improveNewSurfaceInput" type="text" value="${patch.new_surface.replace(/"/g, "&quot;")}" style="width:100%;min-height:44px;padding:0.4rem;">` +
    `</label>` +
    `<label style="font-size:0.84rem;">` +
    `<span data-i18n="improve.note">${t("improve.note")}</span>` +
    `<input id="improveNoteInput" type="text" value="" style="width:100%;min-height:44px;padding:0.4rem;">` +
    `</label>` +
    `<pre id="improvePatchOutput" style="padding:0.6rem;border-radius:8px;background:var(--bg-secondary);font-size:0.78rem;overflow-x:auto;">${patch.payloadLine}</pre>` +
    `<div style="display:flex;flex-wrap:wrap;gap:0.5rem;">` +
    `<button type="button" id="btnCopyPatchPayload" class="uls-chip" style="min-height:48px;" data-i18n="improve.copy_patch">${t("improve.copy_patch")}</button>` +
    `<button type="button" id="btnDownloadPatchFile" class="uls-chip" style="min-height:48px;" data-i18n="improve.download_patch">${t("improve.download_patch")}</button>` +
    `</div>` +
    `</div>` +
    `</section>`
  );
}

