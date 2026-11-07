import { test } from "node:test";
import assert from "node:assert/strict";
import { nombre, fmt, developpe, largeurRouleau, positionCordon, calculBande, commande, rangEtage, piecesBande, rangerRouleaux, reglages, PRODUITS, PRODUITS_DEFAUT, chargerCatalogue, libelleProduit, longueurRouleau, nettoyerProduit, mergeShared, sharedStatus, stable, produitsEnListe, chargerListe } from "../js/core.js";

const proche = (a, b, m) => assert.ok(Math.abs(a - b) < 1e-6, `${m ?? ""} ${a} ≠ ${b}`);

const z = (extra = {}) => ({
  produit: "outplus", mesure: false, longueur: "12", facade: "Nord", etage: "R+1", plan: "101",
  segs: [{ len: "100", dir: "E", on: true }, { len: "40", dir: "SE", on: false }, { len: "80", dir: "E", on: true }],
  ...extra,
});

test("nombre et fmt", () => {
  assert.equal(nombre("1 200,5"), 1200.5);
  assert.ok(Number.isNaN(nombre("")));
  assert.equal(fmt(7.5), "7,5");
  assert.equal(fmt(-0.01), "0,0");
});

test("bande developpee = somme des troncons", () => {
  assert.equal(developpe(z().segs), 220);
  assert.equal(developpe([{ len: "abc" }, { len: "-5" }, { len: "150" }]), 150);
});

test("largeur standard : la plus petite qui couvre la bande", () => {
  assert.equal(largeurRouleau("outplus", 220, false).largeur, 250);
  assert.equal(largeurRouleau("outplus", 250, false).largeur, 250);
  assert.equal(largeurRouleau("uni", 320, false).largeur, 350);
  assert.equal(largeurRouleau("out", 175, false).largeur, 200);
  assert.equal(largeurRouleau("outplus", 175, false).largeur, 200);
});

test("1400 mm : signale « sur demande » ; au-dela du plus grand rouleau : depasse", () => {
  const r = largeurRouleau("outplus", 800, false);
  assert.equal(r.largeur, 1400); assert.equal(r.surDemande, true);
  const d = largeurRouleau("outplus", 1500, false);
  assert.equal(d.depasse, true); assert.equal(d.largeur, 1400);
  assert.equal(largeurRouleau("outplus", 0, false), null);
});

test("sur mesure : la largeur de la bande, arrondie au mm superieur", () => {
  const r = largeurRouleau("outplus", 175, true);
  assert.equal(r.largeur, 175); assert.equal(r.mesure, true);
  assert.equal(largeurRouleau("outplus", 175.2, true).largeur, 176);
});

test("cordon au bout libre : premier troncon au depart, dernier a l'arrivee, milieu centre", () => {
  assert.deepEqual(positionCordon(0, 3, 100, 45), [0, 0.45]);
  const fin = positionCordon(2, 3, 80, 40); assert.deepEqual(fin, [0.5, 1]);
  const mil = positionCordon(1, 3, 100, 40); assert.ok(Math.abs(mil[0] - 0.3) < 1e-9 && Math.abs(mil[1] - 0.7) < 1e-9);
  assert.deepEqual(positionCordon(0, 1, 100, 45), [0.275, 0.725]); // troncon unique : centre
  assert.deepEqual(positionCordon(0, 2, 30, 45), [0, 1]); // plus court que le cordon : tout le troncon
});

test("reglages : valeurs par defaut, 0 accepte pour la marge et le recouvrement, invalide = defaut", () => {
  const d = reglages({});
  assert.equal(d.cordon, 45); assert.equal(d.cartouche, 10); assert.equal(d.marge, 0); proche(d.recouvrement, 0.05);
  const r = reglages({ cordon: "50", cartouche: "7,5", marge: "10", recouvrement: "0" });
  assert.equal(r.cordon, 50); assert.equal(r.cartouche, 7.5); proche(r.marge, 0.1); assert.equal(r.recouvrement, 0);
  const x = reglages({ cordon: "abc", cartouche: "-3", marge: "-5", recouvrement: "" });
  assert.equal(x.cordon, 45); assert.equal(x.cartouche, 10); assert.equal(x.marge, 0); proche(x.recouvrement, 0.05);
});

test("pieces d'une bande : marge, recouvrement de 5 cm, coupe en pieces de 25 m au plus", () => {
  const a = piecesBande(12, 0, 0.05); proche(a.total, 12.05); assert.deepEqual(a.pieces.map((p) => +p.toFixed(2)), [12.05]);
  const m = piecesBande(12, 0.1, 0.05); proche(m.net, 13.2); proche(m.total, 13.25);
  const l = piecesBande(30, 0, 0.05); proche(l.total, 30.1); assert.deepEqual(l.pieces.map((p) => +p.toFixed(2)), [25, 5.1]);
  assert.equal(piecesBande(24.95, 0, 0.05).pieces.length, 1); // 24,95 + 0,05 = 25 : un rouleau pile
  assert.equal(piecesBande(25, 0, 0.05).pieces.length, 2);
});

