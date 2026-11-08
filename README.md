# Membrane

Membranes d'étanchéité (SikaMembran Outdoor plus, Universal) : on dessine la bande en tronçons, comme une tôle, on dit quels tronçons sont collés, et l'appli donne les cartouches de colle (SikaBond-444 Membrane Fix) et les rouleaux à commander, avec un bon de commande PDF classé par façade et par étage.

- **Dessin** : tronçons avec largeur (mm) et direction (8 directions), cliquables pour coller ou non. Le cordon de colle (45 mm par défaut) est au **bout libre** du tronçon : début du premier tronçon, fin du dernier, centré pour un tronçon du milieu.
- **Largeur du rouleau** : standard (la plus petite largeur du produit qui couvre la bande) ou coupée sur mesure par le fournisseur (largeur exacte de la bande).
- **Colle** : 1 cartouche de 600 ml couvre 10 m de cordon par défaut (fiche Sika : 7,5 à 10 m ; 7,5 m = cas défavorable, au choix dans les réglages et rappelé sur le bon de commande) ; cartons de 20.
- **Rouleaux** : 25 m. Chaque bande = longueur + marge (%, réglable, 0 par défaut) + recouvrement de 5 cm (réglable) ; une bande de plus de 25 m est coupée en pièces. Les pièces sont rangées dans les rouleaux (par produit et largeur) ; les chutes sont indiquées.
- **Commande** : gardée dans le navigateur (pas de compte, pas de base), PDF sans nom de personne, copie pour Excel, préparation du mail.

Aucune dépendance à installer pour l'appli : `index.html` + `js/` + `vendor/` (jsPDF et police IBM Plex Sans, livrés avec l'appli).

## Développement

```sh
npm test                      # calculs (node --test)
python3 -m http.server 8090   # puis node e2e/checkup.mjs captures (Playwright)
```

- **Bibliothèque de produits** : les 3 produits Sika sont fournis ; on peut en ajouter d'autres (nom, fournisseur, rôle, largeurs en stock et sur demande, longueur du rouleau en m, lien vers la fiche Index). Copie gardée dans le navigateur (`membrane.produits`) et **catalogue commun** dans la base d'Index (table `membrane_catalogue`, script `supabase/membrane-catalogue.sql` à coller une fois dans Supabase) : lecture libre, envoi/retrait avec un compte Index valide (mêmes fonctions de contrôle que Strate). Un produit utilisé dans la commande ne peut pas être supprimé.
