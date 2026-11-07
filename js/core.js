// Membrane : calculs sans affichage (testes par « node --test »).
// Principe : une bande de membrane est dessinee en troncons ; on colle certains troncons avec un cordon
// de SikaBond-444 Membrane Fix, place au bout libre du troncon. On en deduit la colle et les rouleaux.

/** Produits proposes. Largeurs de rouleau standard en mm (fiches Sika), rouleaux de 25 m. « surDemande » : largeur disponible seulement sur demande. */
export const PRODUITS = {
  outplus: { nom: "SikaMembran Outdoor plus", court: "Outdoor plus", role: "pare-pluie", largeurs: [100, 150, 200, 250, 300, 1400], surDemande: [1400] },
  uni: { nom: "SikaMembran Universal", court: "Universal", role: "pare-vapeur", largeurs: [100, 150, 200, 250, 300, 350, 1400], surDemande: [1400] },
  out: { nom: "SikaMembran Outdoor", court: "Outdoor", role: "", largeurs: [100, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 1000, 1200, 1400], surDemande: [] },
};

/** La colle : cartouche (portion tubulaire) de 600 ml = 7,5 m de cordon (fiche : 7,5 a 10 m, on prend le cas le plus defavorable) ; cartons de 20. */
export const COLLE = { nom: "SikaBond-444 Membrane Fix", ml: 600, metresParCartouche: 7.5, parCarton: 20, cordonMm: 45 };

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
  const p = PRODUITS[produit] ?? PRODUITS.outplus;
  if (!(dev > 0)) return null;
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

/** Resultat d'une bande : largeur de rouleau, longueur de cordon, alertes. Null si la longueur de bande manque. */
export function calculBande(b) {
  const run = pos(b.longueur);
  const segs = b.segs ?? [];
  const cw = pos(b.cordon) || COLLE.cordonMm;
  const dev = developpe(segs);
  const alertes = [];
  if (!(run > 0)) return null;
  const roll = largeurRouleau(b.produit, dev, !!b.mesure);
  const collés = segs.map((s, i) => ({ s, i })).filter(({ s }) => s.on && pos(s.len) > 0);
  if (roll?.depasse) alertes.push(`La bande (${fmt(dev, 0)} mm) dépasse le plus grand rouleau de ce produit (${roll.largeur} mm).`);
  if (!collés.length) alertes.push("Aucun tronçon n'est collé : pas de colle à prévoir.");
  for (const { s, i } of collés) if (pos(s.len) < cw) alertes.push(`Le tronçon ${i + 1} (${fmt(pos(s.len), 0)} mm) est plus court que le cordon de colle (${fmt(cw, 0)} mm).`);
  return {
    dev, roll, run, cw, nCollés: collés.length,
    cordonM: collés.length * run,
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

/**
 * La commande : total par article (rouleaux par produit et largeur, colle) et lignes classees par facade puis par etage.
 * Rouleaux : calcul brut (somme des longueurs / 25 m, arrondi au rouleau superieur), sans chute ni recouvrement.
 */
export function commande(lignes) {
  const rouleaux = new Map();
  let cordonM = 0;
  const calculees = [];
  for (const l of lignes) {
    const r = calculBande(l);
    if (!r || !r.roll) continue;
    calculees.push({ ligne: l, r });
    cordonM += r.cordonM;
    const cle = `${l.produit}|${r.roll.largeur}|${r.roll.mesure ? 1 : 0}`;
    const e = rouleaux.get(cle) ?? { produit: l.produit, largeur: r.roll.largeur, mesure: r.roll.mesure, surDemande: r.roll.surDemande, metres: 0 };
    e.metres += r.run;
    rouleaux.set(cle, e);
  }
  const ordre = Object.keys(PRODUITS);
  const articles = [...rouleaux.values()]
    .map((e) => ({ ...e, rouleaux: Math.ceil(e.metres / ROULEAU_M - 1e-9) }))
    .sort((a, b) => ordre.indexOf(a.produit) - ordre.indexOf(b.produit) || a.largeur - b.largeur);
  const cartouches = Math.ceil(cordonM / COLLE.metresParCartouche - 1e-9);
  // Facades triees (sans facade a la fin), etages par rang puis ordre naturel
  const groupes = new Map();
  for (const c of calculees) { const f = c.ligne.facade?.trim() ?? ""; if (!groupes.has(f)) groupes.set(f, []); groupes.get(f).push(c); }
  const facades = [...groupes.keys()].sort((a, b) => (a === "") - (b === "") || triNaturel(a, b))
    .map((f) => ({ facade: f, lignes: groupes.get(f).slice().sort((a, b) => rangEtage(a.ligne.etage) - rangEtage(b.ligne.etage) || triNaturel(a.ligne.etage ?? "", b.ligne.etage ?? "")) }));
  return { articles, cordonM, cartouches, cartons: Math.ceil(cartouches / COLLE.parCarton - 1e-9), facades };
}
