// Membrane : affichage et saisie. Les calculs sont dans core.js.
import { PRODUITS, DIRS, colles, colleChoisie, produitsMembrane, libelleItem, REGLAGES_DEFAUT, dir, nombre, fmt, calculBande, commande, positionCordon, reglages, chargerCatalogue, libelleProduit, nettoyerProduit, mergeShared, sharedStatus, stable, produitsEnListe, chargerListe } from "./core.js";

const $ = (id) => document.getElementById(id);
const CLE = "membrane.v1";
const APPLIS = [
  ["Access", "Annuaire fournisseurs", "#C2255C"], ["Check", "Notes & tâches", "#4338CA"], ["Format", "Débit de panneaux", "#FF4D00"],
  ["Index", "Fiches techniques", "#6D4AFF"], ["Joint", "Dilatation et joints", "#0B7285"], ["Linear", "Mise en barre", "#2B50FF"],
  ["Masse", "Poids des éléments", "#9A4A3A"], ["Membrane", "Étanchéité", "#B45309"], ["Strate", "Épaisseurs d'isolation", "#D4A20B"], ["Trame", "Répartition de perçages", "#0E9F6E"],
];
const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// ---------- Bibliotheque de produits (gardee dans le navigateur) ----------
const CLE_PROD = "membrane.produits";
try { chargerCatalogue(JSON.parse(localStorage.getItem(CLE_PROD) ?? "null")); } catch (e) { /* stockage bloque : produits d'origine */ }
const sauverCatalogue = () => { try { localStorage.setItem(CLE_PROD, JSON.stringify(PRODUITS)); } catch (e) { /* ignore */ } };
const premierProduit = () => produitsMembrane()[0]?.id;

// ---------- Etat : la bande en cours + la commande (gardes dans le navigateur) ----------
const NEUF = () => ({
  facade: "", etage: "", plan: "", produit: PRODUITS.outplus ? "outplus" : premierProduit(), mesure: false, longueur: "12",
  segs: [{ len: "100", dir: "E", on: true }, { len: "40", dir: "SE", on: false }, { len: "80", dir: "E", on: true }],
});
let b = NEUF();       // bande en cours de dessin
let lignes = [];      // la commande
let edition = null;   // id de la ligne en cours de modification
let reg = { ...REGLAGES_DEFAUT, colle: "" }; // reglages de la commande (colle choisie, marge, recouvrement)
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

// ---------- Menus de choix maison (comme dans Joint) ----------
const CHEV = '<svg class="chev" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function selDef(cle) {
  if (cle === "produit") return { cur: b.produit, set: (k) => { b.produit = k; }, opts: () => produitsMembrane().map((p) => ({ k: p.id, nom: p.nom, meta: p.role || p.fournisseur })) };
  if (cle === "colle") return {
    cur: colleChoisie(reg).id,
    // Changer de colle remet sa couverture et son cordon habituels
    set: (k) => { const c = colles().find((x) => x.id === k); if (!c) return; reg.colle = k; reg.cordon = String(c.cordonMm).replace(".", ","); reg.cartouche = String(c.metres).replace(".", ","); },
    opts: () => colles().map((c) => ({ k: c.id, nom: c.nom, meta: c.fournisseur })),
  };
  const i = Number(cle.slice(4));
  return { cur: b.segs[i]?.dir, set: (k) => { b.segs[i].dir = k; }, opts: () => DIRS.map((d) => ({ k: d.id, nom: `${d.fleche} ${d.nom}`, meta: "" })) };
}
const selTexte = (cle) => { const d = selDef(cle), o = d.opts().find((x) => x.k === d.cur) ?? d.opts()[0]; return o?.nom ?? ""; };
const selHtml = (cle, label) => `<div class="sel" data-sel="${cle}"><button type="button" class="sel-btn" aria-haspopup="listbox" aria-expanded="false" aria-label="${esc(label)}"><span class="sel-t">${esc(selTexte(cle))}</span>${CHEV}</button><div class="sel-pop hidden" role="listbox" aria-label="${esc(label)}"></div></div>`;
function majSelects() { document.querySelectorAll(".sel[data-sel]").forEach((box) => { box.querySelector(".sel-t").textContent = selTexte(box.dataset.sel); }); }
function fermerMenus(sauf) {
  document.querySelectorAll(".sel-pop").forEach((pop) => {
    if (pop.parentElement === sauf) return;
    pop.classList.add("hidden"); pop.parentElement.querySelector(".sel-btn").setAttribute("aria-expanded", "false");
  });
}
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".sel-btn"), choix = e.target.closest(".sel-pop button[data-k]");
  if (btn) {
    const box = btn.parentElement, pop = box.querySelector(".sel-pop"), ouvrir = pop.classList.contains("hidden");
    fermerMenus(ouvrir ? box : null);
    if (ouvrir) {
      const d = selDef(box.dataset.sel);
      pop.innerHTML = d.opts().map((o) => `<button type="button" role="option" data-k="${esc(o.k)}" aria-selected="${o.k === d.cur}">${esc(o.nom)}${o.meta ? `<span class="m">${esc(o.meta)}</span>` : ""}</button>`).join("");
    }
    pop.classList.toggle("hidden", !ouvrir); btn.setAttribute("aria-expanded", String(ouvrir));
    if (ouvrir) (pop.querySelector('[aria-selected="true"]') ?? pop.querySelector("button"))?.focus();
  } else if (choix) {
    const box = choix.closest(".sel"); selDef(box.dataset.sel).set(choix.dataset.k);
    fermerMenus(null); box.querySelector(".sel-btn").focus(); maj();
    if (box.dataset.sel === "colle") { afficherBiblio(); afficherCommande(); }
  } else if (!e.target.closest(".sel")) fermerMenus(null);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") fermerMenus(null);
  const pop = e.target.closest?.(".sel-pop");
  if (pop && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
    e.preventDefault();
    const bs = [...pop.querySelectorAll("button")], i = bs.indexOf(document.activeElement);
    bs[(i + (e.key === "ArrowDown" ? 1 : -1) + bs.length) % bs.length].focus();
  }
});