test("pieces rangees dans les rouleaux de 25 m, les plus longues d'abord", () => {
  assert.equal(rangerRouleaux([12.05, 12.05, 8.55]).length, 2); // 24,1 puis 8,55
  assert.equal(rangerRouleaux([12.05, 12.05, 12.05]).length, 2); // 3 pieces de 12,05 ne tiennent pas dans un rouleau
  assert.equal(rangerRouleaux([20, 6, 5, 4]).length, 2);
});

test("bande en Z de 12 m : 2 cordons de 12,05 m = 24,1 m, 3 cartouches (10 m), un rouleau de 250", () => {
  const r = calculBande(z());
  assert.equal(r.dev, 220); assert.equal(r.roll.largeur, 250); assert.equal(r.nCollés, 2); proche(r.cordonM, 24.1);
  assert.equal(r.cartouches, 3); assert.equal(r.rouleaux, 1); assert.deepEqual(r.alertes, []);
  const c = commande([z()]);
  assert.equal(c.cartouches, 3);
  assert.equal(c.articles.length, 1); assert.equal(c.articles[0].rouleaux, 1); assert.equal(c.articles[0].largeur, 250);
  assert.equal(c.cartons, 1);
  // cas defavorable choisi : 7,5 m par cartouche
  assert.equal(commande([z()], { cartouche: "7,5" }).cartouches, 4); // 24,1 / 7,5 = 3,2 -> 4
});

test("marge : allonge la bande et le cordon", () => {
  const c = commande([z()], { marge: "10" }); // 12 x 1,1 + 0,05 = 13,25 m ; cordon 26,5 m
  proche(c.articles[0].metres, 13.25); proche(c.cordonM, 26.5); assert.equal(c.cartouches, 3);
  proche(c.articles[0].chutes, 25 - 13.25);
});

test("alertes : rien de colle, troncon plus court que le cordon, bande trop large", () => {
  assert.match(calculBande(z({ segs: [{ len: "100", dir: "E", on: false }] })).alertes[0], /Aucun tronçon/);
  assert.match(calculBande(z({ segs: [{ len: "30", dir: "E", on: true }] })).alertes[0], /plus court que le cordon/);
  assert.match(calculBande(z({ segs: [{ len: "1500", dir: "E", on: true }] })).alertes[0], /dépasse/);
  assert.equal(calculBande(z({ longueur: "" })), null);
});

test("commande : recouvrement, rangement dans les rouleaux et chutes", () => {
  const a = z({ longueur: "12" }), b = z({ longueur: "12", etage: "R+2" }), c3 = z({ longueur: "8,5", etage: "RDC" });
  const c = commande([a, b, c3]);
  const art = c.articles[0];
  proche(art.metres, 32.65); proche(art.net, 32.5); proche(art.recouvrement, 0.15);
  assert.equal(art.rouleaux, 2); proche(art.chutes, 50 - 32.65);
  proche(c.cordonM, 65.3); assert.equal(c.cartouches, 7); // 65,3 / 10 = 6,53 -> 7
});

test("commande : sans recouvrement ni marge, on retrouve le calcul brut", () => {
  const c = commande([z({ longueur: "12" }), z({ longueur: "12" }), z({ longueur: "8,5" })], { recouvrement: "0" });
  proche(c.articles[0].metres, 32.5); assert.equal(c.articles[0].rouleaux, 2);
});

test("commande : produits et largeurs separes, classes dans l'ordre des produits", () => {
  const sm = z({ produit: "uni", segs: [{ len: "150", dir: "E", on: true }] });
  const c = commande([sm, z()]);
  assert.deepEqual(c.articles.map((a) => `${a.produit}-${a.largeur}`), ["outplus-250", "uni-150"]);
  const sur = commande([z({ mesure: true, segs: [{ len: "175", dir: "E", on: true }] })]);
  assert.equal(sur.articles[0].largeur, 175); assert.equal(sur.articles[0].mesure, true);
});

test("classement par facade puis par etage (rez avant etages, sous-sols avant le rez)", () => {
  assert.ok(rangEtage("SS1") < rangEtage("RDC")); assert.ok(rangEtage("RDC") < rangEtage("R+1")); assert.ok(rangEtage("R+2") < rangEtage("R+10"));
  const c = commande([z({ facade: "Sud", etage: "R+2" }), z({ facade: "Nord", etage: "R+2" }), z({ facade: "Nord", etage: "RDC" }), z({ facade: "", etage: "R+1" })]);
  assert.deepEqual(c.facades.map((f) => f.facade), ["Nord", "Sud", ""]);
  assert.deepEqual(c.facades[0].lignes.map((x) => x.ligne.etage), ["RDC", "R+2"]);
});

test("produits : Outdoor plus a 6 largeurs (dont 1400 sur demande)", () => {
  assert.equal(PRODUITS.outplus.largeurs.length, 6);
  assert.deepEqual(PRODUITS.outplus.surDemande, [1400]);
});

