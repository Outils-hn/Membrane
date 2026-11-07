// Membrane : affichage et saisie. Les calculs sont dans core.js.
import { PRODUITS, COLLE, ROULEAU_M, DIRS, REGLAGES_DEFAUT, dir, nombre, fmt, calculBande, commande, positionCordon, reglages } from "./core.js";

const $ = (id) => document.getElementById(id);
const CLE = "membrane.v1";
const APPLIS = [
  ["Access", "Annuaire fournisseurs", "#C2255C"], ["Check", "Notes & tâches", "#4338CA"], ["Format", "Débit de panneaux", "#FF4D00"],
  ["Index", "Fiches techniques", "#6D4AFF"], ["Joint", "Dilatation et joints", "#0B7285"], ["Linear", "Mise en barre", "#2B50FF"],
  ["Masse", "Poids des éléments", "#9A4A3A"], ["Membrane", "Étanchéité", "#B45309"], ["Strate", "Épaisseurs d'isolation", "#D4A20B"], ["Trame", "Répartition de perçages", "#0E9F6E"],
];
const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// ---------- Etat : la bande en cours + la commande (gardes dans le navigateur) ----------
const NEUF = () => ({
  facade: "", etage: "", plan: "", produit: "outplus", mesure: false, longueur: "12",
  segs: [{ len: "100", dir: "E", on: true }, { len: "40", dir: "SE", on: false }, { len: "80", dir: "E", on: true }],
});
let b = NEUF();       // bande en cours de dessin
let lignes = [];      // la commande
let edition = null;   // id de la ligne en cours de modification
let reg = { ...REGLAGES_DEFAUT }; // reglages de la commande (colle, marge, recouvrement)
try {
  const lu = JSON.parse(localStorage.getItem(CLE) ?? "null");
  if (lu?.bande) b = nettoyer(lu.bande);
  if (Array.isArray(lu?.lignes)) lignes = lu.lignes.map(nettoyer).filter(Boolean);
  if (lu?.reg && typeof lu.reg === "object") for (const k of Object.keys(reg)) if (typeof lu.reg[k] === "string") reg[k] = lu.reg[k];
} catch (e) { /* stockage bloque : on part de zero */ }
function nettoyer(x) {
  if (!x || typeof x !== "object") return NEUF();
  const n = NEUF();
  for (const k of ["facade", "etage", "plan", "longueur"]) if (typeof x[k] === "string") n[k] = x[k];
  if (PRODUITS[x.produit]) n.produit = x.produit;
  n.mesure = x.mesure === true;
  if (Array.isArray(x.segs) && x.segs.length) n.segs = x.segs.slice(0, 12).map((s) => ({ len: String(s?.len ?? ""), dir: DIRS.some((d) => d.id === s?.dir) ? s.dir : "E", on: s?.on === true }));
  if (typeof x.id === "string") n.id = x.id;
  return n;
}
const sauver = () => { try { localStorage.setItem(CLE, JSON.stringify({ bande: b, lignes, reg })); } catch (e) { /* ignore */ } };

// ---------- Menu des applis ----------
$("appsList").innerHTML = `<div class="apps-label">Mes outils</div>
  <a href="https://outils-hn.github.io/"><span class="sw" style="background:conic-gradient(#C2255C 0 25%,#6D4AFF 0 50%,#0E9F6E 0 75%,#FF4D00 0)"></span><span class="nm">Accueil</span><span class="rl">Toutes les applis, idées &amp; bugs</span></a>
  <div class="apps-sep" role="separator"></div>` +
  APPLIS.map(([nom, role, c]) => `<a href="https://outils-hn.github.io/${nom}/"${nom === "Membrane" ? ' aria-current="page"' : ""}><span class="sw" style="background:${c}"></span><span class="nm">${nom}</span><span class="rl">${role.replace("&", "&amp;")}</span>${nom === "Membrane" ? '<span class="ck" aria-hidden="true">✓</span>' : ""}</a>`).join("");
document.addEventListener("click", (e) => { const m = $("appsMenu"); if (m.open && !m.contains(e.target)) m.open = false; });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && $("appsMenu").open) { $("appsMenu").open = false; $("appsMenu").querySelector("summary").focus(); } });