// ---------- Champs simples ----------
for (const k of ["facade", "etage", "plan", "longueur"]) $(k).addEventListener("input", () => { b[k] = $(k).value; maj(); });
for (const k of Object.keys(REGLAGES_DEFAUT)) $(k).addEventListener("input", () => { reg[k] = $(k).value; maj(); afficherCommande(); });
$("cartSeg").addEventListener("click", (e) => { const x = e.target.closest("button[data-m]"); if (x) { reg.cartouche = x.dataset.m.replace(".", ","); maj(); afficherCommande(); } });
$("mesure").innerHTML = `<button type="button" role="radio" data-k="std">Standard</button><button type="button" role="radio" data-k="mes">Coupée sur mesure</button>`;
$("mesure").addEventListener("click", (e) => { const x = e.target.closest("button[data-k]"); if (x) { b.mesure = x.dataset.k === "mes"; maj(); } });

// ---------- Troncons ----------
function lignesTroncons() {
  $("segs").innerHTML = b.segs.map((s, i) => `<div class="row" data-i="${i}">
    <span class="n">${i + 1}</span>
    <span class="withu"><input data-f="len" inputmode="decimal" autocomplete="off" aria-label="Largeur du tronçon ${i + 1} en mm" value="${esc(s.len)}"><em>mm</em></span>
    ${selHtml(`dir:${i}`, `Direction du tronçon ${i + 1}`)}
    <button type="button" class="tg${s.on ? " on" : ""}" data-f="on" aria-pressed="${s.on}">${s.on ? "Collé" : "Libre"}</button>
    <button type="button" class="x" data-f="del" aria-label="Supprimer le tronçon ${i + 1}">×</button></div>`).join("");
}
$("segs").addEventListener("input", (e) => {
  const row = e.target.closest(".row"); if (!row) return;
  const s = b.segs[Number(row.dataset.i)];
  if (e.target.dataset.f === "len") s.len = e.target.value;
  maj();
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
    if (s.on && l > 0 && !PRODUITS[b.produit]?.autocollant) {
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
  const cartNum = reglages(reg).cartouche, cl = reglages(reg).colle;
  { const choix = cl.metresMin ? [[cl.metres, "courant"], [cl.metresMin, "défavorable"]] : [[cl.metres, "courant"]];
    const html = choix.map(([m, t]) => `<button type="button" data-m="${m}">${fmt(m, m % 1 ? 1 : 0)} m<br><small>${t}</small></button>`).join("");
    if ($("cartSeg").dataset.h !== html) { $("cartSeg").innerHTML = html; $("cartSeg").dataset.h = html; $("cartSeg").classList.toggle("deux", choix.length > 1); } }
  $("cartSeg").querySelectorAll("button").forEach((x) => { const on = Math.abs(Number(x.dataset.m) - cartNum) < 1e-9; x.classList.toggle("on", on); x.setAttribute("aria-pressed", String(on)); });
  if (!PRODUITS[b.produit] || PRODUITS[b.produit].type === "colle") b.produit = premierProduit();
  majSelects();
  { const pr = PRODUITS[b.produit] ?? {}, bouts = [];
    if (pr.sd) bouts.push(`<span class="hint-sd" title="Résistance à la diffusion de vapeur d'eau : plus c'est haut, plus la membrane freine la vapeur">sd ≈ ${fmt(pr.sd, pr.sd % 1 ? 1 : 0)} m</span>`);
    if (pr.autocollant) bouts.push("autocollante : pas de colle");
    if (pr.indexFiche) bouts.push(ficheLien(pr.indexFiche));
    $("produitFiche").innerHTML = bouts.join(" · "); }
  $("mesure").querySelectorAll("button").forEach((x) => { const on = (x.dataset.k === "mes") === b.mesure; x.classList.toggle("on", on); x.setAttribute("aria-checked", String(on)); });
  dessiner();
  const r = calculBande(b, reg);
  const g = reglages(reg);
  const p = PRODUITS[b.produit] ?? {};
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
    + (r.auto ? "Membrane autocollante : pas de colle à prévoir." : `Colle : ${r.nCollés} cordon${pluriel(r.nCollés, "", "s")} × ${fmt(r.longueur, 2)} m = ${fmt(r.cordonM, 1)} m, à ${fmt(g.cartouche, g.cartouche % 1 ? 1 : 0)} m par cartouche de ${g.colle.ml} ml.`);
  $("rAlertes").innerHTML = r.alertes.map((a) => `<p>${esc(a)}</p>`).join("");
  $("ajouter").disabled = false;
  $("ajouter").textContent = edition ? "Mettre à jour la ligne" : "Ajouter à la commande";
  $("annuler").classList.toggle("hidden", !edition);
  sauver();
}

// ---------- La commande ----------
const nomProduit = (l, r) => `${PRODUITS[l.produit]?.court ?? "?"} ${r.roll.largeur} mm${r.roll.mesure ? " (sur mesure)" : ""}`;
const deuxPoints = (n) => fmt(n, 1);
function afficherCommande() {
  $("cmdPlein").classList.toggle("hidden", !lignes.length); $("cmdVide").classList.toggle("hidden", !!lignes.length);
  if (!lignes.length) return;
  const c = commande(lignes, reg);
  $("cmdLignes").innerHTML = c.facades.map((g) => `<div class="fh">${g.facade ? "Façade " + esc(g.facade) : "Sans façade"}</div>
    <div class="tscroll"><table class="tbl"><thead><tr><th>Étage</th><th>Plan</th><th>Membrane</th><th class="num">Longueur</th><th class="num">Colle</th><th></th></tr></thead><tbody>${
      g.lignes.map(({ ligne: l, r }) => `<tr${edition === l.id ? ' class="edit"' : ""}><td>${esc(l.etage) || "—"}</td><td>${esc(l.plan) || "—"}</td><td>${esc(nomProduit(l, r))}</td><td class="num">${deuxPoints(r.run)} m</td><td class="num">${r.auto ? "autocollante" : `${r.nCollés} × ${fmt(r.longueur, 2)} m`}</td><td class="act"><button type="button" data-a="edit" data-id="${l.id}">Modifier</button><button type="button" data-a="del" data-id="${l.id}">Supprimer</button></td></tr>`).join("")}</tbody></table></div>`).join("");
  $("cmdTotal").innerHTML = `<div class="tscroll"><table class="tbl"><thead><tr><th>Article</th><th class="num">Quantité</th><th>Détail</th></tr></thead><tbody>${
    c.articles.map((a) => `<tr><td>${esc(libelleProduit(a.produit))}, ${a.largeur} mm${a.mesure ? " (sur mesure)" : a.surDemande ? " (sur demande)" : ""}, rouleau de ${fmt(a.rouleauM, a.rouleauM % 1 ? 1 : 0)} m</td><td class="num"><b>${a.rouleaux}</b></td><td>${deuxPoints(a.net)} m de bande${a.recouvrement > 1e-9 ? ` + ${fmt(a.recouvrement, 2)} m de recouvrement` : ""} ; chutes : ${deuxPoints(a.chutes)} m</td></tr>`).join("")
  }${c.cartouches ? `<tr><td>${esc(libelleItem(c.colle))}, ${c.colle.ml} ml</td><td class="num"><b>${c.cartouches}</b></td><td>${deuxPoints(c.cordonM)} m de cordon, à ${fmt(c.reglages.cartouche, c.reglages.cartouche % 1 ? 1 : 0)} m par cartouche (${c.cartons} carton${pluriel(c.cartons, "", "s")} de ${c.colle.parCarton})</td></tr>` : ""}</tbody></table></div>`;
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
  for (const g of c.facades) for (const { ligne, r } of g.lignes) l.push([g.facade, ligne.etage, ligne.plan, libelleProduit(ligne.produit), r.roll.largeur, fmt(r.run, 1), fmt(r.longueur, 2), r.nCollés, fmt(r.cordonM, 1)].join("\t"));
  l.push("");
  for (const a of c.articles) l.push([`${libelleProduit(a.produit)} ${a.largeur} mm${a.mesure ? " (sur mesure)" : ""}`, `${a.rouleaux} rouleau(x) de ${fmt(a.rouleauM, a.rouleauM % 1 ? 1 : 0)} m`].join("\t"));
  l.push([`${libelleItem(c.colle)} ${c.colle.ml} ml`, `${c.cartouches} cartouche(s)`].join("\t"));
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
    ...c.articles.map((a) => `- ${a.rouleaux} × ${libelleProduit(a.produit)}, ${a.largeur} mm${a.mesure ? " (coupée sur mesure)" : ""}, rouleau de ${fmt(a.rouleauM, a.rouleauM % 1 ? 1 : 0)} m`),
    `- ${c.cartouches} × ${libelleItem(c.colle)}, ${c.colle.ml} ml`, "", "Merci d'avance."].join("\n");
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
  // Logo = celui de l'appli (bande pliee + cordon de colle), echelle 0,4 mm par unite
  { const k = 0.4, x0 = M, y0 = 9.2, X = (v) => x0 + v * k, Y = (v) => y0 + v * k;
    doc.setDrawColor(...INK).setLineWidth(2.2 * k).setLineCap("round").setLineJoin("round");
    doc.lines([[9 * k, 0], [8 * k, -12 * k]], X(2), Y(17), [1, 1], "S", false);
    doc.setFillColor(...ACC).rect(X(2.5), Y(14.5), 5 * k, 5 * k, "F"); doc.setLineCap("butt"); }
  doc.setFont("PlexSans", "bold").setFontSize(13).setTextColor(...INK).text("Membrane", M + 12, 15);
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
      ...c.articles.map((a) => [`${libelleProduit(a.produit)}, ${a.largeur} mm${a.mesure ? " (sur mesure)" : a.surDemande ? " (sur demande)" : ""}, rouleau de ${fmt(a.rouleauM, a.rouleauM % 1 ? 1 : 0)} m`, String(a.rouleaux), `${deuxPoints(a.net)} m de bande${a.recouvrement > 1e-9 ? ` + ${fmt(a.recouvrement, 2)} m de recouvrement` : ""}, chutes ${deuxPoints(a.chutes)} m`]),
      ...(c.cartouches ? [[`${libelleItem(c.colle)}, ${c.colle.ml} ml`, String(c.cartouches), `${deuxPoints(c.cordonM)} m de cordon (${c.cartons} carton${pluriel(c.cartons, "", "s")} de ${c.colle.parCarton})`]] : []),
    ].map((row) => row.map(pdfText)),
    columnStyles: { 0: { cellWidth: "wrap" }, 1: { halign: "right", fontStyle: "bold", cellWidth: "wrap" }, 2: { fontSize: 8.5 } },
    didParseCell: (d) => { if (d.section === "body" && d.column.index < 2) d.cell.styles.overflow = "visible"; },
  });
  y = doc.lastAutoTable.finalY + 8;
  titre("Détail par façade et par étage");
  for (const g of c.facades) {
    if (y > 250) { doc.addPage(); y = 18; }
    doc.setFont("PlexSans", "bold").setFontSize(10.5).setTextColor(...INK).text(pdfText(g.facade ? `Façade ${g.facade}` : "Sans façade"), M, y); y += 2;
    doc.autoTable({
      startY: y, margin: { left: M, right: M, bottom: 16 }, theme: "plain", styles: style, headStyles: head,
      head: [["Étage", "Plan", "Membrane", "Longueur", "Colle"]],
      body: g.lignes.map(({ ligne: l, r }) => [l.etage || "-", l.plan || "-", nomProduit(l, r), `${deuxPoints(r.run)} m`, r.auto ? "autocollante" : `${r.nCollés} cordon${pluriel(r.nCollés, "", "s")} x ${fmt(r.longueur, 2)} m`].map(pdfText)),
      columnStyles: { 3: { halign: "right" }, 4: { halign: "right" } },
    });
    y = doc.lastAutoTable.finalY + 6;
  }
  if (y > 262) { doc.addPage(); y = 18; }
  doc.setFont("PlexSans", "normal").setFontSize(8).setTextColor(...GREY);
  doc.splitTextToSize(pdfText(`Hypotheses : 1 cartouche de ${c.colle.ml} ml couvre ${fmt(c.reglages.cartouche, c.reglages.cartouche % 1 ? 1 : 0)} m ; marge ${fmt(c.reglages.marge * 100, 0)} % ; recouvrement entre pieces ${fmt(c.reglages.recouvrement * 100, 0)} cm ; rouleaux de 25 m (ou la longueur de la bibliotheque), pieces rangees dans les rouleaux (chutes comptees).`), 210 - 2 * M).forEach((t, i) => doc.text(t, M, y + i * 3.6));
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
$("aboutBtn").addEventListener("click", () => $("dApropos").showModal());
$("daFermer").addEventListener("click", () => $("dApropos").close());
$("dApropos").addEventListener("click", (e) => { if (e.target === $("dApropos")) $("dApropos").close(); });

