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

## PROMPT 19.1 — Audit final (1–2 novembre 2026)

### Portée et preuves de sécurité

- Inspection des services de listes, fiches, inventaire et simulations : ils utilisent le contexte utilisateur authentifié et les politiques de lecture existantes, pas un client privilégié pour ces lectures. Les filtres d’interface ne constituent pas un contrôle d’accès.
- Lecture des politiques **actives** de Lovable Cloud : ressources générales, solaires, éoliennes et biomasse réservées au propriétaire ou à un administrateur ; batteries, configurations, météo, projets et simulations utilisent également `can_access(owner_id)`, défini comme propriétaire ou administrateur. RLS activée sur les onze tables inspectées. Les localités de référence sont volontairement partagées ; elles ne sont pas des ressources privées.
- Des migrations historiques contiennent des lectures plus larges. Ce texte ne décrit pas l’état actuel : les politiques actives ont été vérifiées séparément et sont restrictives. Aucun changement de politique nécessaire établi sur ces lectures.
- Lien direct vers un résultat PV existant : consultable avec le compte administrateur demandeur, retour vers Simulations réussi. Le même lien sans session redirige vers la connexion.
- **Non exécuté :** appels directs aux services sous un second compte, identifiants appartenant à un autre compte, compteurs privés croisés et remplacement d’identité dans le même navigateur. Le second compte n’a pas été désigné après la demande ; aucune session tierce n’a été choisie arbitrairement. Un administrateur est autorisé à voir les autres propriétaires : son seul parcours ne prouve pas l’isolation.

### Cohérence et navigation vérifiées localement

- Ressources et Technologies : solaire **24 fiches / 0 validée / 2 localités**, éolien **25 / 1 / 3**, biomasse et déchets **0**. Technologies sépare les **2 jeux météo validés**, la **configuration batterie validée** et les calculs terminés (**1 PV, 1 éolien, 1 batterie**). Une fiche météo n’est pas une fiche solaire.
- Retour solaire avec recherche `NASA` et retour éolien avec recherche `QA` : filtres conservés, y compris après ouverture directe de la fiche avec ses paramètres.
- **Défaut confirmé puis corrigé :** la bibliothèque batterie stockait ses filtres uniquement en mémoire locale et ne les transmettait pas à la fiche. Recherche, statut, chimie et application passent maintenant par les paramètres autorisés de navigation. Parcours bibliothèque → fiche → Retour vérifié avec `q=QA`, `status=validated`, `chem=lfp` ; filtre conservé et capture inspectée.
- Retour biomasse non exercé sur une fiche : aucune fiche disponible ; destination de repli couverte par le test unitaire existant, pas présentée comme un parcours réel réussi.
- Aucun résultat scientifique généré ou changé ; consultation des résultats QA historiques uniquement.

### Tests, environnement et limites

- **435 tests TypeScript réussis / 34 fichiers**, dont tests d’accès moteur, sources batterie, hybrides et inventaire ; ajout d’un cas sur la conservation des filtres batterie et l’exclusion des paramètres de cible externe/propriétaire. Ces tests unitaires ne remplacent pas une preuve RLS entre deux sessions.
- Dernier contrôle automatique disponible : **build OK** (2 novembre 2026). Aucun build manuel lancé.
- Navigateur local connecté : compteurs chargés, retours solaire/éolien/batterie et simulation, puis refus du lien simulation sans session ; **aucune erreur JavaScript** sur ce parcours.
- Les captures démontrent les compteurs et le retour batterie. La carte affiche les points mais son fond cartographique n’est pas chargé dans la capture : le rendu des tuiles n’est pas validé par cet audit.
- Métadonnées inspectées sur les 66 fichiers de routes : les pages de contenu ont les six champs attendus ; les fichiers sans titre sont des enveloppes de navigation, pas des pages de contenu.
- **Version publiée : non testée**, aucune session locale transférée vers une autre origine et aucune publication effectuée. La lecture des règles hébergées n’est pas une vérification de l’interface publiée.

### Risques ouverts et suites nécessaires

1. **Isolation multi-comptes non validée** : désigner et autoriser un second compte QA, puis tester listes, compteurs, fiches et services directement, dans les deux sens. Les données actuelles ressources/batteries/simulations appartiennent au demandeur ; aucun jeu privé appartenant au second compte n’a été créé.
2. **Cache lors de changements d’identité externes** : le bouton de déconnexion annule les requêtes et vide le cache. L’abonnement global, lui, ne vide pas le cache lors d’un `SIGNED_OUT` externe et invalide seulement lors d’un `SIGNED_IN` d’une identité différente ; les clés de requêtes ne contiennent pas l’identité. Risque de données précédentes transitoirement conservées, **pas une fuite reproduite**. Reproduction avec deux comptes nécessaire ; correction proposée : effacement/annulation sur changement réel d’identité avant réutilisation des vues. Aucun changement de politique ou de base requis pour cette correction côté interface.
3. **Linter hébergé : neuf avertissements, trois catégories** : un chemin de recherche mutable (`touch_project_finance_assumptions`), deux fonctions déclencheurs `SECURITY DEFINER` exécutables par le rôle anonyme (`log_project_finance_assumptions`, `record_energy_production_history`) et six accessibles au rôle connecté, dont les RPC de calcul/administration qui ont leurs gardes internes. Cela ne prouve pas un contournement ; les fonctions de déclencheur ne sont pas des RPC ordinaires. Durcissement potentiel des droits EXECUTE et du chemin de recherche à revoir séparément avant migration, avec tests des déclencheurs et conséquences expliquées.

### Fichiers modifiés dans cet audit

`src/features/catalog/inventory.ts`, `src/features/catalog/inventory.test.ts`, `src/routes/_authenticated/technologies.storage.index.tsx`, `VALIDATION_INTERFACES.md`, `roadmap.md` ; contrainte d’audit mémorisée. Aucun moteur, formule, secret, configuration Render, table, permission, migration ou donnée modifié.