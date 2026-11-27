import { resolveOverlayEntryForOsis, resolveVerseWithOverlay } from "./mostrador/drawer_workshop.js";
import { FELICES_PLATE_TO_BIBLE_COORDINATE, parseInitialRouteAndLocale, renderFelicesSocraticWonderCardHtml, resolveFelicesPlateCoord, serializeMostradorRouteQuery as serializeRouteCore } from "./mostrador/evangelios.js";
import { renderLocalizedFelicesPlateCardHtml } from "./mostrador/felices_stage_controller.js";
export { FELICES_PLATE_TO_BIBLE_COORDINATE, parseInitialRouteAndLocale };
export const LANGUAGE_PACKS = Object.freeze("en|English,es|Español,bn-BD|Bengali BD|বাংলা|Beng,bn-IN|Bengali IN|বাংলা|Beng,fr|Français,pt|Português,it|Italiano,id|Indonesia,tr|Türkçe,ru|Русский||Cyrl,zh-Hans|中文||Hans,ja|日本語||Jpan,ko|한국어||Kore,hi|हिन्दी||Deva,bn|বাংলা||Beng,ar|العربية||Arab|rtl,ur|اردو||Aran|rtl,fa|فارسی||Arab|rtl".split(",").map(s=>{const[code,name,a,script="Latn",dir="ltr"]=s.split("|");return{code,name,autonym:a||name,dir,script};}));
const N=27,D=()=>typeof document!=="undefined"?document:null,$=(d,id)=>d?.getElementById?.(id),L=x=>S(x).toLowerCase(),clp=(v,h,d=1)=>Math.max(1,Math.min(h,Number(v)||d)),S=(v,d="")=>String(v||d).trim(),gL=(d,o)=>o||$(d,"langSelect")?.value||"en",sA=(e,k,v)=>e?.setAttribute?.(k,v);
let pIdx = 24, sIdx = 0, pFmt = "a4", onC = null, stRef = null;
const FC = FELICES_PLATE_TO_BIBLE_COORDINATE, uC = new Map(), fC = new Map(), pLc = l => (S(l).includes("-") ? S(l).split("-")[0] : null);
export const getActivePlateIndex = () => pIdx;
export function setActivePlateIndex(i, d = D()) { pIdx = clp(i, N, 1); updateFocalPlate(d); return pIdx; }
export function registerPlateCoordinateListener(fn) { onC = typeof fn === "function" ? fn : null; }
export const resolvePlateForBibleCoordinate = (b = "MAT", ch = 5, v = 3, cur = pIdx, opts = {}) => resolveFelicesPlateCoord(b, ch, v, cur, opts);
export const serializeMostradorRouteQuery = (st = {}) => serializeRouteCore(st, pIdx);
export function resolveDistLangSlug(l) { const r = S(l, "en"); return r === "zh-Hans" || r === "zh" ? "zh" : r.startsWith("bn") ? "bn" : LANGUAGE_PACKS.find(p => p.code === r)?.code || "en"; }
export function getPlateUrl(i = pIdx) { return `/assets/felices/plates/${String(clp(i, N)).padStart(2, "0")}.jpg`; }
export function resolveFelicesStrings(loc, cats = {}) {
  const gC = l => { const x = l && (cats[l] || uC.get(l)); return x?.messages || x || {}; }, e = gC("en"), c = gC(loc), p = gC(pLc(loc)), o = {};
  for (const k of new Set([...Object.keys(e), ...Object.keys(p), ...Object.keys(c)])) if (k.startsWith("felices.")) { const v = c[k] || p[k] || e[k]; if (v !== undefined) o[k.slice(8)] = o[k] = v; }
  return o;
}
export function resolveFelicesPlateVerse(i, loc, byL = {}, st = stRef) {
  const gV = l => { const x = l && (byL[l] || fC.get(l)); return x?.plate_verses || x?.plateVerses || {}; }, k = String(i), c = FC[clp(i, N, 24)] || FC[24], os = `${c.book}.${c.chapter}.${c.verse}`;
  const fb = `${S(loc).startsWith("es") ? "«Bienaventurados»" : "“Blessed”"} (${c.book} ${c.chapter}:${c.verse})`, r = gV(loc)[k] || gV(pLc(loc))[k] || gV("en")[k] || fb;
  return resolveVerseWithOverlay(st, loc, os, r);
}
async function ensureLocaleLoaded(loc, fn = typeof fetch === "function" ? fetch : null) {
  if (!fn) return; for (const l of new Set(["en", loc, pLc(loc)])) if (l) for (const [m, p] of [[uC, `i18n/${l}.json`], [fC, `data/felices/${l}.json`]]) if (!m.has(l)) try { const r = await fn(p); if (r?.ok) m.set(l, await r.json()); } catch { }
}
const D16 = ["es", "en", "fr", "pt", "it", "id", "tr", "ru", "zh-Hans", "ja", "ko", "hi", "bn", "ar", "ur", "fa"];
export function updateDownloadLinks(doc = D(), lO = "") {
  if (!doc) return null; const r = S(gL(doc, lO), "en"), d = r === "zh" || r === "zh-Hans" ? "zh-Hans" : r.startsWith("bn") ? "bn" : D16.includes(r) ? r : resolveDistLangSlug(r), pL = D16.includes(d) ? d : "en", f = pFmt === "letter" ? "letter" : "a4", sH = `dist/${pL}/v1/mostrador/felices-${pL}-v1-sheets.pdf`, bH = `dist/${pL}/v1/mostrador/felices-${pL}-v1-booklet.pdf`;
  for (const [id, h, fn] of [["linkSheets", sH, `felices-${pL}-v1-sheets-${f}.pdf`], ["linkBooklet", bH, `felices-${pL}-v1-booklet-${f}.pdf`]]) { const e = $(doc, id); if (e) { e.href = h; sA(e, "download", fn); } }
  return { distLang: pL, sheetsHref: sH, bookletHref: bH, paperFormat: pFmt };
}
export function setPaperFormat(f, d = D()) { pFmt = f === "letter" ? "letter" : "a4"; if (stRef && typeof stRef === "object") { stRef.paperFormat = pFmt; stRef.felicesPaperFormat = pFmt; } const sel = $(d, "kindlePaperFormatSelector"); if (sel && sel.value && sel.value !== "b70" && sel.value !== pFmt) sel.value = pFmt; if (!d) return pFmt; for (const [id, on] of [["toggleA4", pFmt === "a4"], ["toggleCarta", pFmt !== "a4"]]) { const b = $(d, id), s = String(on); b?.classList?.toggle?.("active", on); sA(b, "aria-checked", s); sA(b, "aria-pressed", s); } updateDownloadLinks(d); return pFmt; }
export function updateFocalPlate(d = D(), lO = "", n = true, uO = "", st = stRef) {
  if (!d) return; const l = gL(d, lO), uL = uO || l, isEs = L(uL).startsWith("es"), isEn = !isEs, pW = resolveFelicesStrings(uL).plateLabel || (isEn ? "Plate" : "Lámina"), lb = `${pW} ${pIdx} / ${N}`, u = getPlateUrl(pIdx).slice(1), c = FC[pIdx] || FC[24], os = `${c.book}.${c.chapter}.${c.verse}`, tx = resolveFelicesPlateVerse(pIdx, l, {}, st), ov = resolveOverlayEntryForOsis(st, l, os), dI = clp((c.beatitudeIndex || 0) + 1, 12), g = id => $(d, id);
  const im = g("focalPlateImg"), id = g("plateIndexText"), vE = g("focalPlateVerse"), cI = g("carouselImg"), cC = g("carouselCaption"), wC = g("felicesSocraticWonderCard"), fFr = g("focalPlateFrame"), esC = L(l).startsWith("es");
  let loc = g("focalPlateLocalizedArt");
  if (!loc && fFr && d.createElement) { loc = d.createElement("div"); loc.id = "focalPlateLocalizedArt"; loc.className = "felices-localized-plate-host"; fFr.insertBefore?.(loc, im?.nextSibling || null); }
  if (im) { im.src = u; im.alt = lb; im.hidden = false; }
  if (loc) { loc.hidden = esC; if (!esC) loc.innerHTML = renderLocalizedFelicesPlateCardHtml({ plateIndex: pIdx, totalPlates: N, lang: l, uiLocale: uL, verseText: tx, refLabel: `${c.book} ${c.chapter}:${c.verse}`, dir: LANGUAGE_PACKS.find(p => p.code === l || p.code === pLc(l))?.dir || "ltr" }); }
  if (id) { id.textContent = lb; sA(id, "data-osis-ref", os); } if (vE) { vE.textContent = tx; vE.hidden = !esC; sA(vE, "data-osis-ref", os); sA(vE, "data-overlay-authority", ov?.authorityTier || ""); } if (cI) cI.src = u; if (cC) cC.textContent = tx; if (wC) wC.innerHTML = renderFelicesSocraticWonderCardHtml(pIdx, uL);
  sIdx = pIdx <= 11 ? 0 : pIdx <= 23 ? 1 : 2; for (let j = 0; j < 3; j++)g(`termPill_${j + 1}`)?.classList?.toggle("active", j === sIdx);
  for (const [k, v] of [["felicesPlateSelect", `${pIdx}`], ["felicesDichaSelect", `${dI}`], ["felicesLangSelect", l]]) { const e = g(k); if (e && e.value !== v) e.value = v; }
  for (const o of g("felicesPlateSelect")?.options || []) { const m = S(o.textContent).replace(/(?:\s*·)+/g, " ").match(/^(?:Lámina|Lám\.|Plate|Pl\.)?\s*(\d+)\s*\/\s*27\s*(.+)$/i), pn = m ? m[1] : S(o.value, "1"), r0 = (m ? m[2] : S(o.textContent)).replace(/[()]/g, "").trim(); sA(o, "data-plate-num", pn); sA(o, "data-plate-ref", r0); o.textContent = `${isEn ? "Pl." : "Lám."} ${pn}/27 · ${isEn ? r0.replace(/\bSal\b/g, "Ps") : r0.replace(/\bPs\b/g, "Sal")}`; }
  for (const o of g("felicesDichaSelect")?.options || []) { const t = S(o.textContent).replace(/\s*·\s*/g, " · ").replace(/\s+\(/, " · ").replace(/\)\s*$/, ""); o.textContent = isEn ? t.replace(/^Dicha\b/, "Beatitude").replace(/\bSal\b/g, "Ps") : t.replace(/^Beatitude\b/, "Dicha").replace(/\bPs\b/g, "Sal"); }
  const ob = g("btnFelicesOpenInBible"); if (ob) { sA(ob, "data-felices-osis", os); ob.textContent = `${isEs ? "📖 Abrir pasaje en La Biblia" : "📖 Open passage in The Bible"} (${c.book} ${c.chapter}:${c.verse})`; } if (n) onC?.({ plateIndex: pIdx, dichaIndex: dI, book: c.book, chapter: c.chapter, verse: c.verse });
}
export function syncI18nUiFromState(st = {}, d = D()) { if (st && typeof st === "object") stRef = st; if (st.activePlateIndex !== undefined || st.plate !== undefined) pIdx = clp(st.activePlateIndex ?? st.plate, N, 24); else if (st.book && st.chapter && st.verse) pIdx = resolvePlateForBibleCoordinate(st.book, st.chapter, st.verse, pIdx); if (st.paperFormat || st.format) setPaperFormat(L(st.paperFormat || st.format), d); const l = S(st.lang || st.uiLocale || gL(d), "es"), u = S(st.uiLocale || l, "en"); updateDownloadLinks(d, l); updateFocalPlate(d, l, false, u, st); if (d) { ensureLocaleLoaded(l).then(() => updateFocalPlate(d, l, false, u, st)).catch(() => { }); } return { plateIndex: pIdx, paperFormat: pFmt }; }
export const nextPlate = (d = D()) => (pIdx = pIdx < N ? pIdx + 1 : 1, updateFocalPlate(d), pIdx);
export const prevPlate = (d = D()) => (pIdx = pIdx > 1 ? pIdx - 1 : N, updateFocalPlate(d), pIdx);
export const nextSlide = nextPlate;
export const prevSlide = prevPlate;
export function openActivePlateZoom(d = D()) { if (!d) return; const l = gL(d), mI = $(d, "plateModalImg"), mC = $(d, "plateModalCaption"); if (mI) mI.src = getPlateUrl(pIdx).slice(1); if (mC) mC.textContent = resolveFelicesPlateVerse(pIdx, l); openModal("plateModal", d); }
export const printActivePlate = (w = typeof window !== "undefined" ? window : null) => w?.print?.();
export function shareResource(d = D(), st = null) { const c = FC[pIdx] || FC[24], uL = S(st?.uiLocale || d?.documentElement?.lang || "es", "es"), u = serializeMostradorRouteQuery(st || { work: "felices", ui: uL, lang: gL(d, "es"), plate: pIdx, ref: `${c.book}.${c.chapter}.${c.verse}`, format: pFmt }); if (typeof navigator !== "undefined") navigator.clipboard?.writeText?.(u)?.catch?.(() => { }); const t = $(d, "toastNotification"); if (t) { const msg = resolveFelicesStrings(uL).linkCopied || (L(uL).startsWith("es") ? "Enlace copiado" : "Link copied"); t.textContent = `${msg} (${c.book} ${c.chapter}:${c.verse})`; t.classList?.add?.("show"); } return u; }
export const setSlide = (i = 0, d = D()) => { const n = Number(i) || 0; pIdx = n >= 3 && n <= N ? clp(n, N) : [1, 12, 24][((n % 3) + 3) % 3]; updateFocalPlate(d); return sIdx; };
export function applyAriaLabelsToDom(r, d = {}) { const m = d.messages || d || {}; for (const e of r?.querySelectorAll?.("[data-i18n-aria-label]") || []) { const v = m[e.getAttribute("data-i18n-aria-label") || ""]; if (typeof v === "string" && v.trim()) { sA(e, "aria-label", v); sA(e, "title", v); } } }
const MD = new Set(["previewModal", "plateModal"]);
export const openModal = (id, d = D()) => { if (S(id) === "previewModal") updateFocalPlate(d, "", false); if (MD.has(S(id))) $(d, id)?.showModal?.(); };
export const closeModal = (id, d = D()) => { if (MD.has(S(id))) $(d, id)?.close?.(); };
export const syncFelicesWithCorpusLang = async (l, d = D()) => { if (d) { await ensureLocaleLoaded(l); updateFocalPlate(d); } };
export async function updateUI(doc = D()) {
  if (!doc) return; const l = gL(doc); await ensureLocaleLoaded(l); const pk = LANGUAGE_PACKS.find(p => p.code === l) || LANGUAGE_PACKS[0], t = resolveFelicesStrings(l);
  doc.documentElement.lang = pk.code; doc.documentElement.dir = pk.dir;
  for (const s of "categoryBadge:badge,workTitle:title,workDesc:desc,btnTitleSheets,btnSubSheets,btnTitleBooklet,btnSubBooklet,opticalTriggerText:opticalTrigger,offlineBadgeText:offlineBadge,footerNote,btnPrintPlateText:btnPrintPlate,btnShareWorkText:btnShare,foldGuideTrigger,nameCarta,subCarta:subCarta|labelCartaSub,nameA4,subA4:subA4|labelA4Sub,focalPlateZoomHintText:tapToZoom".split(",")) { const [id, k = id] = s.split(":"), [k1, k2] = k.split("|"), e = $(doc, id), v = t[k1] || (k2 && t[k2]); if (e && v) e.textContent = v; }
  applyAriaLabelsToDom(doc, uC.get(l) || uC.get("en") || {}); updateDownloadLinks(doc); updateFocalPlate(doc);
}