// ---------- Catalogue commun a l'equipe (base d'Index) : compte, lecture, envoi, retrait ----------
// Lecture libre ; envoi et retrait : compte Index valide (meme connexion que les autres applis, meme site).
// Sans reseau, Membrane continue avec la copie de ce poste. La fusion est dans core.js (testee).
const SB_URL = "https://ngfzwfbraqkdcocdcmib.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nZnp3ZmJyYXFrZGNvY2RjbWliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2Mzg2NTcsImV4cCI6MjA5NTIxNDY1N30.Ikovcm4eWkLvPO_PvkI8C8DJebBT011Rz87k_EYFdbU";
const SESSION_KEY = "sb-ngfzwfbraqkdcocdcmib-auth-token";
const INDEX_URL = "https://outils-hn.github.io/Index";
const CLE_BASE = "membrane.base";
const partage = { etat: "sync", at: null };
let base = {};
try { base = JSON.parse(localStorage.getItem(CLE_BASE)) ?? {}; } catch (e) { base = {}; }
const sauverBase = () => { try { localStorage.setItem(CLE_BASE, JSON.stringify(base)); } catch (e) { /* ignore */ } };
let distant = {}; // derniere version recue de l'equipe, par id (pour « annuler mes modifications »)

const lireSession = () => { try { const s = JSON.parse(localStorage.getItem(SESSION_KEY)); return s && s.access_token ? s : null; } catch (e) { return null; } };
const ecrireSession = (s) => { try { if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s)); else localStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ } };
const avecExpiration = (r) => ({ ...r, expires_at: r.expires_at || Math.floor(Date.now() / 1000) + (r.expires_in || 3600) });
async function jeton() {
  const s = lireSession(); if (!s) return null;
  if ((s.expires_at || 0) > Date.now() / 1000 + 30) return s.access_token;
  try {
    const r = await fetch(SB_URL + "/auth/v1/token?grant_type=refresh_token", { method: "POST", headers: { apikey: SB_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ refresh_token: s.refresh_token }) });
    if (!r.ok) return s.access_token;
    const n = avecExpiration(await r.json()); ecrireSession(n); return n.access_token;
  } catch (e) { return s.access_token; }
}
async function seConnecter(email, mdp) {
  try {
    const r = await fetch(SB_URL + "/auth/v1/token?grant_type=password", { method: "POST", headers: { apikey: SB_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim(), password: mdp }) });
    const j = await r.json();
    if (!r.ok) {
      const m = String(j.error_description || j.msg || "");
      return /invalid login/i.test(m) ? "Email ou mot de passe incorrect." : /confirm/i.test(m) ? "Adresse email pas encore confirmée : ouvre le lien reçu par email." : (m || "Connexion impossible.");
    }
    ecrireSession(avecExpiration(j)); return null;
  } catch (e) { return "Pas de connexion au serveur."; }
}
async function sb(chemin, init = {}) {
  const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const tok = await jeton();
    return await fetch(SB_URL + chemin, { ...init, headers: { apikey: SB_KEY, "Content-Type": "application/json", Authorization: "Bearer " + (tok || SB_KEY) }, signal: ctrl.signal });
  } finally { clearTimeout(t); }
}
async function rpc(fn, args) {
  try {
    const r = await sb("/rest/v1/rpc/" + fn, { method: "POST", body: JSON.stringify(args) });
    if (!r.ok) return { ok: false, error: "Le catalogue commun ne répond pas. Réessaie plus tard." };
    return await r.json();
  } catch (e) { return { ok: false, error: "Pas de connexion au catalogue commun." }; }
}

