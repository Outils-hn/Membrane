import { test } from "node:test";
import assert from "node:assert/strict";
import { nombre, fmt, developpe, largeurRouleau, positionCordon, calculBande, commande, rangEtage, PRODUITS } from "../js/core.js";

const z = (extra = {}) => ({
  produit: "outplus", mesure: false, longueur: "12", cordon: "45", facade: "Nord", etage: "R+1", plan: "101",
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

test("bande en Z de 12 m : 2 cordons de 12 m = 24 m, 4 cartouches, un rouleau de 250", () => {
  const r = calculBande(z());
  assert.equal(r.dev, 220); assert.equal(r.roll.largeur, 250); assert.equal(r.nCollés, 2); assert.equal(r.cordonM, 24);
  assert.deepEqual(r.alertes, []);
  const c = commande([z()]);
  assert.equal(c.cartouches, 4); // 24 / 7,5 = 3,2 -> 4
  assert.equal(c.articles.length, 1); assert.equal(c.articles[0].rouleaux, 1); assert.equal(c.articles[0].largeur, 250);
  assert.equal(c.cartons, 1);
});

test("alertes : rien de colle, troncon plus court que le cordon, bande trop large", () => {
  assert.match(calculBande(z({ segs: [{ len: "100", dir: "E", on: false }] })).alertes[0], /Aucun tronçon/);
  assert.match(calculBande(z({ segs: [{ len: "30", dir: "E", on: true }] })).alertes[0], /plus court que le cordon/);
  assert.match(calculBande(z({ segs: [{ len: "1500", dir: "E", on: true }] })).alertes[0], /dépasse/);
  assert.equal(calculBande(z({ longueur: "" })), null);
});

test("commande : les longueurs d'une meme largeur s'additionnent avant d'arrondir aux rouleaux de 25 m", () => {
  const a = z({ longueur: "12" }), b = z({ longueur: "12", etage: "R+2" }), c3 = z({ longueur: "8,5", etage: "RDC" });
  const c = commande([a, b, c3]);
  assert.equal(c.articles[0].metres, 32.5); assert.equal(c.articles[0].rouleaux, 2);
  assert.equal(Math.round(c.cordonM), 65); assert.equal(c.cartouches, 9); // 65 / 7,5 = 8,67 -> 9
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