// ---------- Theme clair / sombre (reglage commun aux applis) ----------
const ICONES = {
  light: '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  dark: '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
};
function themeActuel() {
  try { const t = localStorage.getItem("outils-theme"); if (t === "light" || t === "dark") return t; } catch (e) { /* ignore */ }
  return matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
function appliquerTheme(k) {
  document.documentElement.dataset.theme = k;
  try { localStorage.setItem("outils-theme", k); } catch (e) { /* ignore */ }
  const nom = k === "dark" ? "Thème sombre" : "Thème clair";
  $("themeBtn").innerHTML = ICONES[k]; $("themeBtn").title = nom; $("themeBtn").setAttribute("aria-label", `${nom} (cliquer pour changer)`);
}
$("themeBtn").addEventListener("click", () => appliquerTheme(themeActuel() === "dark" ? "light" : "dark"));
appliquerTheme(themeActuel());

let toastT;
function toast(msg) { const t = $("toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 2600); }

// ---------- Champs simples ----------
$("produit").innerHTML = Object.entries(PRODUITS).map(([k, p]) => `<option value="${k}">${p.nom}${p.role ? ` (${p.role})` : ""}</option>`).join("");
$("produit").addEventListener("change", () => { b.produit = $("produit").value; maj(); });
for (const k of ["facade", "etage", "plan", "longueur"]) $(k).addEventListener("input", () => { b[k] = $(k).value; maj(); });
for (const k of Object.keys(REGLAGES_DEFAUT)) $(k).addEventListener("input", () => { reg[k] = $(k).value; maj(); afficherCommande(); });
$("cartSeg").innerHTML = COLLE.choixMetres.map((m) => `<button type="button" data-m="${m}">${fmt(m, m % 1 ? 1 : 0)} m<br><small>${m === 10 ? "courant" : "défavorable"}</small></button>`).join("");
$("cartSeg").addEventListener("click", (e) => { const x = e.target.closest("button[data-m]"); if (x) { reg.cartouche = x.dataset.m.replace(".", ","); maj(); afficherCommande(); } });
$("mesure").innerHTML = `<button type="button" role="radio" data-k="std">Standard</button><button type="button" role="radio" data-k="mes">Coupée sur mesure</button>`;
$("mesure").addEventListener("click", (e) => { const x = e.target.closest("button[data-k]"); if (x) { b.mesure = x.dataset.k === "mes"; maj(); } });

// ---------- Troncons ----------
function lignesTroncons() {
  $("segs").innerHTML = b.segs.map((s, i) => `<div class="row" data-i="${i}">
    <span class="n">${i + 1}</span>
    <span class="withu"><input data-f="len" inputmode="decimal" autocomplete="off" aria-label="Largeur du tronçon ${i + 1} en mm" value="${esc(s.len)}"><em>mm</em></span>
    <select data-f="dir" aria-label="Direction du tronçon ${i + 1}">${DIRS.map((d) => `<option value="${d.id}"${d.id === s.dir ? " selected" : ""}>${d.fleche} ${d.nom}</option>`).join("")}</select>
    <button type="button" class="tg${s.on ? " on" : ""}" data-f="on" aria-pressed="${s.on}">${s.on ? "Collé" : "Libre"}</button>
    <button type="button" class="x" data-f="del" aria-label="Supprimer le tronçon ${i + 1}">×</button></div>`).join("");
}
$("segs").addEventListener("input", (e) => {
  const row = e.target.closest(".row"); if (!row) return;
  const s = b.segs[Number(row.dataset.i)];
  if (e.target.dataset.f === "len") s.len = e.target.value;
  maj();
});
$("segs").addEventListener("change", (e) => {
  const row = e.target.closest(".row"); if (!row || e.target.dataset.f !== "dir") return;
  b.segs[Number(row.dataset.i)].dir = e.target.value; maj();
});
$("segs").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-f]"); if (!btn) return;
  const i = Number(btn.closest(".row").dataset.i);
  if (btn.dataset.f === "on") b.segs[i].on = !b.segs[i].on;
  else if (btn.dataset.f === "del") { if (b.segs.length <= 1) return; b.segs.splice(i, 1); }
  lignesTroncons(); maj();
});
$("addSeg").addEventListener("click", () => {
  if (b.segs.length >= 12) return;
  b.segs.push({ len: "50", dir: b.segs.at(-1)?.dir ?? "E", on: false });
  lignesTroncons(); maj();
  $("segs").querySelector(".row:last-child input")?.focus();
});

