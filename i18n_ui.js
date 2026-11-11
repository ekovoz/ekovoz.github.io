import { renderFelicesSocraticWonderCardHtml } from "./mostrador/evangelios.js";
export const LANGUAGE_PACKS = Object.freeze("en|English,es|Español,bn-BD|Bengali BD|বাংলা|Beng,bn-IN|Bengali IN|বাংলা|Beng,fr|Français,pt|Português,it|Italiano,id|Indonesia,tr|Türkçe,ru|Русский||Cyrl,zh-Hans|中文||Hans,ja|日本語||Jpan,ko|한국어||Kore,hi|हिन्दी||Deva,bn|বাংলা||Beng,ar|العربية||Arab|rtl,ur|اردو||Aran|rtl,fa|فارسی||Arab|rtl".split(",").map((s) => { const [code, name, a, script = "Latn", dir = "ltr"] = s.split("|"); return { code, name, autonym: a || name, dir, script }; }));
const N = 28, D = () => (typeof document !== "undefined" ? document : null), $ = (d, id) => d?.getElementById?.(id), L = (x) => S(x).toLowerCase();
const clp = (v, h, d = 1) => Math.max(1, Math.min(h, Number(v) || d)), S = (v, d = "") => String(v || d).trim(), gL = (d, o) => o || $(d, "langSelect")?.value || "en";
let pIdx = 24, sIdx = 0, pFmt = "a4", onC = null;
export const FELICES_PLATE_TO_BIBLE_COORDINATE = Object.freeze(Object.fromEntries(Array.from({ length: N }, (_, i) => [i + 1, i < 24 ? { book: "MAT", chapter: 5, verse: i < 4 ? 3 : Math.min(12, (i >> 1) + 2), beatitudeIndex: Math.min(10, i >> 1) } : { book: "PSA", chapter: 1, verse: [1, 2, 3, 6][i - 24], beatitudeIndex: 11 }])));
const FC = FELICES_PLATE_TO_BIBLE_COORDINATE, WK = ["biblia", "felices", "evangelios"], uC = new Map(), fC = new Map(), pLc = (l) => (S(l).includes("-") ? S(l).split("-")[0] : null);
const pWk = (s) => { const m = L(s).match(/^s?0*(\d{1,2})$/); return m ? `s${String(clp(m[1], 52)).padStart(2, "0")}` : null; };
export const getActivePlateIndex = () => pIdx;
export function setActivePlateIndex(i, doc = D()) { pIdx = clp(i, N, 1); updateFocalPlate(doc); return pIdx; }
export function registerPlateCoordinateListener(fn) { onC = typeof fn === "function" ? fn : null; }
export function resolvePlateForBibleCoordinate(b = "MAT", ch = 5, v = 3, cur = pIdx) {
const B = S(b, "MAT").toUpperCase(), C = Number(ch) || 1, V = Number(v) || 1, k = clp(cur, N, pIdx), x = FC[k];
if (x && x.book === B && x.chapter === C && x.verse === V) return k;
if (B === "PSA" && C === 1) return V <= 1 ? 25 : V === 2 ? 26 : V <= 5 ? 27 : 28;
if (B === "MAT" && C === 5) for (const [p, y] of Object.entries(FC)) if (y.book === B && y.chapter === 5 && y.verse === V) return Number(p);
return k;
}
export function parseInitialRouteAndLocale({ search = "", pathname = "", defaultUi = "en", defaultLang = "es" } = {}) {
const q = new URLSearchParams(S(search).replace(/^\?/, "")), pL = L(pathname), g = (k) => S(q.get(k)), b = (k, h) => { const n = Number(q.get(k)); return n >= 1 ? clp(Math.round(n), h) : null; };
const plate = b("plate", N), dicha = b("dicha", 12), week = pWk(g("week")), rW = L(g("work")), work = WK.includes(rW) ? rW : plate || dicha ? "felices" : week ? "evangelios" : WK.find((w) => pL.includes(w)) || "biblia";
const dP = dicha ? (dicha === 12 ? 25 : clp(dicha * 2 - 1, 24)) : null, pC = work === "felices" && (plate || dP) ? FC[plate || dP] : null, rR = g("ref");
return { work, ui: g("ui") || defaultUi || "en", lang: g("lang") || defaultLang || "es", ref: rR || (pC ? `${pC.book}.${pC.chapter}.${pC.verse}` : "JHN.1.1"), refExplicit: !!rR, plate, dicha, week, reg: L(g("reg") || g("register")) || null, ortho: g("ortho") || null, sheet: L(g("sheet")) || null, format: L(g("format")) === "letter" ? "letter" : "a4" };
}
export function serializeMostradorRouteQuery(st = {}) {
const rW = L(st.work || st.activeWork || "biblia"), work = WK.includes(rW) ? rW : "biblia", q = new URLSearchParams({ work, ui: S(st.ui || st.uiLocale, "en"), lang: S(st.lang, "es"), ref: S(st.ref, `${S(st.book, "JHN").toUpperCase()}.${clp(st.chapter, 999)}.${clp(st.verse, 999)}`) });
if (work === "felices") { q.set("plate", String(clp(st.plate ?? st.activePlateIndex ?? pIdx, N, 24))); const d = Number(st.dicha ?? st.activeDichaIndex ?? st.felicesDicha); if (d >= 1 && d <= 12) q.set("dicha", String(Math.round(d))); } else if (work === "evangelios") q.set("week", pWk(st.week || st.evangeliosWeekId) || "s01");
for (const [k, v] of [["reg", L(st.reg || st.register)], ["ortho", S(st.ortho || st.orthographyProfile)], ["sheet", L(st.sheet || st.activeSheet)], ["format", L(st.format || st.paperFormat)]]) if (v && v !== "intergeneracional" && v !== "a4") q.set(k, v);
return `?${q}`;
}
export function resolveDistLangSlug(l) { const r = S(l, "en"); return r === "zh-Hans" || r === "zh" ? "zh" : r.startsWith("bn") ? "bn" : LANGUAGE_PACKS.find((p) => p.code === r)?.code || "en"; }
export function getPlateUrl(i = pIdx) { return `/assets/felices/plates/${String(clp(i, N)).padStart(2, "0")}.jpg`; }
export function resolveFelicesStrings(loc, cats = {}) {
const gC = (l) => { const x = l && (cats[l] || uC.get(l)); return x?.messages || x || {}; }, e = gC("en"), c = gC(loc), p = gC(pLc(loc)), o = {};
for (const k of new Set([...Object.keys(e), ...Object.keys(p), ...Object.keys(c)])) if (k.startsWith("felices.")) { const v = c[k] || p[k] || e[k]; if (v !== undefined) o[k.slice(8)] = o[k] = v; }
return o;
}
export function resolveFelicesPlateVerse(i, loc, byL = {}) {
const gV = (l) => { const x = l && (byL[l] || fC.get(l)); return x?.plate_verses || x?.plateVerses || {}; }, k = String(i), c = FC[clp(i, N, 24)] || FC[24];
const fb = `${S(loc).startsWith("es") ? "«Bienaventurados»" : "“Blessed”"} (${c.book} ${c.chapter}:${c.verse})`, r = gV(loc)[k] || gV(pLc(loc))[k] || gV("en")[k] || fb;
return loc === "bn-BD" ? [["প্রভু যীশুর আনন্দময় মানুষ", "ঈসা মসীহের মোবারক মানুষ"], ["প্রভু যীশু", "ঈসা মসীহ"], ["স্বর্গরাজ্য", "আসমানের রাজ্য"], ["মথি", "মতী"]].reduce((s, [a, b]) => s.replaceAll(a, b), r) : r;
}
export async function ensureLocaleLoaded(loc, fn = typeof fetch === "function" ? fetch : null) {
if (!fn) return; for (const l of new Set(["en", loc, pLc(loc)])) if (l) for (const [m, p] of [[uC, `i18n/${l}.json`], [fC, `data/felices/${l}.json`]]) if (!m.has(l)) try { const r = await fn(p); if (r?.ok) m.set(l, await r.json()); } catch {}
}
export function updateDownloadLinks(doc = D(), lO = "") {
if (!doc) return null; const d = resolveDistLangSlug(gL(doc, lO)), fmt = pFmt === "letter" ? "letter" : "a4", pL = ["es", "en", "stp", "he", "grc"].includes(d) ? d : "en", sH = `data/full/${pL}/2col-${fmt}.pdf`, bH = `data/blocks/${pL}/2col-${fmt}/B50.pdf`;
for (const [id, h, fn] of [["linkSheets", sH, `felices-${d}-v1-sheets-${fmt}.pdf`], ["linkBooklet", bH, `felices-${d}-v1-booklet-${fmt}.pdf`]]) { const e = $(doc, id); if (e) { e.href = h; e.setAttribute("download", fn); } }
return { distLang: d, sheetsHref: sH, bookletHref: bH, paperFormat: pFmt };
}
export function setPaperFormat(f, d = D()) { pFmt = f === "letter" ? "letter" : "a4"; if (!d) return pFmt; for (const [id, on] of [["toggleA4", pFmt === "a4"], ["toggleCarta", pFmt !== "a4"]]) { const b = $(d, id), s = String(on); b?.classList?.toggle?.("active", on); b?.setAttribute?.("aria-checked", s); b?.setAttribute?.("aria-pressed", s); } updateDownloadLinks(d); return pFmt; }
export function updateFocalPlate(d = D(), lO = "", n = true) {
if (!d) return; const l = gL(d, lO), lb = `${resolveFelicesStrings(l).plateLabel || "Plate"} ${pIdx} / ${N}`, u = getPlateUrl(pIdx).slice(1), tx = resolveFelicesPlateVerse(pIdx, l), c = FC[pIdx] || FC[24], os = `${c.book}.${c.chapter}.${c.verse}`, dI = clp((c.beatitudeIndex || 0) + 1, 12);
const im = $(d, "focalPlateImg"), id = $(d, "plateIndexText"), vE = $(d, "focalPlateVerse"), cI = $(d, "carouselImg"), cC = $(d, "carouselCaption"), wC = $(d, "felicesSocraticWonderCard");
if (im) { im.src = u; im.alt = lb; } if (id) { id.textContent = lb; id.setAttribute("data-osis-ref", os); } if (vE) vE.textContent = tx; if (cI) cI.src = u; if (cC) cC.textContent = tx; if (wC) wC.innerHTML = renderFelicesSocraticWonderCardHtml(pIdx, l);
sIdx = pIdx <= 11 ? 0 : pIdx <= 23 ? 1 : 2; for (let j = 0; j < 3; j++) $(d, `termPill_${j + 1}`)?.classList?.toggle("active", j === sIdx);
for (const [k, v] of [["felicesPlateSelect", `${pIdx}`], ["felicesDichaSelect", `${dI}`]]) { const e = $(d, k); if (e && e.value !== v) e.value = v; }
$(d, "btnFelicesOpenInBible")?.setAttribute("data-felices-osis", os); if (n) onC?.({ plateIndex: pIdx, dichaIndex: dI, book: c.book, chapter: c.chapter, verse: c.verse });
}
export function syncI18nUiFromState(st = {}, d = D()) { if (st.activePlateIndex !== undefined || st.plate !== undefined) pIdx = clp(st.activePlateIndex ?? st.plate, N, 24); if (st.paperFormat || st.format) setPaperFormat(L(st.paperFormat || st.format), d); const l = gL(d, st.lang || st.uiLocale); updateDownloadLinks(d, l); updateFocalPlate(d, l, false); if (d) ensureLocaleLoaded(l).then(() => updateFocalPlate(d, l, false)).catch(() => {}); return { plateIndex: pIdx, paperFormat: pFmt }; }
export const nextPlate = (d = D()) => (pIdx = pIdx < N ? pIdx + 1 : 1, updateFocalPlate(d), pIdx), prevPlate = (d = D()) => (pIdx = pIdx > 1 ? pIdx - 1 : N, updateFocalPlate(d), pIdx), nextSlide = nextPlate, prevSlide = prevPlate;
export function openActivePlateZoom(d = D()) { if (!d) return; const l = gL(d), mI = $(d, "plateModalImg"), mC = $(d, "plateModalCaption"); if (mI) mI.src = getPlateUrl(pIdx).slice(1); if (mC) mC.textContent = resolveFelicesPlateVerse(pIdx, l); openModal("plateModal", d); }
export const printActivePlate = (w = typeof window !== "undefined" ? window : null) => w?.print?.();
export function shareResource(d = D(), st = null) { const c = FC[pIdx] || FC[24], u = serializeMostradorRouteQuery(st || { work: "felices", ui: d?.documentElement?.lang || "en", lang: gL(d, "es"), plate: pIdx, ref: `${c.book}.${c.chapter}.${c.verse}`, format: pFmt }); if (typeof navigator !== "undefined") navigator.clipboard?.writeText?.(u)?.catch?.(() => {}); const t = $(d, "toastNotification"); if (t) { t.textContent = `Link copied (${c.book} ${c.chapter}:${c.verse})`; t.classList?.add?.("show"); } return u; }
export const setSlide = (i = 0, d = D()) => { const n = Number(i) || 0; pIdx = n >= 3 && n <= N ? clp(n, N) : [1, 12, 24][((n % 3) + 3) % 3]; updateFocalPlate(d); return sIdx; };
export function applyAriaLabelsToDom(r, d = {}) { const m = d.messages || d || {}; for (const e of r?.querySelectorAll?.("[data-i18n-aria-label]") || []) { const v = m[e.getAttribute("data-i18n-aria-label") || ""]; if (typeof v === "string" && v.trim()) { e.setAttribute("aria-label", v); e.setAttribute("title", v); } } }
const MD = new Set(["previewModal", "plateModal"]);
export const openModal = (id, d = D()) => { if (S(id) === "previewModal") updateFocalPlate(d, "", false); if (MD.has(S(id))) $(d, id)?.showModal?.(); }, closeModal = (id, d = D()) => { if (MD.has(S(id))) $(d, id)?.close?.(); }, syncFelicesWithCorpusLang = async (l, d = D()) => { if (d) { await ensureLocaleLoaded(l); updateFocalPlate(d); } };
export async function updateUI(doc = D()) {
if (!doc) return; const l = gL(doc); await ensureLocaleLoaded(l); const pk = LANGUAGE_PACKS.find((p) => p.code === l) || LANGUAGE_PACKS[0], t = resolveFelicesStrings(l);
doc.documentElement.lang = pk.code; doc.documentElement.dir = pk.dir;
for (const s of "categoryBadge:badge,workTitle:title,workDesc:desc,btnTitleSheets,btnSubSheets,btnTitleBooklet,btnSubBooklet,opticalTriggerText:opticalTrigger,offlineBadgeText:offlineBadge,footerNote,btnPrintPlateText:btnPrintPlate,btnShareWorkText:btnShare,foldGuideTrigger,nameCarta,subCarta:subCarta|labelCartaSub,nameA4,subA4:subA4|labelA4Sub,focalPlateZoomHintText:tapToZoom".split(",")) { const [id, k = id] = s.split(":"), [k1, k2] = k.split("|"), e = $(doc, id), v = t[k1] || (k2 && t[k2]); if (e && v) e.textContent = v; }
applyAriaLabelsToDom(doc, uC.get(l) || uC.get("en") || {}); updateDownloadLinks(doc); updateFocalPlate(doc);
}
