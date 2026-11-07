// Check-up automatique de Membrane dans un vrai navigateur (donnees du navigateur vierges).
// Resultat : checkup.txt (OK / ECHEC) + captures d'ecran.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";

const BASE = process.env.APP_URL ?? "http://127.0.0.1:8090/";
const OUT = process.argv[2] ?? "captures";
mkdirSync(OUT, { recursive: true });
const lignes = [];
const verif = (nom, ok, detail = "") => lignes.push(`${ok ? "OK    " : "ECHEC "} ${nom}${detail ? ` (${detail})` : ""}`);
const step = async (nom, fn) => { try { await fn(); } catch (e) { verif(nom, false, e.message.split("\n")[0].slice(0, 180)); } };
const browser = await chromium.launch();

async function ouvrir({ largeur = 1440, hauteur = 900, sombre = false, acceptDownloads = false } = {}) {
  const c = await browser.newContext({ viewport: { width: largeur, height: hauteur }, acceptDownloads, permissions: ["clipboard-read", "clipboard-write"] });
  await c.addInitScript((d) => { if (d) localStorage.setItem("outils-theme", "dark"); }, sombre);
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
  verif("2 cordons de 12 m : 4 cartouches", (await txt(page, "#rCart")) === "4", await txt(page, "#rCart"));
  verif("Un rouleau", (await txt(page, "#rRoul")) === "1");
  verif("Explication du calcul", /Bande dépliée : 220 mm.*2 cordons × 12,0 m = 24,0 m.*7,5 m par cartouche/.test(await txt(page, "#rWhy")), await txt(page, "#rWhy"));
  verif("Dessin : 3 troncons cliquables, 2 cordons de colle", (await page.locator("#dessin .hit").count()) === 3 && (await page.locator("#dessin .glue").count()) === 2);
  verif("Les produits sont proposes (3)", (await page.locator("#produit option").count()) === 3);
  verif("Pas de commande tant qu'on n'a rien ajoute", await page.locator("#cmd").evaluate((el) => el.classList.contains("hidden")));
  await page.screenshot({ path: `${OUT}/01-depart.png`, fullPage: true });
  await c.close();
});