// ---------- Dessin en coupe ----------
const mmTxt = (n, d = 0) => `${fmt(n, d)} mm`;
function dessiner() {
  const pts = [[0, 0]];
  let x = 0, y = 0;
  b.segs.forEach((s) => { const d = dir(s.dir), l = Math.max(0, nombre(s.len) || 0); x += d.x * l; y += d.y * l; pts.push([x, y]); });
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const w = Math.max(Math.max(...xs) - Math.min(...xs), 1), h = Math.max(Math.max(...ys) - Math.min(...ys), 1);
  const k = Math.min(440 / w, 150 / h, 3.5);
  const ox = 300 - ((Math.min(...xs) + Math.max(...xs)) / 2) * k, oy = 115 - ((Math.min(...ys) + Math.max(...ys)) / 2) * k;
  const P = (p) => [ox + p[0] * k, oy + p[1] * k];
  const cw = Math.max(reglages(reg).cordon, 1);
  const f = (v) => v.toFixed(1);
  let glue = "", mem = "", hit = "", txt = "";
  b.segs.forEach((s, i) => {
    const a = P(pts[i]), c = P(pts[i + 1]), d = dir(s.dir), l = nombre(s.len) || 0;
    mem += `<polyline class="mem" points="${f(a[0])},${f(a[1])} ${f(c[0])},${f(c[1])}"/>`;
    if (s.on && l > 0) {
      const [t0, t1] = positionCordon(i, b.segs.length, l, cw);
      const g0 = [a[0] + (c[0] - a[0]) * t0, a[1] + (c[1] - a[1]) * t0], g1 = [a[0] + (c[0] - a[0]) * t1, a[1] + (c[1] - a[1]) * t1];
      glue += `<polyline class="glue" points="${f(g0[0])},${f(g0[1])} ${f(g1[0])},${f(g1[1])}"/>`;
    }
    hit += `<polyline class="hit" data-i="${i}" points="${f(a[0])},${f(a[1])} ${f(c[0])},${f(c[1])}"><title>Tronçon ${i + 1} : ${s.on ? "collé" : "libre"}</title></polyline>`;
    const mx = (a[0] + c[0]) / 2 - d.y * 24, my = (a[1] + c[1]) / 2 + d.x * 24 + 5;
    txt += `<text x="${f(mx)}" y="${f(my)}">${esc(fmt(l, 0))}</text>`;
  });
  const p0 = P(pts[0]);
  $("dessin").innerHTML = `<svg viewBox="0 0 600 230" aria-hidden="true">${glue}${mem}<circle class="dep" cx="${f(p0[0])}" cy="${f(p0[1])}" r="5"/>${txt}${hit}</svg>`;
}
$("dessin").addEventListener("click", (e) => {
  const el = e.target.closest(".hit"); if (!el) return;
  const i = Number(el.dataset.i); b.segs[i].on = !b.segs[i].on; lignesTroncons(); maj();
});

