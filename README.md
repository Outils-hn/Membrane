# Membrane

Membranes d'étanchéité (SikaMembran Outdoor plus, Outdoor, Universal) : on dessine la bande en tronçons, comme une tôle, on dit quels tronçons sont collés, et l'appli donne les cartouches de colle (SikaBond-444 Membrane Fix) et les rouleaux à commander, avec un bon de commande PDF classé par façade et par étage.

- **Dessin** : tronçons avec largeur (mm) et direction (8 directions), cliquables pour coller ou non. Le cordon de colle (45 mm par défaut) est au **bout libre** du tronçon : début du premier tronçon, fin du dernier, centré pour un tronçon du milieu.
- **Largeur du rouleau** : standard (la plus petite largeur du produit qui couvre la bande) ou coupée sur mesure par le fournisseur (largeur exacte de la bande).
- **Colle** : 1 cartouche de 600 ml = 7,5 m de cordon (fiche Sika : 7,5 à 10 m, cas le plus défavorable) ; cartons de 20.
- **Rouleaux** : 25 m, longueurs additionnées par produit et par largeur, arrondies au rouleau supérieur, sans chute ni recouvrement.
- **Commande** : gardée dans le navigateur (pas de compte, pas de base), PDF sans nom de personne, copie pour Excel, préparation du mail.

Aucune dépendance à installer pour l'appli : `index.html` + `js/` + `vendor/` (jsPDF et police IBM Plex Sans, livrés avec l'appli).

## Développement

```sh
npm test                      # calculs (node --test)
python3 -m http.server 8090   # puis node e2e/checkup.mjs captures (Playwright)
```
