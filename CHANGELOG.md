# Journal des versions — Membrane

Chaque version qui change quelque chose de visible pour l'équipe a une puce « Nouveauté : … », en langage courant : c'est la seule phrase affichée sur la page « Nouveautés » de l'Accueil.

## 1.5 — 7 novembre 2026

- Nouveauté : la bibliothèque de produits de Membrane est commune à l'équipe, comme le catalogue de Strate : chacun voit les produits ajoutés par les collègues. Avec un compte Index, on peut envoyer un produit à l'équipe ou le retirer ; sans compte, on consulte seulement. (À activer une fois : script `supabase/membrane-catalogue.sql`.)
- Nouveauté : on peut lier un produit à sa fiche technique dans Index ; le lien s'affiche sous le produit choisi.

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