// ---------- Resultat de la bande ----------
const pluriel = (n, un, plus) => (n > 1 ? plus : un);
function maj() {
  for (const k of ["facade", "etage", "plan", "longueur"]) if ($(k).value !== b[k]) $(k).value = b[k];
  for (const k of Object.keys(REGLAGES_DEFAUT)) if ($(k).value !== reg[k]) $(k).value = reg[k];
  const cartNum = reglages(reg).cartouche;
  $("cartSeg").querySelectorAll("button").forEach((x) => { const on = Math.abs(Number(x.dataset.m) - cartNum) < 1e-9; x.classList.toggle("on", on); x.setAttribute("aria-pressed", String(on)); });
  $("produit").value = b.produit;
  $("mesure").querySelectorAll("button").forEach((x) => { const on = (x.dataset.k === "mes") === b.mesure; x.classList.toggle("on", on); x.setAttribute("aria-checked", String(on)); });
  dessiner();
  const r = calculBande(b, reg);
  const g = reglages(reg);
  const p = PRODUITS[b.produit];
  if (!r || !r.roll) {
    $("rCart").textContent = "—"; $("rRoul").textContent = "—";
    $("rCartL").textContent = "cartouches de colle"; $("rRoulL").textContent = "rouleau";
    $("rWhy").textContent = r ? "Dessine au moins un tronçon avec une largeur." : "Indique la longueur de la bande.";
    $("rAlertes").innerHTML = ""; $("ajouter").disabled = true;
    sauver(); return;
  }
  const cart = r.cartouches, roul = r.rouleaux;
  $("rCart").textContent = String(cart); $("rCartL").textContent = pluriel(cart, "cartouche de colle", "cartouches de colle");
  $("rRoul").textContent = String(roul); $("rRoulL").textContent = `${pluriel(roul, "rouleau", "rouleaux")} de ${r.roll.largeur} mm${r.roll.mesure ? " (sur mesure)" : r.roll.surDemande ? " (sur demande)" : ""}`;
  $("rWhy").textContent = `Bande dépliée : ${fmt(r.dev, 0)} mm, donc ${r.roll.mesure ? "coupée à " : "rouleau de "}${r.roll.largeur} mm en ${p.court}. `
    + `Longueur : ${fmt(r.run, 2)} m${g.marge ? ` + marge ${fmt(g.marge * 100, 0)} %` : ""}${g.recouvrement ? ` + recouvrement ${fmt(g.recouvrement * 100, 0)} cm` : ""} = ${fmt(r.longueur, 2)} m. `
    + `Colle : ${r.nCollés} cordon${pluriel(r.nCollés, "", "s")} × ${fmt(r.longueur, 2)} m = ${fmt(r.cordonM, 1)} m, à ${fmt(g.cartouche, g.cartouche % 1 ? 1 : 0)} m par cartouche de ${COLLE.ml} ml.`;
  $("rAlertes").innerHTML = r.alertes.map((a) => `<p>${esc(a)}</p>`).join("");
  $("ajouter").disabled = false;
  $("ajouter").textContent = edition ? "Mettre à jour la ligne" : "Ajouter à la commande";
  $("annuler").classList.toggle("hidden", !edition);
  sauver();
}

