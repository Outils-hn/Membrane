// Membrane : calculs sans affichage (testes par « node --test »).
// Principe : une bande de membrane est dessinee en troncons ; on colle certains troncons avec un cordon
// de SikaBond-444 Membrane Fix, place au bout libre du troncon. On en deduit la colle et les rouleaux.

/** Produits proposes. Largeurs de rouleau standard en mm (fiches Sika), rouleaux de 25 m. « surDemande » : largeur disponible seulement sur demande. */
export const PRODUITS_DEFAUT = {
  outplus: { nom: "SikaMembran Outdoor plus", court: "Outdoor plus", fournisseur: "Sika", role: "pare-pluie", largeurs: [100, 150, 200, 250, 300, 1400], surDemande: [1400], rouleauM: 25 },
  uni: { nom: "SikaMembran Universal", court: "Universal", fournisseur: "Sika", role: "pare-vapeur", largeurs: [100, 150, 200, 250, 300, 350, 1400], surDemande: [1400], rouleauM: 25 },
  out: { nom: "SikaMembran Outdoor", court: "Outdoor", fournisseur: "Sika", role: "", largeurs: [100, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 1000, 1200, 1400], surDemande: [], rouleauM: 25 },
};

/** La bibliotheque en cours (modifiable : produits d'autres fournisseurs). Remplie par chargerCatalogue. */
export const PRODUITS = {};

/**
 * Remplace la bibliotheque par « obj » (lu du navigateur ou saisi) apres nettoyage : nom obligatoire, largeurs en mm
 * (au moins une), « sur demande » = largeurs en plus, longueur de rouleau en m (25 par defaut).
 * Vide ou illisible = produits d'origine. Rend la bibliotheque.
 */
export function nettoyerProduit(p) {
  if (!p || typeof p !== "object" || typeof p.nom !== "string" || !p.nom.trim()) return null;
  const nums = (l) => [...new Set((Array.isArray(l) ? l : []).map(Number).filter((n) => Number.isFinite(n) && n > 0).map((n) => Math.round(n)))];
  const sd = nums(p.surDemande), std = nums(p.largeurs);
  const largeurs = [...new Set([...std, ...sd])].sort((a, b) => a - b);
  if (!largeurs.length) return null;
  const m = Number(p.rouleauM), f = p.indexFiche;
  const r = {
    nom: p.nom.trim(), court: (typeof p.court === "string" && p.court.trim()) || p.nom.trim(),
    fournisseur: typeof p.fournisseur === "string" ? p.fournisseur.trim() : "", role: typeof p.role === "string" ? p.role.trim() : "",
    largeurs, surDemande: sd.filter((n) => largeurs.includes(n)).sort((a, b) => a - b), rouleauM: Number.isFinite(m) && m > 0 ? m : 25,
  };
  // Lien vers la fiche technique dans Index (id + nom de la fiche)
  if (f && typeof f.id === "string" && f.id && typeof f.name === "string") r.indexFiche = { id: f.id, name: f.name };
  return r;
}

export function chargerCatalogue(obj) {
  const propre = {};
  if (obj && typeof obj === "object") for (const [k, p] of Object.entries(obj)) { const n = nettoyerProduit(p); if (n) propre[String(k)] = n; }
  const src = Object.keys(propre).length ? propre : structuredClone(PRODUITS_DEFAUT);
  for (const k of Object.keys(PRODUITS)) delete PRODUITS[k];
  Object.assign(PRODUITS, src);
  return PRODUITS;
}
chargerCatalogue(null);

/** Nom a afficher d'un produit : le fournisseur est ajoute s'il n'est pas deja dans le nom. */
export function libelleProduit(id) {
  const p = PRODUITS[id]; if (!p) return "(produit supprime)";
  return p.fournisseur && !p.nom.toLowerCase().includes(p.fournisseur.toLowerCase()) ? `${p.nom} (${p.fournisseur})` : p.nom;
}
/** Longueur d'un rouleau de ce produit, en m. */
export const longueurRouleau = (id) => PRODUITS[id]?.rouleauM ?? ROULEAU_M;

/** La colle : cartouche (portion tubulaire) de 600 ml ; la fiche Sika donne 7,5 a 10 m de membrane par cartouche (10 m par defaut, 7,5 m = cas defavorable) ; cartons de 20. */
export const COLLE = { nom: "SikaBond-444 Membrane Fix", ml: 600, metresParCartouche: 10, choixMetres: [10, 7.5], parCarton: 20, cordonMm: 45 };