// Etat du compte dans le bandeau
function afficherCompte() {
  const s = lireSession();
  $("etatCompte").textContent = s ? (s.user?.email || "") : "Lecture seule";
  $("etatCompte").classList.toggle("on", !!s);
  $("compteBtn").textContent = s ? "Se déconnecter" : "Se connecter";
}
function demanderConnexion() {
  if (lireSession()) return Promise.resolve(true);
  const d = $("dConnexion"), f = $("formConnexion");
  f.reset(); $("cErreur").textContent = ""; d.showModal(); $("cEmail").focus();
  return new Promise((resolve) => {
    const fin = (ok) => { d.removeEventListener("close", surFermeture); resolve(ok); };
    const surFermeture = () => fin(!!lireSession());
    d.addEventListener("close", surFermeture);
  });
}
$("formConnexion").addEventListener("submit", async (e) => {
  e.preventDefault();
  const bouton = $("cOk"); bouton.disabled = true;
  const err = !$("cEmail").value || !$("cMdp").value ? "Saisis l'email et le mot de passe." : await seConnecter($("cEmail").value, $("cMdp").value);
  bouton.disabled = false;
  if (err) { $("cErreur").textContent = err; return; }
  $("dConnexion").close(); afficherCompte(); synchroniser(); afficherBiblio();
});
$("cAnnuler").addEventListener("click", () => $("dConnexion").close());
$("compteBtn").addEventListener("click", async () => {
  if (lireSession()) { ecrireSession(null); toast("Déconnecté"); afficherCompte(); afficherBiblio(); } else { await demanderConnexion(); afficherCompte(); }
});
window.addEventListener("storage", (e) => { if (e.key === SESSION_KEY) { afficherCompte(); afficherBiblio(); } });