// ---------- La commande ----------
const nomProduit = (l, r) => `${PRODUITS[l.produit].court} ${r.roll.largeur} mm${r.roll.mesure ? " (sur mesure)" : ""}`;
const deuxPoints = (n) => fmt(n, 1);
function afficherCommande() {
  $("cmd").classList.toggle("hidden", !lignes.length);
  if (!lignes.length) return;
  const c = commande(lignes, reg);
  $("cmdLignes").innerHTML = c.facades.map((g) => `<div class="fh">${g.facade ? "Façade " + esc(g.facade) : "Sans façade"}</div>
    <div class="tscroll"><table class="tbl"><thead><tr><th>Étage</th><th>Plan</th><th>Membrane</th><th class="num">Longueur</th><th class="num">Colle</th><th></th></tr></thead><tbody>${
      g.lignes.map(({ ligne: l, r }) => `<tr${edition === l.id ? ' class="edit"' : ""}><td>${esc(l.etage) || "—"}</td><td>${esc(l.plan) || "—"}</td><td>${esc(nomProduit(l, r))}</td><td class="num">${deuxPoints(r.run)} m</td><td class="num">${r.nCollés} × ${fmt(r.longueur, 2)} m</td><td class="act"><button type="button" data-a="edit" data-id="${l.id}">Modifier</button><button type="button" data-a="del" data-id="${l.id}">Supprimer</button></td></tr>`).join("")}</tbody></table></div>`).join("");
  $("cmdTotal").innerHTML = `<div class="tscroll"><table class="tbl"><thead><tr><th>Article</th><th class="num">Quantité</th><th>Détail</th></tr></thead><tbody>${
    c.articles.map((a) => `<tr><td>${esc(PRODUITS[a.produit].nom)}, ${a.largeur} mm${a.mesure ? " (sur mesure)" : a.surDemande ? " (sur demande)" : ""}, rouleau de ${ROULEAU_M} m</td><td class="num"><b>${a.rouleaux}</b></td><td>${deuxPoints(a.net)} m de bande${a.recouvrement > 1e-9 ? ` + ${fmt(a.recouvrement, 2)} m de recouvrement` : ""} ; chutes : ${deuxPoints(a.chutes)} m</td></tr>`).join("")
  }<tr><td>${esc(COLLE.nom)}, ${COLLE.ml} ml</td><td class="num"><b>${c.cartouches}</b></td><td>${deuxPoints(c.cordonM)} m de cordon, à ${fmt(c.reglages.cartouche, c.reglages.cartouche % 1 ? 1 : 0)} m par cartouche (${c.cartons} carton${pluriel(c.cartons, "", "s")} de ${COLLE.parCarton})</td></tr></tbody></table></div>`;
}
$("ajouter").addEventListener("click", () => {
  const r = calculBande(b); if (!r || !r.roll) return;
  const copie = nettoyer(JSON.parse(JSON.stringify(b)));
  if (edition) { copie.id = edition; const i = lignes.findIndex((l) => l.id === edition); if (i >= 0) lignes[i] = copie; else lignes.push(copie); toast("Ligne mise à jour"); }
  else { copie.id = `l${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`; lignes.push(copie); toast("Ajouté à la commande"); }
  edition = null;
  // On garde la facade et l'etage : les bandes suivantes partagent souvent l'un des deux
  const garde = { facade: b.facade, etage: b.etage, produit: b.produit };
  b = { ...NEUF(), ...garde };
  lignesTroncons(); maj(); afficherCommande();
});
$("annuler").addEventListener("click", () => { edition = null; b = NEUF(); lignesTroncons(); maj(); afficherCommande(); });
$("cmdLignes").addEventListener("click", (e) => {
  const x = e.target.closest("button[data-a]"); if (!x) return;
  const i = lignes.findIndex((l) => l.id === x.dataset.id); if (i < 0) return;
  if (x.dataset.a === "del") { lignes.splice(i, 1); if (edition === x.dataset.id) edition = null; sauver(); afficherCommande(); maj(); return; }
  edition = lignes[i].id; b = nettoyer(JSON.parse(JSON.stringify(lignes[i]))); b.id = edition;
  lignesTroncons(); maj(); afficherCommande(); window.scrollTo({ top: 0, behavior: "smooth" });
});
let videArme = false;
$("viderBtn").addEventListener("click", () => {
  if (!videArme) { videArme = true; $("viderBtn").textContent = "Sûr ? Clique encore pour tout effacer"; setTimeout(() => { videArme = false; $("viderBtn").textContent = "Vider la commande"; }, 4000); return; }
  videArme = false; $("viderBtn").textContent = "Vider la commande"; lignes = []; edition = null; sauver(); afficherCommande(); maj();
});

