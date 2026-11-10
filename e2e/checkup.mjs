// Check-up automatique de Membrane dans un vrai navigateur (donnees du navigateur vierges).
// Resultat : checkup.txt (OK / ECHEC) + captures d'ecran.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { PRODUITS_DEFAUT } from "../js/core.js";

const BASE = process.env.APP_URL ?? "http://127.0.0.1:8090/";
const OUT = process.argv[2] ?? "captures";
mkdirSync(OUT, { recursive: true });
const lignes = [];
const verif = (nom, ok, detail = "") => lignes.push(`${ok ? "OK    " : "ECHEC "} ${nom}${detail ? ` (${detail})` : ""}`);
const choisir = async (page, box, k) => { await page.locator(`${box} .sel-btn`).click(); await page.locator(`${box} .sel-pop button[data-k="${k}"]`).click(); };
const step = async (nom, fn) => { try { await fn(); } catch (e) { verif(nom, false, e.message.split("\n")[0].slice(0, 180)); } };

// Faux serveur de l'equipe (Supabase d'Index) : catalogue commun, envoi, retrait, fiches Index, connexion
const FICHES = [{ id: "f1", name: "SikaMembran Outdoor plus : fiche technique", supplier: "Sika", category: "Membranes" }, { id: "f2", name: "Isover Vario Xtra : fiche technique", supplier: "Isover", category: "Membranes" }];
let equipe = {};
const initEquipe = () => { equipe = Object.fromEntries(Object.entries(PRODUITS_DEFAUT).map(([id, p]) => [id, { id, data: { ...p, id }, deleted_at: null }])); };
initEquipe();
const SB = "dtxgvwaqjmmffiiohika.supabase.co";
async function brancherEquipe(c) {
  await c.route(`https://${SB}/**`, async (route) => {
    const req = route.request(), url = req.url(), json = (o, s = 200) => route.fulfill({ status: s, contentType: "application/json", body: JSON.stringify(o) });
    const connecte = !/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.eyJpc3MiOiJzdXBhYmFzZSIs/.test(req.headers().authorization ?? "");
    if (url.includes("/auth/v1/token")) return json({ access_token: "tok-hugo", refresh_token: "ref", expires_in: 3600, user: { id: "u1", email: "hugo@test.fr" } });
    if (url.includes("/rest/v1/membrane_catalogue")) return json(Object.values(equipe));
    if (url.includes("/rest/v1/products")) return json(FICHES);
    if (url.includes("/rpc/membrane_save_item")) {
      if (!connecte) return json({ ok: false, error: "Connectez-vous avec votre compte Index pour modifier." });
      const p = JSON.parse(req.postData()).p; equipe[p.id] = { id: p.id, data: p, deleted_at: null }; return json({ ok: true });
    }
    if (url.includes("/rpc/membrane_delete_item")) {
      if (!connecte) return json({ ok: false, error: "Connectez-vous avec votre compte Index pour modifier." });
      const id = JSON.parse(req.postData()).p_id; if (equipe[id]) equipe[id].deleted_at = "2026-11-07"; return json({ ok: true });
    }
    return route.abort();
  });
}
const browser = await chromium.launch();

async function ouvrir({ largeur = 1440, hauteur = 900, sombre = false, acceptDownloads = false } = {}) {
  const c = await browser.newContext({ viewport: { width: largeur, height: hauteur }, acceptDownloads, permissions: ["clipboard-read", "clipboard-write"] });
  await c.addInitScript((d) => { if (d) localStorage.setItem("outils-theme", "dark"); }, sombre);
  await brancherEquipe(c);
  const page = await c.newPage();
  page.on("pageerror", (e) => verif("Aucune erreur JavaScript", false, e.message.slice(0, 150)));
  await page.goto(BASE, { waitUntil: "load" });
  await page.waitForTimeout(300);
  return { c, page };
}
const txt = (page, sel) => page.locator(sel).innerText().then((t) => t.replace(/\s+/g, " ").trim());
const pasDebordement = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