const idsUtilises = () => new Set([...lignes.map((l) => l.produit), colleChoisie(reg).id]);
async function synchroniser(manuel = false) {
  partage.etat = "sync"; afficherEtatPartage();
  let rows = null;
  try { const r = await sb("/rest/v1/membrane_catalogue?select=id,data,deleted_at"); if (r.ok) rows = await r.json(); } catch (e) { /* hors ligne */ }
  if (!Array.isArray(rows)) {
    partage.etat = "hors"; afficherEtatPartage();
    if (manuel) toast("Catalogue commun injoignable : Membrane continue avec la copie de ce poste");
    return;
  }
  distant = Object.fromEntries(rows.filter((r) => !r.deleted_at).map((r) => [r.id, r.data]));
  const f = mergeShared(produitsEnListe(), rows, base, idsUtilises());
  if (f.items.length) chargerListe(f.items);
  base = f.base; sauverBase(); sauverCatalogue();
  partage.etat = "ok"; partage.at = new Date();
  afficherEtatPartage(); afficherBiblio(); maj(); afficherCommande();
  if (f.updated || manuel) toast(f.updated ? `Catalogue mis à jour depuis l'équipe (${f.updated} produit${f.updated > 1 ? "s" : ""})` : "Catalogue commun à jour");
}
function afficherEtatPartage() {
  const e = partage.etat;
  $("biblioEtat").innerHTML = (e === "sync" ? "Mise à jour du catalogue commun…" : e === "hors" ? "Catalogue commun injoignable : copie de ce poste." : `Catalogue commun à jour${partage.at ? " (" + partage.at.toLocaleTimeString("fr-CH", { hour: "2-digit", minute: "2-digit" }) + ")" : ""}.`)
    + ` <button type="button" class="linkbtn" id="biblioSync">Actualiser</button>`;
}
$("biblioEtat").addEventListener("click", (e) => { if (e.target.id === "biblioSync") synchroniser(true); });
const itemAvecId = (id) => ({ ...PRODUITS[id], id });
async function envoyer(id) {
  if (!(await demanderConnexion())) return;
  const item = itemAvecId(id);
  const r = await rpc("membrane_save_item", { p: item });
  if (!r?.ok) { toast(r?.error || "Envoi impossible."); return; }
  base[id] = stable(item); distant[id] = item; sauverBase(); afficherBiblio(); toast("Envoyé à l'équipe");
}
async function retirerDuPartage(id) {
  if (!(await demanderConnexion())) return false;
  const r = await rpc("membrane_delete_item", { p_id: id });
  if (!r?.ok) { toast(r?.error || "Retrait impossible."); return false; }
  delete base[id]; delete distant[id]; sauverBase(); return true;
}
function annulerModifs(id) {
  const d = distant[id], n = nettoyerProduit(d); if (!n) { toast("Version de l'équipe indisponible : actualise le catalogue"); return; }
  chargerListe(produitsEnListe().map((x) => (x.id === id ? { ...n, id } : x)));
  sauverCatalogue(); afficherBiblio(); maj(); afficherCommande(); toast("Version de l'équipe rétablie");
}