test("bibliotheque : nettoyage, produit d'un autre fournisseur, retour aux produits d'origine", () => {
  chargerCatalogue({ x: { nom: " Isover Vario ", fournisseur: "Isocell", role: "pare-vapeur", largeurs: ["1500", "1000", "abc", -5], surDemande: [2000, 1000], rouleauM: "50" }, vide: { nom: "", largeurs: [100] }, sans: { nom: "Sans largeur", largeurs: [] } });
  assert.deepEqual(Object.keys(PRODUITS), ["x"]);
  assert.deepEqual(PRODUITS.x.largeurs, [1000, 1500, 2000]); assert.deepEqual(PRODUITS.x.surDemande, [1000, 2000]);
  assert.equal(PRODUITS.x.nom, "Isover Vario"); assert.equal(PRODUITS.x.court, "Isover Vario"); assert.equal(PRODUITS.x.rouleauM, 50);
  assert.equal(libelleProduit("x"), "Isover Vario (Isocell)"); assert.equal(longueurRouleau("x"), 50);
  // rouleaux de 50 m : 30 m = un seul rouleau (et plus deux comme avec 25 m)
  const r = calculBande({ produit: "x", mesure: false, longueur: "30", segs: [{ len: "900", dir: "E", on: true }] });
  assert.equal(r.roll.largeur, 1000); assert.equal(r.roll.surDemande, true); assert.equal(r.rouleaux, 1); assert.equal(r.rouleauM, 50);
  const c = commande([{ produit: "x", mesure: false, longueur: "30", segs: [{ len: "900", dir: "E", on: true }] }]);
  proche(c.articles[0].chutes, 50 - 30.05); assert.equal(c.articles[0].rouleauM, 50);
  // produit supprime : ligne ignoree, pas d'erreur
  assert.equal(commande([z()]).articles.length, 0);
  chargerCatalogue(null);
  assert.deepEqual(Object.keys(PRODUITS), Object.keys(PRODUITS_DEFAUT));
  assert.equal(libelleProduit("outplus"), "SikaMembran Outdoor plus");
  assert.equal(libelleProduit("inconnu"), "(produit supprime)");
});

test("lien vers une fiche Index : garde id et nom, ignore le reste", () => {
  assert.deepEqual(nettoyerProduit({ nom: "A", largeurs: [100], indexFiche: { id: "f1", name: "Fiche A", x: 1 } }).indexFiche, { id: "f1", name: "Fiche A" });
  assert.equal("indexFiche" in nettoyerProduit({ nom: "A", largeurs: [100], indexFiche: { id: "", name: "x" } }), false);
  assert.equal(nettoyerProduit({ nom: "", largeurs: [100] }), null);
});

test("catalogue commun : fusion (nouveau, mis a jour, modifie ici, retire, jamais partage)", () => {
  chargerCatalogue(null);
  const p = (nom, l = [100]) => ({ nom, largeurs: l });
  const loc = (id, nom, l) => ({ ...nettoyerProduit(p(nom, l)), id });
  const eq = loc("a", "A"), base0 = { a: stable(eq) };
  // equipe : A modifie (150), B nouveau ; local : A inchange, C jamais partage
  const r1 = mergeShared([eq, loc("c", "C")], [{ id: "a", data: p("A", [100, 150]) }, { id: "b", data: p("B") }], base0);
  assert.deepEqual(r1.items.map((x) => x.id), ["a", "c", "b"]);
  assert.deepEqual(r1.items[0].largeurs, [100, 150]); assert.equal(r1.updated, 2);
  assert.deepEqual([r1.status.a, r1.status.b, r1.status.c], ["shared", "shared", "local"]);
  // modifie ici : on garde la version locale
  const mod = { ...eq, largeurs: [100, 200] };
  const r2 = mergeShared([mod], [{ id: "a", data: p("A", [100, 150]) }], base0);
  assert.deepEqual(r2.items[0].largeurs, [100, 200]); assert.equal(r2.status.a, "modified");
  assert.equal(sharedStatus(mod, r2.base), "modified"); assert.equal(sharedStatus(eq, base0), "shared"); assert.equal(sharedStatus(eq, {}), "local");
  // retire par l'equipe : disparait, sauf modifie ici ou utilise par la commande
  assert.equal(mergeShared([eq], [{ id: "a", data: p("A"), deleted_at: "2026-11-07" }], base0).items.length, 0);
  assert.equal(mergeShared([eq], [{ id: "a", data: p("A"), deleted_at: "2026-11-07" }], base0, new Set(["a"])).items.length, 1);
  assert.equal(mergeShared([mod], [{ id: "a", data: p("A"), deleted_at: "2026-11-07" }], base0).items.length, 1);
  // aller-retour liste <-> bibliotheque
  chargerListe(r1.items); assert.deepEqual(Object.keys(PRODUITS), ["a", "c", "b"]); assert.equal(produitsEnListe()[0].id, "a");
  chargerCatalogue(null);
});