await step("Ecran de depart : bande en Z de 12 m en Outdoor plus", async () => {
  const { c, page } = await ouvrir();
  verif("Titre Membrane", (await page.title()) === "Membrane");
  verif("Trois troncons de depart", (await page.locator("#segs .row").count()) === 3);
  verif("Bande depliee 220 mm : rouleau de 250 mm", /^rouleau de 250 mm$/.test(await txt(page, "#rRoulL")), await txt(page, "#rRoulL"));
  verif("2 cordons de 12,05 m (recouvrement 5 cm) = 24,1 m : 3 cartouches de 10 m", (await txt(page, "#rCart")) === "3", await txt(page, "#rCart"));
  verif("Un rouleau", (await txt(page, "#rRoul")) === "1");
  verif("Explication du calcul", /Bande dépliée : 220 mm.*2 cordons × 12,05 m = 24,1 m.*10 m par cartouche/.test(await txt(page, "#rWhy")), await txt(page, "#rWhy"));
  verif("Dessin : 3 troncons cliquables, 2 cordons de colle", (await page.locator("#dessin .hit").count()) === 3 && (await page.locator("#dessin .glue").count()) === 2);
  await page.locator("#produitSel .sel-btn").click();
  verif("Les produits sont proposes (6), avec leur role", (await page.locator("#produitSel .sel-pop button").count()) === 6 && /pare-pluie/.test(await txt(page, "#produitSel .sel-pop")), await txt(page, "#produitSel .sel-pop"));
  await page.keyboard.press("Escape");
  verif("Echap ferme la liste", await page.locator("#produitSel .sel-pop").evaluate((el) => el.classList.contains("hidden")));
  await choisir(page, "#produitSel", "unisb");
  verif("Universal SB : sd en petit et « autocollante : pas de colle »", /sd ≈ 60 m/.test(await txt(page, "#produitFiche")) && /autocollante/.test(await txt(page, "#produitFiche")), await txt(page, "#produitFiche"));
  verif("Universal SB (une face autocollante) : 1 cordon de moins (1 seul cordon dessine, 2 cartouches)", (await txt(page, "#rCart")) === "2" && (await page.locator("#dessin .glue").count()) === 1 && /Une face autocollante : un cordon de colle en moins\. Colle : 1 cordon/.test(await txt(page, "#rWhy")), `${await txt(page, "#rCart")} / ${await txt(page, "#rWhy")}`);
  verif("Universal SB : le tronçon tenu par l'autocollant est en pointillé bleu, bouton « Collé · autocollant »", (await page.locator("#dessin .auto").count()) === 1 && /Collé · autocollant/.test(await txt(page, "#segs")), `${await page.locator("#dessin .auto").count()} / ${await txt(page, "#segs")}`);
  await choisir(page, "#produitSel", "acfsb");
  verif("Active FSB+ (toute la surface autocollante) : aucune colle, sd en plage", (await txt(page, "#rCart")) === "0" && (await page.locator("#dessin .glue").count()) === 0 && /sd ≈ 0,5 à 20 m/.test(await txt(page, "#produitFiche")) && /pas de colle/.test(await txt(page, "#rWhy")), `${await txt(page, "#rCart")} / ${await txt(page, "#produitFiche")}`);
  verif("Active FSB+ : tous les tronçons collés sont en pointillé bleu", (await page.locator("#dessin .auto").count()) === 2, `${await page.locator("#dessin .auto").count()}`);
  await choisir(page, "#produitSel", "acplus");
  verif("Active+ (rien d'autocollant) : colle comptee comme Outdoor plus, sd en plage", (await txt(page, "#rCart")) === "3" && /0,5 à 20/.test(await txt(page, "#produitFiche")), `${await txt(page, "#rCart")} / ${await txt(page, "#produitFiche")}`);
  await choisir(page, "#produitSel", "outplus");
  verif("Retour a Outdoor plus : sd 4 m, colle de nouveau comptee", /sd ≈ 4 m/.test(await txt(page, "#produitFiche")) && (await txt(page, "#rCart")) === "3", await txt(page, "#produitFiche"));
  verif("Pas de lignes tant qu'on n'a rien ajoute (le message d'attente est visible)", await page.locator("#cmdPlein").evaluate((el) => el.classList.contains("hidden")) && await page.locator("#cmdVide").isVisible());
  await page.screenshot({ path: `${OUT}/01-depart.png`, fullPage: true });
  await c.close();
});

