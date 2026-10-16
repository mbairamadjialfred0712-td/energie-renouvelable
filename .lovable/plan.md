# Module Stockage par batteries (prompt 7)

## Ce qui sera livré
- Rubrique Technologies transformée en espace à onglets : « Vue d'ensemble » (catalogue actuel PV, éolien, biomasse, CSP, batterie, en lecture) et « Stockage par batteries ».
- Bibliothèque des fiches techniques : recherche (nom, fabricant, technologie, référence), filtres (chimie, statut, application), tableau, états vides, création et modification selon les droits.
- Fiche détaillée en 8 sections : identification, caractéristiques électriques, énergie utilisable et SOC, rendements, durée de vie, installation et sécurité, coûts, sources et validation, plus l'historique des modifications.
- Comparaison de 2 à 4 fiches, champ par champ avec unités ; les champs manquants sont signalés, sans comparer des unités différentes.
- Configuration de stockage par projet (page dédiée depuis la fiche projet) : choix d'une fiche, nombre de modules, série/parallèle, SOC, rendements, vieillissement et coûts retenus pour l'étude, avec justification et statut. Trois colonnes distinctes : valeurs fabricant / valeurs projet / hypothèses ingénieur. La fiche fabricant n'est jamais modifiée.

## Technologies proposées
LFP, NMC, plomb-acide, plomb-carbone, sodium-ion, autre (avec précision obligatoire). Aucune fiche pré-remplie : la bibliothèque démarre vide.

## Calculs et contrôles (uniquement ceux-ci)
- Contrôle indicatif : tension (V) × capacité (Ah) ÷ 1 000 comparé à l'énergie nominale déclarée ; alerte si l'écart dépasse 5 %, la valeur du fabricant n'est jamais remplacée.
- Énergie utilisable estimée = énergie nominale × DoD, affichée avec sa formule seulement si la capacité utilisable n'est pas déclarée ; une seule réduction appliquée (DoD ou plage SOC, jamais les deux).
- Projet : énergie nominale totale = nombre de modules × énergie nominale de la fiche ; puissance totale seulement si la limite par module est connue.
- Coût par kWh affiché seulement si le prix et l'énergie concernée sont connus, dans la même devise, sans conversion.
- Refus : pourcentages hors 0–100, SOC min ≥ SOC max, valeurs négatives, nombre de modules non entier, dates incohérentes, température min > max.
- Alertes (non bloquantes) : DoD incompatible avec la plage SOC, puissance de charge supérieure à la limite déclarée, rendement aller-retour supérieur au produit charge × décharge, etc.
- Aucune simulation de charge, autonomie, vieillissement ou dimensionnement ; aucun graphique de courbe sans données.

## Droits
- Admin et Ingénieur : création, modification, validation.
- Analyste et Lecteur : consultation uniquement.
- Fiches de la bibliothèque visibles par tous les utilisateurs connectés (référentiel partagé) ; configurations projet visibles par le propriétaire du projet et les administrateurs.
- Contrôles dans l'interface, les fonctions serveur et les règles de la base.

## Tests
Les 11 tests du prompt avec des fiches et un projet temporaires supprimés ensuite ; le test Lecteur sera signalé s'il ne peut pas être exécuté réellement.

## Détails techniques
- La table `technologies` reste le catalogue des familles (ligne BATTERY) ; nouvelle table `battery_datasheets` avec colonnes typées par groupe (V, Ah, kWh, kW, A, %, °C, cycles, années, kg, mm, coûts + devise) et un JSON complémentaire pour les données spécifiques du fabricant.
- Nouvelle table `project_storage_configs` (projet, fiche, modules, série/parallèle, paramètres retenus, justification, statut), plus `battery_datasheet_history` alimentée par déclencheur.
- Statut à 5 valeurs réutilisant l'enum existant ; validation réservée Admin/Ingénieur par déclencheur.
- Moteur pur `battery-model.ts` (contrôles, alertes, formules indicatives) avec tests unitaires.
- Routes : `technologies.tsx` (layout), `technologies.index.tsx`, `technologies.storage.index.tsx`, `technologies.storage.new.tsx`, `technologies.storage.$id.tsx`, `technologies.storage.compare.tsx`, `projects_.$id.storage.tsx`.