/** Reglages communs a la commande (textes saisis) : largeur du cordon (mm), metres de cordon par cartouche, marge (%), recouvrement (cm). */
export const REGLAGES_DEFAUT = { cordon: String(COLLE.cordonMm), cartouche: String(COLLE.metresParCartouche), marge: "0", recouvrement: "5" };
/** Lit les reglages : valeurs invalides = valeurs par defaut ; marge et recouvrement peuvent valoir 0. */
export function reglages(r = {}) {
  const ge0 = (v, d) => { const n = nombre(v); return Number.isFinite(n) && n >= 0 ? n : d; };
  return {
    cordon: pos(r.cordon) || COLLE.cordonMm,
    cartouche: pos(r.cartouche) || COLLE.metresParCartouche,
    marge: ge0(r.marge, 0) / 100,
    recouvrement: ge0(r.recouvrement, 5) / 100, // en metres
  };
}

/** Longueur d'un rouleau, en metres. */
export const ROULEAU_M = 25;

/** Les 8 directions d'un troncon (le dessin part du point de depart, vers la droite par defaut). */
export const DIRS = [
  { id: "E", fleche: "→", nom: "droite", x: 1, y: 0 },
  { id: "SE", fleche: "↘", nom: "bas-droite", x: Math.SQRT1_2, y: Math.SQRT1_2 },
  { id: "S", fleche: "↓", nom: "bas", x: 0, y: 1 },
  { id: "SW", fleche: "↙", nom: "bas-gauche", x: -Math.SQRT1_2, y: Math.SQRT1_2 },
  { id: "W", fleche: "←", nom: "gauche", x: -1, y: 0 },
  { id: "NW", fleche: "↖", nom: "haut-gauche", x: -Math.SQRT1_2, y: -Math.SQRT1_2 },
  { id: "N", fleche: "↑", nom: "haut", x: 0, y: -1 },
  { id: "NE", fleche: "↗", nom: "haut-droite", x: Math.SQRT1_2, y: -Math.SQRT1_2 },
];
export const dir = (id) => DIRS.find((d) => d.id === id) ?? DIRS[0];

