# PROMPT 19 — Cohérence Ressources / Technologies et retours

## Incohérences établies et corrections

- Les anciens indicateurs solaires du tableau de bord ne constituaient pas la même sélection que la liste dédiée. Les deux vues utilisent maintenant les services de listes existants et les mêmes sélecteurs d'inventaire.
- Les statuts des ressources, des configurations et des calculs étaient insuffisamment distingués. Les compteurs affichent séparément les fiches enregistrées, validées, localités et calculs terminés. La météo reste distincte des ressources ; un module raccordé ne prouve pas une connexion opérationnelle.
- Les filtres de liste n'étaient pas conservés par les liens vers une fiche. Les liens transportent les paramètres validés et le retour utilise une destination interne explicite, sans dépendance exclusive à l'historique.
- Une animation de carte pouvait continuer après le départ de Ressources et provoquer `_leaflet_pos`. Les transitions sont désactivées et arrêtées avant suppression ; les points sont stables et filtrés par les localités de l'inventaire.

## Services et fichiers

Nouveaux : `src/features/catalog/{inventory.ts,inventory.test.ts,use-inventory.ts,catalog-controls.tsx}`, `src/lib/catalog.functions.ts`, `src/components/app/{back-target.ts,back-target.test.ts,context-navigation.tsx}`.

Modifiés : `src/routes/__root.tsx`, `src/routes/_authenticated/{resources.index.tsx,technologies.index.tsx,resources.solar.index.tsx,resources.wind.index.tsx,resources.biomass.index.tsx}`, `src/components/app/{app-shell.tsx,page.tsx}`, `src/features/resources/resource-manager.tsx`, `src/features/geography/territory-map.tsx`, `AGENTS.md`, `roadmap.md`.

Les listes solaires, éoliennes, biomasse, déchets et météo existantes restent la référence. La lecture supplémentaire des configurations et métadonnées de simulations est authentifiée et utilise le client utilisateur soumis aux politiques existantes ; pagination par 500 lignes, aucun client privilégié. Les configurations renvoient au stockage du projet. Les calculs sont comptés à partir du moteur stocké dans `parameters.request.engine`.

## Navigation

Accès croisés Ressources / Technologies avec localité et statut ; accès aux formulaires PV, éolien, biomasse et CSP existants. Batterie conserve la bibliothèque et les configurations projet. Déchets indique l'absence de moteur. Retour contextuel visible dans l'espace connecté et destinations de repli par section ; filtres de recherche des fiches conservés. Aucun calcul nouveau ou résultat créé.

## Vérifications réalisées

- 434 tests TypeScript réussis dans 34 fichiers, dont huit nouveaux tests sur inventaires et destinations de retour.
- Dernier contrôle automatique : build OK, après correction des annotations de points de carte.
- Navigateur connecté avec le compte demandeur : Ressources et Technologies chargées, liens croisés, recherche QA conservée lors du retour d'une fiche éolienne, repli depuis une simulation ouverte directement, absence d'erreurs JavaScript après correction de carte.
- Contrôle des lectures sous le jeton utilisateur : 49 ressources génériques, une configuration stockage et deux jeux météo. Les listes dédiées affichent 24 fiches solaires et 25 éoliennes ; Technologies présente les mêmes valeurs et les mêmes statuts.
- Filtre localité QA : une fiche éolienne sur les deux vues et dans la liste ; lien de calcul ouvre l'onglet Éolien A/B/C.
- Mobile 390 × 844 : carte Batterie chargée, retour visible, aucun débordement horizontal ; vue ordinateur également inspectée.

## Limites et intégrité

Les parcours filtrés ont été exercés sur des données QA synthétiques : cela ne valide ni les données scientifiques ni les moteurs. Aucun calcul Render n'a été lancé pour cette tâche. Aucun secret, configuration Render, contrat scientifique, table, migration, permission ou donnée de production modifié.

L'isolation entre plusieurs comptes et les différents rôles n'a pas été testée de bout en bout ; les politiques existantes sont préservées, sans affirmer une validation multi-rôle. La version publiée n'a pas été vérifiée ni republiée. Les formulaires contrôlent leurs propres prérequis : le nombre de ressources ne garantit jamais la suffisance horaire ou physique. La carte se limite aux coordonnées présentes dans le service existant, sans inventer de position.

La relance financière antérieure reste bloquée par les vraies valeurs PV et hypothèses économiques sourcées manquantes ; aucune valeur synthétique n'a été substituée à ces données.