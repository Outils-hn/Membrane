# Journal des versions — Membrane

Chaque version qui change quelque chose de visible pour l'équipe a une puce « Nouveauté : … », en langage courant : c'est la seule phrase affichée sur la page « Nouveautés » de l'Accueil.

## 1.25 — 10 novembre 2026

- Nouveauté : chaque appli a maintenant son logo comme icône d'onglet et d'écran d'accueil, le même que sur l'Accueil.

## 1.24 — 10 novembre 2026

- Nouveauté : un bouton « Rechercher » (Ctrl K) en haut à droite, comme sur l'Accueil, dans toutes les applis. Il remplace la ligne « Rechercher » du menu des applis.

## 1.23 — 10 novembre 2026

- Nouveauté : le menu des applis suit l'ordre d'usage : Check, Index, Access, puis Trame, Linear, Format, puis les autres.

## 1.22 — 10 novembre 2026

- Retrait de la ligne « Noter » du menu des applis (menu plus léger). Les boutons « Noter dans Check » des fiches, fournisseurs et éléments restent.

## 1.21 — 10 novembre 2026

- Nouveauté : la touche ? (ou « Raccourcis » en bas du menu des applis) affiche les raccourcis clavier de l'appli. Les icônes Rechercher et Noter du menu de Joint, Membrane et Strate sont maintenant comme dans les autres applis.

## 1.20 — 10 novembre 2026

- Nouveauté : le menu des applis propose « Noter » : ouvre Check dans un nouvel onglet avec une note déjà commencée par le numéro du chantier choisi dans l'Accueil.

## 1.19 — 10 novembre 2026

- Nouveauté : Ctrl+K ouvre la recherche de l'Accueil (applis, chantiers, fiches Index, notes Check) dans un nouvel onglet ; le menu des applis propose aussi « Rechercher ».

## 1.18 — 9 novembre 2026

- Nouveauté : au téléphone, les tableaux de résultats tiennent mieux à l'écran (boutons empilés, pourcentages sur une ligne).

## 1.17 — 9 novembre 2026

- Nouveauté : dans le bandeau, l'adresse connectée est maintenant entourée de la couleur de Membrane, comme dans les autres applis.

## 1.16 — 9 novembre 2026

- Nouveauté : Membrane s'installe sur le téléphone (menu du navigateur, « Ajouter à l'écran d'accueil ») et s'ouvre aussi sans réseau ; seule la connexion et le catalogue commun attendent le réseau.

## 1.15 — 9 novembre 2026

- Nouveauté : au téléphone, les boutons et menus font 44 px de haut et les liens du pied de page se touchent plus facilement.

## 1.14 — 9 novembre 2026

- Nouveauté : les nombres se lisent et s'affichent partout de la même façon : « 1.250,5 » est compris, un nombre ambigu (« 12..5 », « 1e3 ») est refusé, les milliers s'écrivent à la suisse (1'250) et jamais de « -0 ». Les PDF et la commande suivent la même règle.

## 1.13 — 9 novembre 2026

- Nouveauté : une faute de frappe dans le recouvrement (25 au lieu de 2,5 cm…) ou la longueur ne fige plus l'écran : les valeurs sont limitées (recouvrement 100 cm, marge 100 %, bande 500 m) et un message l'explique.

## 1.12 — 8 novembre 2026

- Nouveauté : pour une membrane autocollante (ou à une face autocollante), le tronçon tenu par l'adhésif est maintenant dessiné en pointillé bleu et son bouton affiche « Collé · autocollant » : plus de confusion avec un tronçon sans colle.

## 1.11 — 8 novembre 2026

- Technique : les données sont passées sur le nouveau serveur Supabase en Suisse (adresse, clé et mémoire de connexion mises à jour). Il faut se reconnecter une fois.

## 1.10 — 8 novembre 2026

- Nouveauté : les SikaMembran Active+, Active SB+ et Active FSB+ sont dans la bibliothèque, avec leur valeur sd (de 0,5 à 20 m). Une membrane à une face autocollante (Active SB+, et Universal SB corrigée) compte un cordon de colle de moins ; une membrane autocollante partout (Active FSB+) n'en compte aucun. Les colles peuvent aussi être liées à une fiche Index. (À activer une fois : script `supabase/membrane-active.sql`.)

## 1.9 — 8 novembre 2026

- Nouveauté : la colle est dans la bibliothèque, comme les membranes : nom, fournisseur, contenu d'une cartouche, mètres couverts par cartouche, cartouches par carton, largeur du cordon. On choisit la colle dans les réglages, et on peut en ajouter d'autres, d'un autre fournisseur, et les partager avec l'équipe. (Pour partager la colle d'origine : script `supabase/membrane-colle.sql`.)

## 1.8 — 8 novembre 2026

- Nouveauté : la SikaMembran Universal SB (autocollante) est dans la bibliothèque : choisie, elle ne compte aucune colle. La valeur sd (résistance à la vapeur d'eau) s'affiche en petit sous le produit et dans la bibliothèque, et chaque produit peut avoir la sienne. (À activer une fois : script `supabase/membrane-universal-sb.sql`.)

## 1.7 — 8 novembre 2026

- Nouveauté : un clic sur « Conçu par Hugo N. » en bas de page ouvre la même fenêtre « À propos » que dans les autres applis (nom, version, description, dernière mise à jour).

## 1.6 — 8 novembre 2026

- Nouveauté : le bon de commande PDF tient sur une ligne par article (plus de « m » qui passe à la ligne) et son logo est le même que dans l'appli.

## 1.5 — 7 novembre 2026

- Nouveauté : la bibliothèque de produits de Membrane est commune à l'équipe, comme le catalogue de Strate : chacun voit les produits ajoutés par les collègues. Avec un compte Index, on peut envoyer un produit à l'équipe ou le retirer ; sans compte, on consulte seulement. (À activer une fois : script `supabase/membrane-catalogue.sql`.)
- Nouveauté : on peut lier un produit à sa fiche technique dans Index ; le lien s'affiche sous le produit choisi.
- La SikaMembran Outdoor (non vendue en Suisse) est retirée des produits d'origine.

## 1.4 — 7 novembre 2026

- Nouveauté : sur ordinateur, Membrane s'affiche en deux colonnes comme Strate : la bande et son résultat à gauche, la commande à droite, toujours visible.

## 1.3 — 7 novembre 2026

- Nouveauté : Membrane a une bibliothèque de produits, comme Strate : on y voit les largeurs disponibles de chaque membrane et on peut ajouter les produits d'autres fournisseurs (largeurs en stock ou sur demande, longueur du rouleau), les modifier ou les supprimer. Le fournisseur apparaît dans la commande.
- Les listes à dérouler (produit, direction des tronçons) reprennent le style de Joint, et la phrase d'accroche du bandeau est retirée.

## 1.2 — 7 novembre 2026

- Correction : dans le menu des applis, le nom « Membrane » ne touche plus sa description.

## 1.1 — 7 novembre 2026

- Nouveauté : Membrane compte maintenant les recouvrements de 5 cm entre pièces et les chutes de rouleau, et permet d'ajouter une marge en pourcentage. La colle est calculée à 10 m par cartouche (cas courant), avec un bouton pour passer au cas défavorable de 7,5 m ; le choix est indiqué sur le bon de commande.

## 1.0 — 7 novembre 2026

- Nouveauté : Membrane, une appli pour les membranes d'étanchéité : on dessine la bande en tronçons, on dit lesquels sont collés, et elle donne les cartouches de colle et les rouleaux à commander, avec un bon de commande PDF par façade et par étage. (En préparation : visible seulement pour le concepteur.)