await step("Dessin : toucher un troncon, ajouter, supprimer, direction", async () => {
  const { c, page } = await ouvrir();
  await page.locator("#dessin .hit").nth(1).dispatchEvent("click");
  verif("Toucher le pont le colle : 3 cordons, 36,15 m, 4 cartouches", (await page.locator("#dessin .glue").count()) === 3 && (await txt(page, "#rCart")) === "4", `${await page.locator("#dessin .glue").count()} / ${await txt(page, "#rCart")}`);
  verif("Le bouton du troncon passe a « Collé »", /Collé/.test(await txt(page, "#segs .row:nth-child(2) .tg")));
  await page.locator("#segs .row:nth-child(2) .tg").click();
  verif("Le bouton le remet en « Libre »", (await page.locator("#dessin .glue").count()) === 2);
  await page.click("#addSeg");
  verif("Un 4e troncon apparait", (await page.locator("#segs .row").count()) === 4);
  await page.locator("#segs .row:nth-child(4) input").fill("30");
  verif("Largeur depliee 250 : toujours un rouleau de 250", /250 mm/.test(await txt(page, "#rRoulL")), await txt(page, "#rRoulL"));
  await page.locator("#segs .row:nth-child(4) [data-f='del']").click();
  verif("Supprimer revient a 3 troncons", (await page.locator("#segs .row").count()) === 3);
  await choisir(page, "#segs .row:nth-child(3) .sel", "NE");
  verif("Direction choisie : affichee sur le bouton", /haut-droite/.test(await txt(page, "#segs .row:nth-child(3) .sel-btn")), await txt(page, "#segs .row:nth-child(3) .sel-btn"));
  verif("Changer la direction redessine sans erreur", (await page.locator("#dessin svg").count()) === 1);
  verif("Impossible de supprimer le dernier troncon", await (async () => { await page.locator("#segs .row:nth-child(3) [data-f='del']").click(); await page.locator("#segs .row:nth-child(2) [data-f='del']").click(); await page.locator("#segs .row:nth-child(1) [data-f='del']").click(); return (await page.locator("#segs .row").count()) === 1; })());
  await c.close();
});

await step("Largeurs : standard, sur mesure, produits, alertes", async () => {
  const { c, page } = await ouvrir();
  await page.locator("#segs .row:nth-child(1) input").fill("150");
  await page.locator("#segs .row:nth-child(2) input").fill("10");
  await page.locator("#segs .row:nth-child(3) input").fill("15");
  verif("Bande de 175 mm en standard : rouleau de 200 mm", /200 mm/.test(await txt(page, "#rRoulL")), await txt(page, "#rRoulL"));
  await page.click("#mesure [data-k='mes']");
  verif("Sur mesure : rouleau de 175 mm", /175 mm \(sur mesure\)/.test(await txt(page, "#rRoulL")), await txt(page, "#rRoulL"));
  verif("L'explication parle de coupe a 175 mm", /coupée à 175 mm/.test(await txt(page, "#rWhy")), await txt(page, "#rWhy"));
  await page.click("#mesure [data-k='std']");
  await choisir(page, "#produitSel", "uni");
  verif("Universal : meme largeur de 200 mm", /200 mm/.test(await txt(page, "#rRoulL")));
  await page.locator("#segs .row:nth-child(1) input").fill("320");
  verif("Universal 320+25 = 345 mm : rouleau de 350 mm", /350 mm/.test(await txt(page, "#rRoulL")), await txt(page, "#rRoulL"));
  await choisir(page, "#produitSel", "outplus");
  verif("Outdoor plus 345 mm : 1400 sur demande", /1400 mm \(sur demande\)/.test(await txt(page, "#rRoulL")), await txt(page, "#rRoulL"));
  await page.locator("#segs .row:nth-child(1) input").fill("1500");
  verif("Bande trop large : alerte", /dépasse le plus grand rouleau/.test(await txt(page, "#rAlertes")), await txt(page, "#rAlertes"));
  await page.locator("#segs .row:nth-child(1) input").fill("20");
  verif("Troncon colle plus court que le cordon : alerte", /plus court que le cordon/.test(await txt(page, "#rAlertes")), await txt(page, "#rAlertes"));
  await page.fill("#longueur", "");
  verif("Longueur vide : pas de resultat, ajout impossible", (await txt(page, "#rCart")) === "—" && (await page.locator("#ajouter").isDisabled()));
  await page.fill("#longueur", "30");
  await page.screenshot({ path: `${OUT}/02-largeurs.png`, fullPage: true });
  verif("30 m : 2 rouleaux", (await txt(page, "#rRoul")) === "2", await txt(page, "#rRoul"));
  await c.close();
});