/** Lit un nombre ecrit a la francaise (virgule, espaces, apostrophe suisse). NaN si vide ou illisible. */
export function nombre(s) {
  const t = String(s ?? "").replace(/[\s'’]/g, "").replace(",", ".");
  return t === "" ? NaN : Number(t);
}
const pos = (s) => { const v = nombre(s); return Number.isFinite(v) && v > 0 ? v : 0; };

/** Affiche un nombre avec une virgule et un nombre fixe de decimales (jamais « -0,0 »). */
export function fmt(n, d = 1) {
  return (Math.abs(n) < 0.5 * 10 ** -d ? 0 : n).toFixed(d).replace(".", ",");
}

/** Largeur de la bande une fois depliee = somme des troncons (mm). */
export const developpe = (segs) => segs.reduce((t, s) => t + pos(s.len), 0);

/**
 * Largeur de rouleau a commander : standard = la plus petite largeur du produit qui couvre la bande ;
 * sur mesure = exactement la largeur de la bande (le fournisseur la coupe), arrondie au mm superieur.
 */
export function largeurRouleau(produit, dev, mesure) {
  const p = PRODUITS[produit];
  if (!p || !(dev > 0)) return null;
  if (mesure) return { largeur: Math.ceil(dev - 1e-9), mesure: true, surDemande: true, depasse: false };
  const l = p.largeurs.find((w) => w >= dev - 1e-9);
  if (l === undefined) return { largeur: p.largeurs[p.largeurs.length - 1], mesure: false, surDemande: false, depasse: true };
  return { largeur: l, mesure: false, surDemande: p.surDemande.includes(l), depasse: false };
}

/**
 * Ou se place le cordon sur un troncon, en fraction de sa longueur [debut, fin].
 * Au bout libre : le premier troncon est colle a son extremite de depart, le dernier a son extremite d'arrivee.
 * Un troncon unique ou intermediaire n'a pas de bout libre : cordon centre.
 */
export function positionCordon(i, n, len, cw) {
  if (!(len > 0)) return [0, 0];
  const c = Math.min(cw, len);
  if (n > 1 && i === 0) return [0, c / len];
  if (n > 1 && i === n - 1) return [1 - c / len, 1];
  return [(1 - c / len) / 2, (1 + c / len) / 2];
}

/**
 * Longueur de membrane pour une bande de longueur « run » (m) : marge, puis recouvrement avec la piece suivante.
 * Une bande plus longue qu'un rouleau est coupee en pieces de 25 m au plus, chacune recouvrant la suivante.
 * Rend la longueur totale et la liste des pieces (m).
 */
export function piecesBande(run, marge, recouvrement, L = ROULEAU_M) {
  const n = run * (1 + marge);
  const k = Math.max(1, Math.ceil(n / (L - recouvrement) - 1e-9));
  const total = n + recouvrement * k;
  const pieces = [];
  for (let i = 0; i < k - 1; i++) pieces.push(L);
  pieces.push(total - L * (k - 1));
  return { net: n, total, pieces };
}

/** Resultat d'une bande : largeur de rouleau, longueurs, cordon, alertes. Null si la longueur de bande manque. */
export function calculBande(b, reg = {}) {
  const g = reglages(reg);
  const run = pos(b.longueur);
  const segs = b.segs ?? [];
  const cw = g.cordon;
  const dev = developpe(segs);
  const alertes = [];
  if (!(run > 0)) return null;
  const roll = largeurRouleau(b.produit, dev, !!b.mesure);
  const collés = segs.map((s, i) => ({ s, i })).filter(({ s }) => s.on && pos(s.len) > 0);
  if (roll?.depasse) alertes.push(`La bande (${fmt(dev, 0)} mm) dépasse le plus grand rouleau de ce produit (${roll.largeur} mm).`);
  if (!collés.length) alertes.push("Aucun tronçon n'est collé : pas de colle à prévoir.");
  for (const { s, i } of collés) if (pos(s.len) < cw) alertes.push(`Le tronçon ${i + 1} (${fmt(pos(s.len), 0)} mm) est plus court que le cordon de colle (${fmt(cw, 0)} mm).`);
  const L = longueurRouleau(b.produit);
  const pc = piecesBande(run, g.marge, g.recouvrement, L);
  return {
    dev, roll, run, cw, rouleauM: L, nCollés: collés.length,
    longueur: pc.total, pieces: pc.pieces,
    cordonM: collés.length * pc.total,
    cartouches: Math.ceil((collés.length * pc.total) / g.cartouche - 1e-9),
    rouleaux: Math.ceil(pc.total / L - 1e-9),
    alertes,
  };
}

/** Rang d'un etage pour le tri : sous-sols, rez, puis etages dans l'ordre. */
export function rangEtage(e) {
  const t = String(e ?? "").trim().toLowerCase().replace(/\s+/g, "");
  if (t === "") return 10000;
  if (/^(rdc|eg|rez|r\+0|0)$/.test(t)) return 0;
  let m = t.match(/^(?:ss|u|-)(\d+)?/);
  if (m && /^(ss|u|-)/.test(t)) return -(Number(m[1] ?? 1));
  m = t.match(/^(?:r\+|\+|r|e|etage)?(\d+)$/);
  if (m) return Number(m[1]);
  return 1000;
}
export const triNaturel = (a, b) => String(a).localeCompare(String(b), "fr", { numeric: true, sensitivity: "base" });

/** Range des pieces (m) dans des rouleaux de 25 m, les plus longues d'abord : rend les rouleaux (liste de pieces). */
export function rangerRouleaux(pieces, L = ROULEAU_M) {
  const rouleaux = [];
  for (const p of pieces.slice().sort((a, b) => b - a)) {
    const r = rouleaux.find((x) => x.reste >= p - 1e-9);
    if (r) { r.reste -= p; r.pieces.push(p); } else rouleaux.push({ reste: L - p, pieces: [p] });
  }
  return rouleaux;
}

/**
 * La commande : total par article (rouleaux par produit et largeur, colle) et lignes classees par facade puis par etage.
 * Rouleaux : chaque bande = marge + recouvrement de 5 cm (coupee en pieces de 25 m au plus), pieces rangees dans les
 * rouleaux de 25 m ; les chutes sont ce qui reste dans les rouleaux entames.
 */
export function commande(lignes, reg = {}) {
  const g = reglages(reg);
  const groupesRoul = new Map();
  let cordonM = 0;
  const calculees = [];
  for (const l of lignes) {
    const r = calculBande(l, reg);
    if (!r || !r.roll) continue;
    calculees.push({ ligne: l, r });
    cordonM += r.cordonM;
    const cle = `${l.produit}|${r.roll.largeur}|${r.roll.mesure ? 1 : 0}`;
    const e = groupesRoul.get(cle) ?? { produit: l.produit, largeur: r.roll.largeur, mesure: r.roll.mesure, surDemande: r.roll.surDemande, rouleauM: r.rouleauM, metres: 0, net: 0, pieces: [] };
    e.metres += r.longueur; e.net += r.run; e.pieces.push(...r.pieces);
    groupesRoul.set(cle, e);
  }
  const ordre = Object.keys(PRODUITS);
  const articles = [...groupesRoul.values()].map((e) => {
    const rouleaux = rangerRouleaux(e.pieces, e.rouleauM);
    return { ...e, rouleaux: rouleaux.length, chutes: rouleaux.length * e.rouleauM - e.metres, recouvrement: e.metres - e.net };
  }).sort((a, b) => ordre.indexOf(a.produit) - ordre.indexOf(b.produit) || a.largeur - b.largeur);
  const cartouches = Math.ceil(cordonM / g.cartouche - 1e-9);
  // Facades triees (sans facade a la fin), etages par rang puis ordre naturel
  const groupes = new Map();
  for (const c of calculees) { const f = c.ligne.facade?.trim() ?? ""; if (!groupes.has(f)) groupes.set(f, []); groupes.get(f).push(c); }
  const facades = [...groupes.keys()].sort((a, b) => (a === "") - (b === "") || triNaturel(a, b))
    .map((f) => ({ facade: f, lignes: groupes.get(f).slice().sort((a, b) => rangEtage(a.ligne.etage) - rangEtage(b.ligne.etage) || triNaturel(a.ligne.etage ?? "", b.ligne.etage ?? "")) }));
  return { articles, cordonM, cartouches, cartons: Math.ceil(cartouches / COLLE.parCarton - 1e-9), facades, reglages: g };
}

// ---------- Catalogue commun a l'equipe (Supabase d'Index) : fusion avec la copie de ce poste ----------
/** Les produits en liste (avec leur id), pour la fusion. */
export const produitsEnListe = () => Object.entries(PRODUITS).map(([id, p]) => ({ ...p, id }));
/** Remplace la bibliotheque par une liste de produits (avec id). */
export const chargerListe = (items) => chargerCatalogue(Object.fromEntries(items.map(({ id, ...r }) => [id, r])));

/** Empreinte stable d'un element (ordre des cles fige) pour savoir s'il a change. */
export function stable(v) {
  if (Array.isArray(v)) return "[" + v.map(stable).join(",") + "]";
  if (v && typeof v === "object") return "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + stable(v[k])).join(",") + "}";
  return JSON.stringify(v ?? null);
}

/**
 * Fusionne la liste locale avec le catalogue commun (meme principe que Strate).
 * - base : derniere version recue de l'equipe pour chaque id (sert a reperer les modifs locales) ;
 * - produit commun pas modifie ici : version de l'equipe ; modifie ici : garde la version locale (« modified ») ;
 * - produit retire par l'equipe : retire, sauf s'il est modifie ici ou utilise par la commande ;
 * - produit jamais partage : garde (« local »).
 * remote : lignes { id, data, deleted_at }. Rend { items, status, base, updated }.
 */
export function mergeShared(local, remote, base, used = new Set()) {
  const byId = new Map(remote.map((r) => [r.id, r]));
  const out = [], status = {}, newBase = {};
  let updated = 0;
  const donnee = (r) => { const n = nettoyerProduit(r.data); return n ? { ...n, id: r.id } : null; };
  for (const item of local) {
    const r = byId.get(item.id);
    if (!r) { out.push(item); status[item.id] = "local"; continue; }
    const modified = base[item.id] != null && stable(item) !== base[item.id];
    if (r.deleted_at) { if (modified || used.has(item.id)) { out.push(item); status[item.id] = "local"; } continue; }
    const remoteData = donnee(r);
    if (!remoteData) { out.push(item); status[item.id] = "local"; continue; }
    newBase[r.id] = stable(remoteData);
    if (modified && stable(item) !== newBase[r.id]) { out.push(item); status[item.id] = "modified"; continue; }
    if (stable(item) !== newBase[r.id]) updated++;
    out.push(remoteData); status[r.id] = "shared";
  }
  const localIds = new Set(local.map((x) => x.id));
  for (const r of remote) {
    if (r.deleted_at || localIds.has(r.id)) continue;
    const remoteData = donnee(r); if (!remoteData) continue;
    newBase[r.id] = stable(remoteData);
    out.push(remoteData); status[r.id] = "shared"; updated++;
  }
  return { items: out, status, base: newBase, updated };
}

/** Etat d'un produit sans nouvelle lecture du catalogue commun : « local », « shared » ou « modified ». */
export function sharedStatus(item, base) {
  if (base[item.id] == null) return "local";
  return stable(item) === base[item.id] ? "shared" : "modified";
}