// ---------- Lien vers la fiche technique dans Index (liste lue en lecture seule dans la base d'Index) ----------
const ficheUrl = (id) => `${INDEX_URL}/?fiche=${encodeURIComponent(id)}`;
let fichesIndex = null;
function chargerFiches() {
  fichesIndex ??= fetch(`${SB_URL}/rest/v1/products?select=id,name,supplier,category,deleted_at&order=name`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
    .then((rows) => rows.filter((r) => !r.deleted_at))
    .catch((e) => { fichesIndex = null; throw e; });
  return fichesIndex;
}
const sansAccents = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
function chercherFiches(liste, q) {
  const mots = sansAccents(q).split(/\s+/).filter(Boolean);
  return liste.filter((f) => { const h = sansAccents(`${f.name} ${f.supplier} ${f.category}`); return mots.every((m) => h.includes(m)); }).slice(0, 8);
}
const ficheLien = (f) => `<a class="fiche-link" href="${ficheUrl(f.id)}" target="_blank" rel="noopener noreferrer" title="Ouvrir la fiche technique dans Index">📄 ${esc(f.name)} <span aria-hidden="true">↗</span></a>`;

// ---------- Bibliotheque : voir les largeurs, ajouter / modifier / partager / supprimer des produits ----------
const mmListe = (l) => l.join(", ");
const lireMm = (txt) => String(txt).split(/[\s,;]+/).filter(Boolean).map((x) => nombre(x));
const ETATS = { shared: ["Partagé avec l'équipe", "ok"], modified: ["Modifié ici, pas encore envoyé", "warn"], local: ["Sur ce poste seulement", ""] };
let biblioEdit = null; // id du produit en cours de modification ("" = nouveau)
let ficheForm = null, fichePicking = false; // fiche Index choisie dans le formulaire
function afficherBiblio() {
  const mem = produitsMembrane(), col = colles(), connecte = !!lireSession();
  $("biblioSub").textContent = `${mem.length} produit${mem.length > 1 ? "s" : ""}, ${col.length} colle${col.length > 1 ? "s" : ""}`;
  const entete = (k, p, etat) => { const [et, cl] = ETATS[etat]; return `<div class="ph"><b>${esc(p.nom)}</b>${p.fournisseur ? `<span class="fo">${esc(p.fournisseur)}</span>` : ""}${p.role ? `<span class="ro">${esc(p.role)}</span>` : ""}<span class="st ${cl}">${et}</span></div>`; };
  const boutonsDe = (k, etat) => {
    const boutons = [`<button type="button" class="mini" data-a="edit" data-k="${esc(k)}">Modifier</button>`];
    if (etat !== "shared") boutons.push(`<button type="button" class="mini pri" data-a="send" data-k="${esc(k)}">${connecte ? "Envoyer à l'équipe" : "Se connecter pour envoyer"}</button>`);
    if (etat === "modified") boutons.push(`<button type="button" class="mini" data-a="revert" data-k="${esc(k)}">Annuler mes modifications</button>`);
    boutons.push(`<button type="button" class="mini" data-a="del" data-k="${esc(k)}">${etat === "local" ? "Supprimer" : "Retirer pour l'équipe"}</button>`);
    return boutons.join("");
  };
  $("biblioListe").innerHTML = mem.map((p) => {
    const k = p.id, etat = sharedStatus(itemAvecId(k), base);
    const chips = p.largeurs.map((w) => `<span class="chip${p.surDemande.includes(w) ? " dem" : ""}" title="${p.surDemande.includes(w) ? "Sur demande" : "En stock"}">${w}${p.surDemande.includes(w) ? "*" : ""}</span>`).join("");
    return `<div class="prod">${entete(k, p, etat)}
      <div class="chips">${chips}</div>
      <div class="pm">Largeurs en mm${p.surDemande.length ? " (* sur demande)" : ""} · rouleaux de ${fmt(p.rouleauM, p.rouleauM % 1 ? 1 : 0)} m${p.sd ? ` · sd ≈ ${fmt(p.sd, p.sd % 1 ? 1 : 0)} m` : ""}${p.autocollant ? " · autocollante" : ""}${p.indexFiche ? ` · ${ficheLien(p.indexFiche)}` : ""}</div>
      <div class="pa">${boutonsDe(k, etat)}</div></div>`;
  }).join("");
  $("biblioColles").innerHTML = col.map((p) => {
    const k = p.id, etat = sharedStatus(itemAvecId(k), base), m = (v) => fmt(v, v % 1 ? 1 : 0);
    return `<div class="prod colle">${entete(k, p, etat)}
      <div class="pm">Cartouche de ${m(p.ml)} ml · couvre ${m(p.metres)} m${p.metresMin ? ` (${m(p.metresMin)} m au plus défavorable)` : ""} · cordon de ${m(p.cordonMm)} mm · ${p.parCarton} par carton${p.id === colleChoisie(reg).id ? " · <b>utilisée pour la commande</b>" : ""}</div>
      <div class="pa">${boutonsDe(k, etat)}</div></div>`;
  }).join("");
}
function afficherFicheForm() {
  const box = $("bFiche");
  if (ficheForm) { box.innerHTML = `${ficheLien(ficheForm)} <button type="button" class="linkbtn" data-fiche="remove">Retirer</button>`; return; }
  if (!fichePicking) { box.innerHTML = `<button type="button" class="linkbtn" data-fiche="pick">Lier une fiche Index</button>`; return; }
  box.innerHTML = `<div class="fiche-pick"><input id="ficheSearch" type="text" placeholder="Rechercher dans Index…" aria-label="Rechercher une fiche dans Index" autocomplete="off"><div id="ficheResults" class="hint">Chargement…</div></div>`;
  const input = $("ficheSearch");
  const montrer = () => chargerFiches().then((liste) => {
    const res = chercherFiches(liste, input.value);
    $("ficheResults").innerHTML = res.length ? res.map((f) => `<button type="button" class="res" data-fiche-id="${esc(f.id)}" data-fiche-name="${esc(f.name)}">${esc(f.name)}<span class="sub">${esc(f.supplier)} · ${esc(f.category)}</span></button>`).join("") : "Aucune fiche trouvée.";
  }, () => { $("ficheResults").textContent = "Index injoignable pour le moment."; });
  input.addEventListener("input", montrer);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { e.stopPropagation(); fichePicking = false; afficherFicheForm(); }
    if (e.key === "Enter") { e.preventDefault(); $("ficheResults").querySelector("[data-fiche-id]")?.click(); }
  });
  input.focus(); montrer();
}
$("bFiche").addEventListener("click", (e) => {
  const x = e.target.closest("[data-fiche], [data-fiche-id]"); if (!x) return;
  if (x.dataset.fiche === "pick") fichePicking = true;
  else if (x.dataset.fiche === "remove") ficheForm = null;
  else if (x.dataset.ficheId) { ficheForm = { id: x.dataset.ficheId, name: x.dataset.ficheName }; fichePicking = false; }
  afficherFicheForm();
});
function ouvrirForm(k) {
  biblioEdit = k;
  const p = k ? PRODUITS[k] : null;
  $("biblioTitre").textContent = p ? `Modifier « ${p.nom} »` : "Nouveau produit";
  $("bNom").value = p?.nom ?? ""; $("bFour").value = p?.fournisseur ?? ""; $("bRole").value = p?.role ?? "";
  $("bLong").value = p ? String(p.rouleauM).replace(".", ",") : "25";
  $("bSd").value = p?.sd ? String(p.sd).replace(".", ",") : ""; $("bAuto").checked = !!p?.autocollant;
  $("bLarg").value = p ? mmListe(p.largeurs.filter((w) => !p.surDemande.includes(w))) : ""; $("bDem").value = p ? mmListe(p.surDemande) : "";
  ficheForm = p?.indexFiche ?? null; fichePicking = false; afficherFicheForm();
  $("biblioErr").textContent = ""; $("biblioForm").classList.remove("hidden");
  $("bNom").focus();
}
const fermerForm = () => { biblioEdit = null; $("biblioForm").classList.add("hidden"); };
$("voirBiblio").addEventListener("click", () => { $("biblio").open = true; $("biblio").scrollIntoView({ behavior: "smooth", block: "start" }); });
$("biblioNouveau").addEventListener("click", () => ouvrirForm(""));
$("biblioAnnuler").addEventListener("click", fermerForm);
$("biblioForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const nom = $("bNom").value.trim(), long = nombre($("bLong").value || "25");
  const std = lireMm($("bLarg").value), dem = lireMm($("bDem").value);
  const err = !nom ? "Donne un nom au produit."
    : [...std, ...dem].some((n) => !(n > 0)) ? "Les largeurs sont des nombres en mm, séparés par des virgules."
    : !std.length && !dem.length ? "Indique au moins une largeur."
    : !(long > 0) ? "La longueur d'un rouleau est un nombre en m."
    : $("bSd").value.trim() && !(nombre($("bSd").value) > 0) ? "La valeur sd est un nombre en m (ou laisse vide)."
    : Object.entries(PRODUITS).some(([k, p]) => k !== biblioEdit && p.nom.toLowerCase() === nom.toLowerCase()) ? "Un produit porte déjà ce nom." : "";
  if (err) { $("biblioErr").innerHTML = `<p>${esc(err)}</p>`; return; }
  const id = biblioEdit || `p${Date.now().toString(36)}`;
  const produit = { nom, court: nom, fournisseur: $("bFour").value, role: $("bRole").value, largeurs: [...std, ...dem], surDemande: dem, rouleauM: long, ...($("bSd").value.trim() ? { sd: nombre($("bSd").value) } : {}), ...($("bAuto").checked ? { autocollant: true } : {}), ...(ficheForm ? { indexFiche: ficheForm } : {}) };
  chargerCatalogue({ ...PRODUITS, [id]: produit }); sauverCatalogue(); fermerForm(); afficherBiblio(); maj(); afficherCommande();
  toast(biblioEdit ? "Produit modifié" : "Produit ajouté : envoie-le à l'équipe pour le partager");
});
let armeSuppr = null, armeT;
async function surBiblio(e) {
  const x = e.target.closest("button[data-a]"); if (!x) return;
  const k = x.dataset.k, estColle = PRODUITS[k]?.type === "colle";
  if (x.dataset.a === "edit") { if (estColle) ouvrirColleForm(k); else ouvrirForm(k); return; }
  if (x.dataset.a === "send") { await envoyer(k); return; }
  if (x.dataset.a === "revert") { annulerModifs(k); return; }
  if (estColle) {
    if (colles().length <= 1) { toast("Il faut garder au moins une colle"); return; }
    if (colleChoisie(reg).id === k) { toast("Cette colle est choisie pour la commande : choisis-en une autre dans les réglages"); return; }
  } else {
    if (produitsMembrane().length <= 1) { toast("Il faut garder au moins un produit"); return; }
    if (lignes.some((l) => l.produit === k)) { toast("Ce produit est utilisé dans la commande : retire d'abord ces lignes"); return; }
  }
  if (armeSuppr !== k) { armeSuppr = k; x.textContent = "Sûr ? Clique encore"; clearTimeout(armeT); armeT = setTimeout(() => { armeSuppr = null; afficherBiblio(); }, 4000); return; }
  armeSuppr = null;
  if (sharedStatus(itemAvecId(k), base) !== "local" && !(await retirerDuPartage(k))) { afficherBiblio(); return; }
  const rest = { ...PRODUITS }; delete rest[k];
  chargerCatalogue(rest); sauverCatalogue(); afficherBiblio(); maj(); afficherCommande(); toast(estColle ? "Colle supprimée" : "Produit supprimé");
}
$("biblioListe").addEventListener("click", surBiblio);
$("biblioColles").addEventListener("click", surBiblio);