await step("Reglages : colle 7,5 m, marge, recouvrement", async () => {
  const { c, page } = await ouvrir();
  await page.click("#reglages summary");
  verif("Reglages par defaut : 10 m, marge 0 %, recouvrement 5 cm", (await page.inputValue("#cartouche")) === "10" && (await page.inputValue("#marge")) === "0" && (await page.inputValue("#recouvrement")) === "5");
  verif("Le choix 10 m est indique comme courant", /10 m\s*courant/.test(await txt(page, "#cartSeg")) && (await page.locator("#cartSeg button.on").count()) === 1, await txt(page, "#cartSeg"));
  await page.click("#cartSeg button[data-m='7.5']");
  verif("Cas defavorable 7,5 m : 4 cartouches", (await txt(page, "#rCart")) === "4" && (await page.inputValue("#cartouche")) === "7,5", await txt(page, "#rCart"));
  await page.click("#cartSeg button[data-m='10']");
  await page.fill("#marge", "10");
  verif("Marge 10 % : explication mise a jour", /marge 10 %.*13,25 m/.test(await txt(page, "#rWhy")), await txt(page, "#rWhy"));
  await page.fill("#recouvrement", "0"); await page.fill("#marge", "0");
  verif("Sans marge ni recouvrement : 12,00 m, 24,0 m de cordon", /= 12,00 m.*24,0 m/.test(await txt(page, "#rWhy")), await txt(page, "#rWhy"));
  await page.reload();
  verif("Les reglages sont gardes apres rechargement", (await page.inputValue("#recouvrement")) === "0");
  await c.close();
});