// ---------- Exports : Excel, mail, PDF ----------
function tableauTexte() {
  const c = commande(lignes, reg);
  const l = [["Façade", "Étage", "Plan", "Produit", "Largeur (mm)", "Longueur (m)", "Avec marge et recouvrement (m)", "Tronçons collés", "Cordon (m)"].join("\t")];
  for (const g of c.facades) for (const { ligne, r } of g.lignes) l.push([g.facade, ligne.etage, ligne.plan, PRODUITS[ligne.produit].nom, r.roll.largeur, fmt(r.run, 1), fmt(r.longueur, 2), r.nCollés, fmt(r.cordonM, 1)].join("\t"));
  l.push("");
  for (const a of c.articles) l.push([`${PRODUITS[a.produit].nom} ${a.largeur} mm${a.mesure ? " (sur mesure)" : ""}`, `${a.rouleaux} rouleau(x) de ${ROULEAU_M} m`].join("\t"));
  l.push([`${COLLE.nom} ${COLLE.ml} ml`, `${c.cartouches} cartouche(s)`].join("\t"));
  return l.join("\n");
}
$("xlsBtn").addEventListener("click", async () => {
  if (!lignes.length) return;
  const t = tableauTexte();
  try { await navigator.clipboard.writeText(t); toast("Copié : colle-le dans Excel"); }
  catch (e) { const ta = document.createElement("textarea"); ta.value = t; document.body.append(ta); ta.select(); try { document.execCommand("copy"); toast("Copié : colle-le dans Excel"); } catch (e2) { toast("Copie impossible"); } ta.remove(); }
});
$("mailBtn").addEventListener("click", () => {
  if (!lignes.length) return;
  const c = commande(lignes, reg);
  const corps = ["Bonjour,", "", "Commande de membranes d'étanchéité :", "",
    ...c.articles.map((a) => `- ${a.rouleaux} × ${PRODUITS[a.produit].nom}, ${a.largeur} mm${a.mesure ? " (coupée sur mesure)" : ""}, rouleau de ${ROULEAU_M} m`),
    `- ${c.cartouches} × ${COLLE.nom}, ${COLLE.ml} ml`, "", "Merci d'avance."].join("\n");
  location.href = `mailto:?subject=${encodeURIComponent("Commande membranes d'étanchéité")}&body=${encodeURIComponent(corps)}`;
});

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const el = document.createElement("script");
    el.src = src; el.onload = resolve; el.onerror = () => reject(new Error(src));
    document.head.appendChild(el);
  });
}
const pdfFonts = {};
async function chargerPdf() {
  if (!window.jspdf) await loadScript("vendor/jspdf.umd.min.js");
  if (!window.jspdf.jsPDF.API.autoTable) await loadScript("vendor/jspdf.plugin.autotable.min.js");
  for (const [file, style] of [["IBMPlexSans-Regular.ttf", "normal"], ["IBMPlexSans-SemiBold.ttf", "bold"]]) {
    if (pdfFonts[style]) continue;
    const r = await fetch("vendor/fonts/" + file); if (!r.ok) throw new Error(file);
    const bytes = new Uint8Array(await r.arrayBuffer()); let bin = "";
    for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode(...bytes.subarray(i, i + 8192));
    pdfFonts[style] = { file, data: btoa(bin) };
  }
}
const pdfText = (s) => String(s ?? "").replace(/[   ]/g, " ").replace(/→/g, "->").replace(/×/g, "x");
const aujourdhui = () => new Date().toISOString().slice(0, 10);