// ---------- Colles de la bibliotheque : ajouter / modifier ----------
let colleEdit = null; // id de la colle en cours de modification ("" = nouvelle)
const virg = (v) => String(v).replace(".", ",");
function ouvrirColleForm(k) {
  colleEdit = k;
  const p = k ? PRODUITS[k] : null;
  $("colleTitre").textContent = p ? `Modifier « ${p.nom} »` : "Nouvelle colle";
  $("cNom").value = p?.nom ?? ""; $("cFour").value = p?.fournisseur ?? "";
  $("cMl").value = p ? virg(p.ml) : "600"; $("cCarton").value = p ? String(p.parCarton) : "20";
  $("cMetres").value = p ? virg(p.metres) : "10"; $("cMin").value = p?.metresMin ? virg(p.metresMin) : "";
  $("cCordon").value = p ? virg(p.cordonMm) : "45";
  $("colleErr").textContent = ""; $("colleForm").classList.remove("hidden"); $("cNom").focus();
}
const fermerColleForm = () => { colleEdit = null; $("colleForm").classList.add("hidden"); };
$("biblioNouvelleColle").addEventListener("click", () => ouvrirColleForm(""));
$("colleAnnuler").addEventListener("click", fermerColleForm);
$("colleForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const nom = $("cNom").value.trim(), ml = nombre($("cMl").value), carton = nombre($("cCarton").value), metres = nombre($("cMetres").value);
  const min = $("cMin").value.trim() ? nombre($("cMin").value) : 0, cordon = nombre($("cCordon").value);
  const err = !nom ? "Donne un nom à la colle."
    : !(ml > 0) ? "Le contenu d'une cartouche est un nombre en ml."
    : !(carton >= 1) ? "Le nombre de cartouches par carton est un nombre entier."
    : !(metres > 0) ? "La couverture d'une cartouche est un nombre en m."
    : min && !(min > 0 && min < metres) ? "Le cas défavorable doit être plus petit que le cas courant (ou laisse vide)."
    : !(cordon > 0) ? "La largeur du cordon est un nombre en mm."
    : Object.entries(PRODUITS).some(([k, p]) => k !== colleEdit && p.nom.toLowerCase() === nom.toLowerCase()) ? "Un produit ou une colle porte déjà ce nom." : "";
  if (err) { $("colleErr").innerHTML = `<p>${esc(err)}</p>`; return; }
  const id = colleEdit || `c${Date.now().toString(36)}`;
  const colle = { type: "colle", nom, court: nom, fournisseur: $("cFour").value, ml, parCarton: Math.round(carton), metres, ...(min ? { metresMin: min } : {}), cordonMm: cordon, ...(PRODUITS[id]?.indexFiche ? { indexFiche: PRODUITS[id].indexFiche } : {}) };
  chargerCatalogue({ ...PRODUITS, [id]: colle }); sauverCatalogue(); fermerColleForm(); afficherBiblio(); maj(); afficherCommande();
  toast(colleEdit ? "Colle modifiée" : "Colle ajoutée : envoie-la à l'équipe pour la partager");
});

// ---------- Demarrage ----------
$("produitSel").innerHTML = selHtml("produit", "Produit utilisé");
$("colleSel").innerHTML = selHtml("colle", "Colle utilisée");
afficherBiblio(); afficherEtatPartage(); afficherCompte(); synchroniser();
lignesTroncons(); maj(); afficherCommande();