await step("Bibliotheque : largeurs, produit d'un autre fournisseur, fiche Index, partage avec l'equipe", async () => {
  initEquipe();
  const { c, page } = await ouvrir();
  verif("Plus de phrase d'accroche dans le bandeau", (await page.locator(".tagline").count()) === 0);
  verif("Sans compte : « Lecture seule »", (await txt(page, "#etatCompte")) === "Lecture seule");
  await page.click("#voirBiblio");
  verif("Le lien ouvre la bibliotheque", await page.locator("#biblio").evaluate((d) => d.open));
  verif("6 produits Sika, partages avec l'equipe, avec leurs largeurs", (await page.locator("#biblioListe .prod").count()) === 6 && (await page.locator("#biblioListe .st.ok").count()) === 6 && /1400\*/.test(await txt(page, "#biblioListe")) && /rouleaux de 25 m/.test(await txt(page, "#biblioListe")), await txt(page, "#biblioListe"));
  await page.waitForFunction(() => /à jour/.test(document.getElementById("biblioEtat").textContent), null, { timeout: 4000 }).catch(() => {});
  verif("Etat du catalogue commun : a jour", /Catalogue commun à jour/.test(await txt(page, "#biblioEtat")), await txt(page, "#biblioEtat"));
  await page.click("#biblioNouveau");
  await page.click("#biblioForm button[type=submit]");
  verif("Nom obligatoire", /nom au produit/.test(await txt(page, "#biblioErr")), await txt(page, "#biblioErr"));
  await page.fill("#bNom", "Isover Vario Xtra"); await page.fill("#bFour", "Saint-Gobain"); await page.fill("#bRole", "pare-vapeur"); await page.fill("#bLong", "50"); await page.fill("#bLarg", "100, 150, abc");
  await page.click("#biblioForm button[type=submit]");
  verif("Largeur illisible refusee", /nombres en mm/.test(await txt(page, "#biblioErr")), await txt(page, "#biblioErr"));
  await page.fill("#bLarg", "1000, 1500"); await page.fill("#bDem", "2000");
  await page.click("#bFiche [data-fiche=pick]");
  await page.fill("#ficheSearch", "isover");
  await page.locator("#ficheResults [data-fiche-id]").first().waitFor({ timeout: 5000 }).catch(() => {});
  verif("Recherche d'une fiche dans Index", (await page.locator("#ficheResults [data-fiche-id]").count()) === 1, await txt(page, "#ficheResults"));
  await page.click("#ficheResults [data-fiche-id]");
  verif("Fiche Index liee dans le formulaire", /Isover Vario Xtra : fiche technique/.test(await txt(page, "#bFiche")), await txt(page, "#bFiche"));
  await page.click("#biblioForm button[type=submit]");
  verif("Produit ajoute : sur ce poste seulement, avec le lien vers sa fiche", (await page.locator("#biblioListe .prod").count()) === 7 && /Sur ce poste seulement/.test(await txt(page, "#biblioListe")) && (await page.locator('#biblioListe a.fiche-link[href$="?fiche=f2"]').count()) === 1, await txt(page, "#biblioListe"));
  await page.locator("#produitSel .sel-btn").click();
  verif("Il apparait dans la liste du produit utilise", (await page.locator("#produitSel .sel-pop button").count()) === 7);
  await page.locator('#produitSel .sel-pop button:has-text("Isover")').click();
  verif("La fiche technique est proposee sous le produit", (await page.locator('#produitFiche a[href$="?fiche=f2"]').count()) === 1, await txt(page, "#produitFiche"));
  await page.locator("#segs .row:nth-child(1) input").fill("900"); await page.locator("#segs .row:nth-child(2) input").fill("0"); await page.locator("#segs .row:nth-child(3) input").fill("0");
  await page.fill("#longueur", "30");
  verif("Largeur 1000 en stock, un seul rouleau de 50 m", /1 rouleau de 1000 mm/.test(await txt(page, "#rRoul") + " " + await txt(page, "#rRoulL")), await txt(page, "#rRoul") + " " + await txt(page, "#rRoulL"));
  await page.click("#ajouter");
  verif("La commande indique le fournisseur et le rouleau de 50 m", /Isover Vario Xtra \(Saint-Gobain\), 1000 mm, rouleau de 50 m/.test(await txt(page, "#cmdTotal")), await txt(page, "#cmdTotal"));
  // Envoi a l'equipe : demande la connexion
  await page.locator('#biblioListe .prod:has-text("Isover") button[data-a="send"]').click();
  verif("Envoyer sans compte : la fenetre de connexion s'ouvre", await page.locator("#dConnexion").evaluate((d) => d.open));
  await page.click("#cOk");
  verif("Connexion : champs obligatoires", /email et le mot de passe/.test(await txt(page, "#cErreur")), await txt(page, "#cErreur"));
  await page.fill("#cEmail", "hugo@test.fr"); await page.fill("#cMdp", "secret");
  await page.click("#cOk"); await page.waitForTimeout(500);
  verif("Apres connexion : l'email s'affiche et le produit est envoye", (await txt(page, "#etatCompte")) === "hugo@test.fr" && Object.keys(equipe).length === 8 && /Isover Vario Xtra/.test(Object.values(equipe).map((e) => e.data.nom).join()), `${await txt(page, "#etatCompte")} / ${Object.keys(equipe).length}`);
  verif("Le produit envoye garde sa fiche et son rouleau de 50 m", Object.values(equipe).some((e) => e.data.indexFiche?.id === "f2" && e.data.rouleauM === 50));
  verif("Le produit est maintenant « partage avec l'equipe »", (await page.locator("#biblioListe .st.ok").count()) === 7, await txt(page, "#biblioListe"));
  // Un collegue (autre poste) recoit le produit
  const autre = await ouvrir();
  verif("Autre poste : le produit de l'equipe est la, partage, avec sa fiche", (await autre.page.locator('#produitSel .sel-btn').count()) === 1 && await (async () => { await autre.page.click("#voirBiblio"); return (await autre.page.locator("#biblioListe .prod").count()) === 7 && (await autre.page.locator('#biblioListe a.fiche-link[href$="?fiche=f2"]').count()) === 1; })());
  await autre.c.close();
  // Modifier un produit partage : « modifie ici », puis annuler mes modifications
  await page.locator('#biblioListe .prod:has(b:text-is("SikaMembran Universal")) button[data-a="edit"]').click();
  await page.fill("#bDem", ""); await page.click("#biblioForm button[type=submit]");
  const uni = await txt(page, '#biblioListe .prod:has(b:text-is("SikaMembran Universal"))');
  verif("Modifier un produit partage : « Modifié ici » et plus de 1400", /Modifié ici/.test(uni) && !/1400/.test(uni) && /Annuler mes modifications/.test(uni) && /Envoyer à l'équipe/.test(uni), uni);
  await page.locator('#biblioListe .prod:has(b:text-is("SikaMembran Universal")) button[data-a="revert"]').click();
  verif("Annuler mes modifications : version de l'equipe retablie", /1400\*/.test(await txt(page, '#biblioListe .prod:has(b:text-is("SikaMembran Universal"))')) && /Partagé avec l'équipe/.test(await txt(page, '#biblioListe .prod:has(b:text-is("SikaMembran Universal"))')));
  await page.reload(); await page.waitForTimeout(400); await page.click("#voirBiblio");
  verif("Apres rechargement : 7 produits, tous partages, connexion gardee", (await page.locator("#biblioListe .prod").count()) === 7 && (await page.locator("#biblioListe .st.ok").count()) === 7 && (await txt(page, "#etatCompte")) === "hugo@test.fr");
  const supp = page.locator('#biblioListe .prod:has-text("Isover") button[data-a="del"]');
  await supp.click();
  verif("Produit utilise dans la commande : suppression refusee", (await page.locator("#biblioListe .prod").count()) === 7 && /utilisé dans la commande/.test(await txt(page, "#toast")), await txt(page, "#toast"));
  await page.locator("#cmdLignes button[data-a='del']").first().click();
  verif("Produit partage : le bouton dit « Retirer pour l'equipe »", /Retirer pour l'équipe/.test(await txt(page, '#biblioListe .prod:has-text("Isover") .pa')));
  await supp.click(); await supp.click(); await page.waitForTimeout(300);
  verif("Retire pour l'equipe : disparait ici et chez l'equipe", (await page.locator("#biblioListe .prod").count()) === 6 && Object.values(equipe).some((e) => e.data.nom === "Isover Vario Xtra" && e.deleted_at), await txt(page, "#biblioListe"));
  // ---- Colles de la bibliotheque ----
  verif("Colle d'origine listee, partagee, marquee « utilisee »", (await page.locator("#biblioColles .prod").count()) === 1 && /SikaBond-444/.test(await txt(page, "#biblioColles")) && /Partagé avec l'équipe/.test(await txt(page, "#biblioColles")) && /utilisée pour la commande/.test(await txt(page, "#biblioColles")), await txt(page, "#biblioColles"));
  await page.click("#biblioNouvelleColle");
  await page.fill("#cNom", "Colle Test"); await page.fill("#cFour", "Autre"); await page.fill("#cMl", "310"); await page.fill("#cCarton", "12"); await page.fill("#cMetres", "5"); await page.fill("#cMin", "6"); await page.fill("#cCordon", "30");
  await page.click("#colleForm button[type=submit]");
  verif("Cas defavorable plus grand que le courant refuse", /plus petit/.test(await txt(page, "#colleErr")), await txt(page, "#colleErr"));
  await page.fill("#cMin", "4");
  await page.click("#cFiche [data-fiche=pick]"); await page.fill("#ficheSearch", "sikamembran");
  await page.locator("#ficheResults [data-fiche-id]").first().waitFor({ timeout: 5000 }).catch(() => {});
  await page.click("#ficheResults [data-fiche-id]");
  verif("Fiche Index liee dans le formulaire de la colle", /SikaMembran Outdoor plus : fiche technique/.test(await txt(page, "#cFiche")), await txt(page, "#cFiche"));
  await page.click("#colleForm button[type=submit]");
  verif("Colle : lien vers la fiche Index dans la bibliotheque", (await page.locator('#biblioColles a.fiche-link[href$="?fiche=f1"]').count()) === 1);
  verif("Colle ajoutee : listee, sur ce poste seulement, avec ses chiffres", (await page.locator("#biblioColles .prod").count()) === 2 && /Colle Test/.test(await txt(page, "#biblioColles")) && /Cartouche de 310 ml · couvre 5 m \(4 m au plus défavorable\) · cordon de 30 mm · 12 par carton/.test(await txt(page, "#biblioColles")) && (await page.locator("#biblioColles .st:not(.ok)").count()) === 1, await txt(page, "#biblioColles"));
  await page.locator("#reglages").evaluate((el) => { el.open = true; });
  await page.locator("#colleSel .sel-btn").click(); await page.locator('#colleSel .sel-pop button:has-text("Colle Test")').click();
  verif("Colle choisie : couverture et cordon repris, choix rapide 5 / 4", (await page.inputValue("#cartouche")) === "5" && (await page.inputValue("#cordon")) === "30" && (await page.locator("#cartSeg button").count()) === 2 && /utilisée pour la commande/.test(await txt(page, "#biblioColles .prod:has-text('Colle Test')")), `${await page.inputValue("#cartouche")} / ${await page.inputValue("#cordon")}`);
  verif("Colle choisie : lien vers sa fiche sous le choix", (await page.locator('#colleFiche a.fiche-link[href$="?fiche=f1"]').count()) === 1);
  verif("Le calcul donne le contenu de la nouvelle colle", /310 ml/.test(await txt(page, "#rWhy")), await txt(page, "#rWhy"));
  await page.locator('#biblioColles .prod:has-text("Colle Test") button[data-a="del"]').click();
  verif("Colle choisie : suppression refusee", (await page.locator("#biblioColles .prod").count()) === 2 && /choisie pour la commande/.test(await txt(page, "#toast")), await txt(page, "#toast"));
  await page.locator("#colleSel .sel-btn").click(); await page.locator('#colleSel .sel-pop button:has-text("SikaBond")').click();
  verif("Retour a la colle d'origine : 10 m, 45 mm", (await page.inputValue("#cartouche")) === "10" && (await page.inputValue("#cordon")) === "45" && (await page.locator("#cartSeg button").count()) === 2);
  await page.locator('#biblioColles .prod:has-text("Colle Test") button[data-a="del"]').click(); await page.locator('#biblioColles .prod:has-text("Colle Test") button[data-a="del"]').click();
  verif("Colle supprimee (confirmation en deux clics)", (await page.locator("#biblioColles .prod").count()) === 1);
  verif("Derniere colle : impossible de la supprimer", await (async () => { await page.locator('#biblioColles .prod button[data-a="del"]').click(); return (await page.locator("#biblioColles .prod").count()) === 1 && /au moins une colle/.test(await txt(page, "#toast")); })());
  await page.click("#compteBtn");
  verif("Se deconnecter : retour en lecture seule", (await txt(page, "#etatCompte")) === "Lecture seule");
  await page.screenshot({ path: `${OUT}/06-bibliotheque.png`, fullPage: true });
  await c.close();
});

await step("Commande : ajouter, classer, modifier, supprimer, totaux", async () => {
  const { c, page } = await ouvrir();
  const ajouter = async (facade, etage, plan, longueur) => {
    await page.fill("#facade", facade); await page.fill("#etage", etage); await page.fill("#plan", plan); await page.fill("#longueur", longueur);
    await page.click("#ajouter");
  };
  await ajouter("Nord", "R+2", "101", "12");
  verif("La commande apparait apres le premier ajout", !(await page.locator("#cmdPlein").evaluate((el) => el.classList.contains("hidden"))) && !(await page.locator("#cmdVide").isVisible()));
  verif("Apres l'ajout, la bande repart d'un dessin neuf en gardant facade et etage", (await page.inputValue("#facade")) === "Nord" && (await page.inputValue("#etage")) === "R+2" && (await page.inputValue("#plan")) === "");
  await ajouter("Est", "RDC", "102", "8,5");
  await ajouter("Nord", "R+1", "101", "12");
  const facades = await page.locator("#cmdLignes .fh").allInnerTexts();
  verif("Facades classees (Est avant Nord)", facades.join("|") === "Façade Est|Façade Nord", facades.join("|"));
  const etages = await page.locator("#cmdLignes table:nth-of-type(1) tbody tr td:first-child").allInnerTexts();
  const nord = await page.locator("#cmdLignes .tscroll").nth(1).locator("tbody tr td:first-child").allInnerTexts();
  verif("Etages classes (R+1 avant R+2)", nord.join("|") === "R+1|R+2", nord.join("|"));
  const total = await txt(page, "#cmdTotal");
  verif("Total : 2 rouleaux de 250 mm, recouvrement et chutes comptes", /Outdoor plus, 250 mm, rouleau de 25 m 2 32,5 m de bande \+ 0,15 m de recouvrement ; chutes : 17,3 m/.test(total), total);
  verif("Total colle : 7 cartouches (65,3 m a 10 m)", /SikaBond-444 Membrane Fix, 600 ml 7 65,3 m de cordon, à 10 m par cartouche \(1 carton de 20\)/.test(total), total);
  await page.locator("#cmdLignes button[data-a='edit']").first().click();
  verif("Modifier recharge la ligne dans l'editeur", (await page.inputValue("#facade")) === "Est" && (await txt(page, "#ajouter")) === "Mettre à jour la ligne");
  await page.fill("#longueur", "26");
  await page.click("#ajouter");
  verif("Mise a jour : 26 m + 12 m + 12 m, la piece de 1,1 m ne tient pas dans le reste : 3 rouleaux", /Outdoor plus, 250 mm, rouleau de 25 m 3 50,0 m de bande \+ 0,20 m de recouvrement/.test(await txt(page, "#cmdTotal")), await txt(page, "#cmdTotal"));
  await page.locator("#cmdLignes button[data-a='del']").first().click();
  verif("Supprimer enleve une ligne", (await page.locator("#cmdLignes tbody tr").count()) === 2);
  await page.screenshot({ path: `${OUT}/03-commande.png`, fullPage: true });
  await page.reload({ waitUntil: "load" });
  verif("La commande est retrouvee apres rechargement", (await page.locator("#cmdLignes tbody tr").count()) === 2);
  await page.click("#viderBtn");
  verif("Vider demande une confirmation", (await page.locator("#cmdLignes tbody tr").count()) === 2);
  await page.click("#viderBtn");
  verif("Deuxieme clic : commande videe", await page.locator("#cmdPlein").evaluate((el) => el.classList.contains("hidden")));
  await c.close();
});

await step("Exports : Excel et PDF", async () => {
  const { c, page } = await ouvrir({ acceptDownloads: true });
  await page.fill("#facade", "Nord"); await page.fill("#etage", "R+1"); await page.fill("#plan", "101");
  await page.click("#ajouter");
  await page.click("#xlsBtn");
  await page.waitForFunction(() => document.getElementById("toast").textContent.includes("Copié"), null, { timeout: 4000 });
  const presse = await page.evaluate(() => navigator.clipboard.readText());
  verif("Copie Excel : lignes separees par des tabulations", /Façade\tÉtage\tPlan/.test(presse) && /Nord\tR\+1\t101\tSikaMembran Outdoor plus\t250\t12,0\t12,05\t2\t24,1/.test(presse), presse.slice(0, 160).replace(/\t/g, "→").replace(/\n/g, "⏎"));
  const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 15000 }), page.click("#pdfBtn")]);
  verif("PDF telecharge, nom date", /^Commande membranes - \d{4}-\d{2}-\d{2}\.pdf$/.test(dl.suggestedFilename()), dl.suggestedFilename());
  const chemin = `${OUT}/bon-de-commande.pdf`;
  await dl.saveAs(chemin);
  verif("Le PDF n'est pas vide", existsSync(chemin));
  await c.close();
});