await step("Dessin : toucher un troncon, ajouter, supprimer, direction", async () => {
  const { c, page } = await ouvrir();
  await page.locator("#dessin .hit").nth(1).dispatchEvent("click");
  verif("Toucher le pont le colle : 3 cordons, 36 m, 5 cartouches", (await page.locator("#dessin .glue").count()) === 3 && (await txt(page, "#rCart")) === "5", `${await page.locator("#dessin .glue").count()} / ${await txt(page, "#rCart")}`);
  verif("Le bouton du troncon passe a « Collé »", /Collé/.test(await txt(page, "#segs .row:nth-child(2) .tg")));
  await page.locator("#segs .row:nth-child(2) .tg").click();
  verif("Le bouton le remet en « Libre »", (await page.locator("#dessin .glue").count()) === 2);
  await page.click("#addSeg");
  verif("Un 4e troncon apparait", (await page.locator("#segs .row").count()) === 4);
  await page.locator("#segs .row:nth-child(4) input").fill("30");
  verif("Largeur depliee 250 : toujours un rouleau de 250", /250 mm/.test(await txt(page, "#rRoulL")), await txt(page, "#rRoulL"));
  await page.locator("#segs .row:nth-child(4) [data-f='del']").click();
  verif("Supprimer revient a 3 troncons", (await page.locator("#segs .row").count()) === 3);
  await page.locator("#segs .row:nth-child(3) select").selectOption("NE");
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
  await page.selectOption("#produit", "uni");
  verif("Universal : meme largeur de 200 mm", /200 mm/.test(await txt(page, "#rRoulL")));
  await page.locator("#segs .row:nth-child(1) input").fill("320");
  verif("Universal 320+25 = 345 mm : rouleau de 350 mm", /350 mm/.test(await txt(page, "#rRoulL")), await txt(page, "#rRoulL"));
  await page.selectOption("#produit", "outplus");
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

await step("Commande : ajouter, classer, modifier, supprimer, totaux", async () => {
  const { c, page } = await ouvrir();
  const ajouter = async (facade, etage, plan, longueur) => {
    await page.fill("#facade", facade); await page.fill("#etage", etage); await page.fill("#plan", plan); await page.fill("#longueur", longueur);
    await page.click("#ajouter");
  };
  await ajouter("Nord", "R+2", "101", "12");
  verif("La commande apparait apres le premier ajout", !(await page.locator("#cmd").evaluate((el) => el.classList.contains("hidden"))));
  verif("Apres l'ajout, la bande repart d'un dessin neuf en gardant facade et etage", (await page.inputValue("#facade")) === "Nord" && (await page.inputValue("#etage")) === "R+2" && (await page.inputValue("#plan")) === "");
  await ajouter("Est", "RDC", "102", "8,5");
  await ajouter("Nord", "R+1", "101", "12");
  const facades = await page.locator("#cmdLignes .fh").allInnerTexts();
  verif("Facades classees (Est avant Nord)", facades.join("|") === "Façade Est|Façade Nord", facades.join("|"));
  const etages = await page.locator("#cmdLignes table:nth-of-type(1) tbody tr td:first-child").allInnerTexts();
  const nord = await page.locator("#cmdLignes .tscroll").nth(1).locator("tbody tr td:first-child").allInnerTexts();
  verif("Etages classes (R+1 avant R+2)", nord.join("|") === "R+1|R+2", nord.join("|"));
  const total = await txt(page, "#cmdTotal");
  verif("Total : 2 rouleaux de 250 mm (32,5 m)", /Outdoor plus, 250 mm, rouleau de 25 m 2 32,5 m de bande/.test(total), total);
  verif("Total colle : 9 cartouches (65 m)", /SikaBond-444 Membrane Fix, 600 ml 9 65,0 m de cordon \(1 carton de 20\)/.test(total), total);
  await page.locator("#cmdLignes button[data-a='edit']").first().click();
  verif("Modifier recharge la ligne dans l'editeur", (await page.inputValue("#facade")) === "Est" && (await txt(page, "#ajouter")) === "Mettre à jour la ligne");
  await page.fill("#longueur", "26");
  await page.click("#ajouter");
  verif("Mise a jour : 26 m + 12 m + 12 m = 50 m, 2 rouleaux", /Outdoor plus, 250 mm, rouleau de 25 m 2 50,0 m de bande/.test(await txt(page, "#cmdTotal")), await txt(page, "#cmdTotal"));
  await page.locator("#cmdLignes button[data-a='del']").first().click();
  verif("Supprimer enleve une ligne", (await page.locator("#cmdLignes tbody tr").count()) === 2);
  await page.screenshot({ path: `${OUT}/03-commande.png`, fullPage: true });
  await page.reload({ waitUntil: "load" });
  verif("La commande est retrouvee apres rechargement", (await page.locator("#cmdLignes tbody tr").count()) === 2);
  await page.click("#viderBtn");
  verif("Vider demande une confirmation", (await page.locator("#cmdLignes tbody tr").count()) === 2);
  await page.click("#viderBtn");
  verif("Deuxieme clic : commande videe", await page.locator("#cmd").evaluate((el) => el.classList.contains("hidden")));
  await c.close();
});

await step("Exports : Excel et PDF", async () => {
  const { c, page } = await ouvrir({ acceptDownloads: true });
  await page.fill("#facade", "Nord"); await page.fill("#etage", "R+1"); await page.fill("#plan", "101");
  await page.click("#ajouter");
  await page.click("#xlsBtn");
  await page.waitForFunction(() => document.getElementById("toast").textContent.includes("Copié"), null, { timeout: 4000 });
  const presse = await page.evaluate(() => navigator.clipboard.readText());
  verif("Copie Excel : lignes separees par des tabulations", /Façade\tÉtage\tPlan/.test(presse) && /Nord\tR\+1\t101\tSikaMembran Outdoor plus\t250\t12,0\t2\t24,0/.test(presse), presse.slice(0, 160).replace(/\t/g, "→").replace(/\n/g, "⏎"));
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
  verif("Pied de page : version 1.0", /Membrane v1\.0/.test(await txt(page, "footer")), await txt(page, "footer"));
  await page.click("#appsMenu summary");
  const menu = await txt(page, "#appsList");
  verif("Le menu liste Membrane et les autres applis", /Membrane Étanchéité ✓/.test(menu) && /Joint Dilatation et joints/.test(menu), menu.slice(0, 200));
  verif("Dix applis et l'Accueil dans le menu", (await page.locator("#appsList a").count()) === 11);
  await c.close();
});

await browser.close();
writeFileSync(`${OUT}/checkup.txt`, lignes.join("\n") + "\n");
console.log(lignes.join("\n"));