async function exportPdf() {
  try { await chargerPdf(); } catch (e) { toast("PDF indisponible ici"); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  for (const st of ["normal", "bold"]) { doc.addFileToVFS(pdfFonts[st].file, pdfFonts[st].data); doc.addFont(pdfFonts[st].file, "PlexSans", st); }
  doc.setFont("PlexSans", "normal");
  const M = 14, INK = [31, 32, 38], GREY = [112, 115, 124], LINE = [222, 222, 218], ACC = [180, 83, 9];
  const c = commande(lignes, reg);
  doc.setFillColor(...ACC).rect(M, 11.2, 4.5, 4.2, "F");
  doc.setDrawColor(...INK).setLineWidth(0.6).line(M + 4.5, 15.4, M + 9, 15.4).line(M + 9, 15.4, M + 12, 11.2);
  doc.setFont("PlexSans", "bold").setFontSize(13).setTextColor(...INK).text("Membrane", M + 15, 15);
  doc.setFont("PlexSans", "normal").setFontSize(7).setTextColor(...GREY).text(`BON DE COMMANDE · ${new Date().toLocaleDateString("fr-CH")}`, 210 - M, 15, { align: "right", charSpace: 0.3 });
  doc.setDrawColor(...INK).setLineWidth(0.4).line(M, 18.5, 210 - M, 18.5);
  let y = 26;
  const titre = (t) => { if (y > 255) { doc.addPage(); y = 18; } doc.setFont("PlexSans", "bold").setFontSize(12.5).setTextColor(...INK).text(pdfText(t), M, y); doc.setDrawColor(...INK).setLineWidth(0.3).line(M, y + 1.8, 210 - M, y + 1.8); y += 6; };
  const style = { font: "PlexSans", fontSize: 9, textColor: INK, cellPadding: { top: 1.6, bottom: 1.6, left: 1.5, right: 1.5 }, lineColor: LINE, lineWidth: { bottom: 0.2 }, overflow: "linebreak" };
  const head = { fillColor: false, textColor: GREY, fontStyle: "normal", fontSize: 7.5, lineColor: INK, lineWidth: { bottom: 0.3 } };
  titre("À commander");
  doc.autoTable({
    startY: y, margin: { left: M, right: M, bottom: 16 }, theme: "plain", styles: style, headStyles: head,
    head: [["Article", "Quantité", "Détail"]],
    body: [
      ...c.articles.map((a) => [`${PRODUITS[a.produit].nom}, ${a.largeur} mm${a.mesure ? " (sur mesure)" : a.surDemande ? " (sur demande)" : ""}, rouleau de ${ROULEAU_M} m`, String(a.rouleaux), `${deuxPoints(a.net)} m de bande${a.recouvrement > 1e-9 ? ` + ${fmt(a.recouvrement, 2)} m de recouvrement` : ""} ; chutes : ${deuxPoints(a.chutes)} m`]),
      [`${COLLE.nom}, ${COLLE.ml} ml`, String(c.cartouches), `${deuxPoints(c.cordonM)} m de cordon (${c.cartons} carton${pluriel(c.cartons, "", "s")} de ${COLLE.parCarton})`],
    ].map((row) => row.map(pdfText)),
    columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
  });
  y = doc.lastAutoTable.finalY + 8;
  titre("Détail par façade et par étage");
  for (const g of c.facades) {
    if (y > 250) { doc.addPage(); y = 18; }
    doc.setFont("PlexSans", "bold").setFontSize(10.5).setTextColor(...INK).text(pdfText(g.facade ? `Façade ${g.facade}` : "Sans façade"), M, y); y += 2;
    doc.autoTable({
      startY: y, margin: { left: M, right: M, bottom: 16 }, theme: "plain", styles: style, headStyles: head,
      head: [["Étage", "Plan", "Membrane", "Longueur", "Colle"]],
      body: g.lignes.map(({ ligne: l, r }) => [l.etage || "-", l.plan || "-", nomProduit(l, r), `${deuxPoints(r.run)} m`, `${r.nCollés} cordon${pluriel(r.nCollés, "", "s")} x ${fmt(r.longueur, 2)} m`].map(pdfText)),
      columnStyles: { 3: { halign: "right" }, 4: { halign: "right" } },
    });
    y = doc.lastAutoTable.finalY + 6;
  }
  if (y > 262) { doc.addPage(); y = 18; }
  doc.setFont("PlexSans", "normal").setFontSize(8).setTextColor(...GREY);
  doc.splitTextToSize(pdfText(`Hypotheses : 1 cartouche de ${COLLE.ml} ml couvre ${fmt(c.reglages.cartouche, c.reglages.cartouche % 1 ? 1 : 0)} m ; marge ${fmt(c.reglages.marge * 100, 0)} % ; recouvrement entre pieces ${fmt(c.reglages.recouvrement * 100, 0)} cm ; rouleaux de ${ROULEAU_M} m, pieces rangees dans les rouleaux (chutes comptees).`), 210 - 2 * M).forEach((t, i) => doc.text(t, M, y + i * 3.6));
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i); doc.setFont("PlexSans", "normal").setFontSize(7.5).setTextColor(...GREY);
    doc.setDrawColor(...LINE).setLineWidth(0.2).line(M, 297 - 12, 210 - M, 297 - 12);
    doc.text(`Membrane · ${new Date().toLocaleDateString("fr-CH")}`, M, 297 - 8);
    doc.text(`Page ${i} / ${n}`, 210 - M, 297 - 8, { align: "right" });
  }
  doc.save(`Commande membranes - ${aujourdhui()}.pdf`);
  toast("PDF téléchargé");
}
$("pdfBtn").addEventListener("click", () => { if (lignes.length) exportPdf(); });
$("aboutBtn").addEventListener("click", () => toast("Membrane v1.1 · conçu et développé par Hugo N."));

// ---------- Demarrage ----------
lignesTroncons(); maj(); afficherCommande();