await step("Telephone et theme sombre", async () => {
  const tel = await ouvrir({ largeur: 390, hauteur: 844 });
  verif("Telephone : pas de debordement horizontal", await pasDebordement(tel.page));
  await tel.page.fill("#facade", "Nord"); await tel.page.click("#ajouter");
  verif("Telephone : pas de debordement avec la commande", await pasDebordement(tel.page));
  await tel.page.screenshot({ path: `${OUT}/04-telephone.png`, fullPage: true });
  await tel.c.close();
  const sombre = await ouvrir({ sombre: true });
  verif("Theme sombre applique", (await sombre.page.evaluate(() => document.documentElement.dataset.theme)) === "dark");
  await sombre.page.screenshot({ path: `${OUT}/05-sombre.png`, fullPage: true });
  await sombre.c.close();
});

await step("Pied de page et menu des applis", async () => {
  const { c, page } = await ouvrir();
  verif("Pied de page : version 1.21", /Membrane v1\.21/.test(await txt(page, "footer")), await txt(page, "footer"));
  await page.click("#aboutBtn"); verif("Clic sur la signature : fenetre « À propos » (nom, version)", await page.locator("#dApropos[open]").count() === 1 && /À propos/.test(await txt(page, "#dApropos")) && /Version /.test(await txt(page, "#dApropos")), await txt(page, "#dApropos")); await page.click("#daFermer"); verif("La fenetre se ferme", await page.locator("#dApropos[open]").count() === 0);
  await page.click("#appsMenu summary");
  const menu = await txt(page, "#appsList");
  verif("Le menu liste Membrane et les autres applis", /Membrane Étanchéité ✓/.test(menu) && /Joint Dilatation et joints/.test(menu), menu.slice(0, 200));
  verif("Dix applis et l'Accueil dans le menu", (await page.locator("#appsList a").count()) === 14);
  await c.close();
});

await browser.close();
writeFileSync(`${OUT}/checkup.txt`, lignes.join("\n") + "\n");
console.log(lignes.join("\n"));
