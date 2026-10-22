# Validation des scénarios énergétiques — audit global 1.0

Date : 22 octobre 2026. Référentiel : PROMPT 15 « Audit global de cohérence et préparation des simulations de scénarios énergétiques ».

## Rapport final en 13 points

### 1. Diagnostic initial

Audit statique du code, des contrats et des migrations, sans modification préalable. Quatre catégories :

1. **Fonctionnel et vérifié** : moteurs individuels PV/CSP/éolien/biomasse/batterie avec contrats et validations Python ; persistance honnête des échecs ; préparation hybride A avec historique ; révocation des écritures navigateur sur simulations/résultats.
2. **Présent mais partiellement intégré** : comparaison B (fixtures seulement, jamais alimentée par de vrais résultats) ; `scenario_results` défini mais non utilisé par le module hybride ; statuts de préparation côté client non opposables côté serveur (brouillons incomplets sauvegardables, par conception).
3. **Absent ou non implémenté** : moteur hybride chronologique (registre Python `not_implemented`) ; dispatch, SOC commun, optimisation ; vérification croisée des versions de moteurs.
4. **Impossible à vérifier dans l'environnement actuel** : service hébergé (`auth_configured=false` au dernier contrôle), isolation réelle entre deux comptes, comparaison alimentée par de vrais résultats.

### 2. Modules inspectés

- Contrats : `engine-contract.ts`, `csp-contract.ts`, `wind-contract.ts`, `biomass-contract.ts`, `battery-contract.ts`, `python-engine/app/api/schemas/contract.py`, moteurs `python-engine/app/engines/*`.
- Scénarios : `hybrid-model.ts`, `hybrid-workspace.tsx`, `hybrid.functions.ts`, `hybrid-data.server.ts`, `hybrid-access.server.ts`, page `/scenarios`.
- Sécurité : migrations `0022_trusted_simulation_results.sql`, `0023_hybrid_preparation_role_guard.sql`, politiques RLS des simulations, résultats, scénarios et configurations de stockage ; `engine-http.server.ts`, `engine-access.server.ts`, `engine.functions.ts`.

### 3. Corrections réalisées (défauts démontrés uniquement)

1. **Association d'une simulation d'un autre site** : le serveur vérifiait projet et moteur, pas le site historique. `hybrid-access.server.ts` rejette désormais toute simulation dont le site connu diffère du site de la configuration ; site inconnu toléré (brouillon), signalé côté préparation.
2. **Limite des 100 simulations** : une référence valide plus ancienne que la fenêtre de chargement était rejetée comme « inaccessible ». `loadSimulationsByIds` recharge les références par identifiants sous les droits de l'utilisateur avant le contrôle.
3. **Enveloppes illisibles silencieusement ignorées** : `loadHybridData` compte désormais les configurations non décodables (`discardedConfigs`) et l'interface les signale explicitement ; les données sont préservées, jamais réécrites.
4. **Changement de site dans l'interface** : les associations de simulations étaient conservées ; elles sont maintenant réinitialisées comme la demande et la météo.

Aucune formule de moteur, aucune migration, aucune donnée ni historique modifiés.

### 4. Relations et contrôles de cohérence disponibles

- Projet ↔ site : localités différentes rejetées côté serveur lorsque les deux sont connues.
- Demande, météo : doivent appartenir au site de la configuration (serveur).
- Équipement batterie : même projet ; ressource biomasse : même site (serveur).
- Simulations associées : même projet, même moteur, même site connu (serveur, après correction).
- Préparation (client, non opposable) : statuts validés, instantané batterie, provenance, version moteur, séries horaires, alignement exact des horodatages, série turbine éolienne en W, série électrique nette CSP en W.

### 5. État de préparation des scénarios

Niveau A intégré : création, modification, historique en revisions JSON dans `scenarios.objectives` (`kind=hybrid_preparation`, `modelVersion=preparation-1.0`). Statuts : Brouillon, Données incomplètes, Validation scientifique requise. Les combinaisons PV, éolien, biomasse, CSP, batterie (jusqu'à cinq technologies, une association chacune) sont préparables sans prétendre à l'exécution. Unités déclarées imposées par technologie : kWc (PV), kW (éolien/biomasse), kWth (CSP), kWh (batterie) — aucune conversion implicite.

### 6. Capacités de comparaison réellement disponibles

Niveau B : affichage côte à côte des résultats individuels terminés avec indicateurs, unités, méthodes, versions, périodes, sources et hypothèses propres. Aucune somme, aucune conversion, aucune agrégation ; valeur indisponible jamais remplacée par zéro. Vérifié sur fixtures synthétiques uniquement ; jamais alimenté par de vrais résultats hébergés. Niveau C : indisponible, bouton désactivé, registre Python non implémenté.

### 7. Tests exécutés

- **TypeScript : 317 réussis, 0 échoué, 24 fichiers** (`bunx vitest run`), dont 3 nouveaux tests de cohérence site/simulation (refus autre site, acceptation même site, acceptation site inconnu).
- **Python : 225 réussis, 0 échoué** (`pytest python-engine/tests`, environnement temporaire Python 3.13 avec `nrel-pysam==7.1.1.post1`) ; 1 avertissement de dépréciation préexistant.
- Non exécutés : parcours hébergé de bout en bout, isolation réelle entre deux comptes, comparaison alimentée par de vrais résultats.

### 8. Contrôles de sécurité réalisés

Écritures navigateur révoquées sur `simulations`/`simulation_results` ; exécution réservée aux rôles admin/ingénieur ; échecs persistés en `failed` sans faux succès ; aucune importation statique du module de clé moteur depuis le code navigateur ; clé jamais exposée. Limites documentées : `scenario_results` reste modifiable par son propriétaire (table inutilisée par le module hybride) ; les historiques ne sont pas absolument immuables (suppression en cascade possible par un ingénieur autorisé) ; l'isolation réelle entre comptes exige deux comptes QA autorisés.

### 9. Sauvegarde et récupération

Brouillons relus après rechargement ; revisions conservées dans l'enveloppe ; contrôle `updated_at` contre les écrasements concurrents de la même requête (ne détecte pas un brouillon client périmé soumis après coup). Les références de simulations ne dépendent plus de la fenêtre des 100 dernières.

### 10. État du service hébergé

Non vérifié opérationnel : au dernier contrôle, `auth_configured=false` tant que `ENGINE_SHARED_KEY` n'est pas enregistré côté Render suivi d'un redéploiement. Aucun calcul hébergé n'est revendiqué.

### 11. Blocages restants

- Clé commune Render à enregistrer puis redéploiement.
- Aucune simulation PV terminée (requise par le moteur batterie) ni fiche biomasse validée.
- Contrats TS moins stricts que Python sur plusieurs points (champs inconnus, limites de taille, DNI CSP, courbes éolienne) : Python reste l'autorité de validation et rejette les données invalides avant persistance ; resserrage TS documenté, non appliqué.
- Pas de vérification croisée des versions de moteurs entre résultats comparés.

### 12. Points à faire valider par M. Joël

Architecture électrique/thermique commune, critères de compatibilité site, conventions de calendrier (29 février PV omis vs conservé ailleurs), politique de dispatch et priorités, mobilisation biomasse, conversion CSP, métriques de couverture et tolérances de bilan, resserrage éventuel des contrats TypeScript.

### 13. Prochaine étape recommandée

Finaliser la clé Render, produire un PV terminé sur les données QA validées, enchaîner éolien → biomasse → batterie avec sauvegarde et relecture, puis alimenter une comparaison B réelle. Le niveau C ne sera implémenté qu'après validation scientifique d'un contrat d'orchestration limité (par exemple PV + batterie + demande).

---

# PROMPT 16 — Finalisation des scénarios comparatifs (22 octobre 2026)

Ce chapitre remplace les conclusions de disponibilité du rapport précédent, conservé ci-dessus comme historique. Il ne concerne pas le PROMPT 16 distinct d'audit Render. Aucun moteur, formule, secret, rôle ou migration n'a été modifié.

## 1. État initial et classification

| Fonction | Catégorie initiale | État après intervention |
|---|---|---|
| A : création/modification de préparation et historique | A — fonctionnelle et vérifiée | RÉUSSI : deux nouvelles préparations sans résultat créées et relues via UI administrateur |
| B : présentation des résultats individuels d'une configuration | B — partielle | Conservée, sans somme ni conversion |
| Tableau multi-scénarios, sélection enregistrée | E — non implémentée | RÉUSSI : création, sélection, sauvegarde puis relecture via UI ; valeurs numériques vérifiées sur fixtures seulement |
| Contrôles comparatifs côté serveur | B — partiels (associations seules) | RÉUSSI : contrôle des indicateurs sur données rechargées sous RLS et tests ciblés |
| Références anciennes lors de la relecture | B — rechargées seulement à la sauvegarde | RÉUSSI : chargement par identifiants à chaque lecture, test avec client simulé |
| Configurations malformées identifiables | B — compteur uniquement | RÉUSSI : identité et raison affichables, données conservées ; legacy sans rapport non comptés |
| Calculs hébergés et tableau numérique réel | D — déploiement/données | BLOQUÉ : Render auth_configured=false, aucun résultat enregistré |
| C : simulation hybride chronologique | E — non implémentée | NON EXÉCUTÉ : aucune orchestration ajoutée ; indisponibilité maintenue |

Une préparation vide de technologies reste sauvegardable comme brouillon, jamais calculée. Statuts réels en base : draft, queued, running, completed, failed ; seuls completed peuvent fournir une valeur comparative.

## 2. Fichiers inspectés et modifiés

Inspectés : page `/scenarios`, `hybrid-workspace.tsx`, `hybrid-model.ts`, `hybrid-data.server.ts`, `hybrid-access.server.ts`, `hybrid.functions.ts`, tests existants, contrats engine/wind/biomass/battery/CSP, `engine-response.ts`, `engine.functions.ts`, `engine-http.server.ts`, `battery-source.server.ts`, moteur PV Python, documentation scénarios, migrations 0022/0023, `src/start.ts`, `AGENTS.md`, `roadmap.md`, titres des 66 fichiers de routes et page d'accueil. Audits délégués : contrats/moteurs/persistance et migrations/permissions. Politiques et privilèges actuels relus en base.

Modifiés : les cinq modules hybrides existants précités, leurs tests d'accès, `AGENTS.md`, `roadmap.md` et ce rapport. Ajoutés : `scenario-comparison.ts`, `scenario-comparison-panel.tsx`, `scenario-comparison.test.ts`, `scenario-evidence.server.ts`, `scenario-evidence.test.ts`, `hybrid-data.test.ts`. Aucun fichier moteur Python modifié. Metadata de `/scenarios` et de `/` déjà spécifiques ; autres absences de head concernent des layouts, non de nouveaux contenus.

## 3. Corrections et modèle retenu

- Extension compatible de `scenarios.objectives.config` : objectif, période déclarée et sélection `{ name, scenarioIds }`, valeurs par défaut pour les anciennes enveloppes. Historique existant préservé.
- La sélection reste **dans kind=hybrid_preparation** afin de réutiliser le garde de rôle en base ; aucune deuxième architecture/table ni nouveau kind échappant au garde.
- Lecture des simulations associées hors fenêtre des 100 dernières aussi à la relecture, pas seulement avant sauvegarde.
- Configurations hybrides malformées présentées avec nom, identifiant et raison. Pas de suppression ou réécriture ; scénarios legacy étrangers au module préservés sans fausse alerte.
- Nouvelle fonction authentifiée de comparaison : recharge les scénarios/résultats sous les droits du demandeur ; aucune valeur reçue du navigateur n'est utilisée comme résultat.
- Dates invalides/inversées et sélections dupliquées rejetées ; retrait d'une sélection sans suppression, y compris sauvegarde d'une sélection vide.

## 4. Fonctionnalités disponibles

Création d'un scénario préparé avec nom/description/objectif/site/période ; paramètres technologiques existants ; association de simulations ; sélection de plusieurs scénarios du même site ; tableau à une colonne par scénario et une ligne par indicateur ; sauvegarde et réouverture de la sélection dans la configuration courante ; liens aux calculs/sources, objectifs et hypothèses ; états de chargement, erreurs et absence de résultats. Une sélection enregistrée peut être recalculée à la consultation à partir des résultats réellement accessibles ; ce n'est pas une copie figée de leurs valeurs.

RÉUSSI navigateur : deux préparations intitulées « QA — Comparatif A/B — préparation sans calcul » sauvegardées avec site QA existant, dates du 5 au 11 janvier 2026 et objectif de vérification explicite. Aucune donnée scientifique, simulation ni résultat créée. Sélection de deux identifiants et nom de comparaison relus après rechargement. Aucune erreur JavaScript. Vérifications 1280×1800 et 390×844, navigation mobile explicitement fermée ; pas de défilement horizontal du document constaté. Tableau lui-même défilable si nécessaire.

## 5. Indicateurs et compatibilité

Chaque ligne est séparée par **moteur + clé exacte d'indicateur**. Même unité ne signifie jamais même énergie. Pour fournir une valeur : résultat fini/non-null, simulation terminée, site historique connu/identique, projet accessible, période connue compatible avec la déclaration du scénario, dates/horodatages/UTC/convention exactement compatibles, même moteur/version/méthode/unité/périmètre (niveau/technologie/stratégie/convention bissextile), contrat d'entrée reconnu, sources et nature d'entrée disponibles, date de calcul enregistrée. Versions/périmètres/natures/méthodes différents excluent la ligne avec raison ; aucune compatibilité scientifique n'est inventée. Les paramètres de dimensionnement peuvent naturellement différer entre scénarios.

Valeurs uniquement issues de `simulation_results` : PV `annual_ac_energy`, production mensuelle, rendement spécifique et facteur de capacité propre ; éolien observations, flux cinétique **non électrique**, énergie turbine et facteur de capacité si calculés ; batterie demande, charge/décharge, pertes, énergie non servie, couverture et SOC final en kWh ; biomasse `primary_energy` en MWh/an **non électrique** ; CSP bilans thermiques signés et électricité uniquement lorsqu'elle existe. Aucun indicateur commun universel aux cinq moteurs. Les clés annuelles sont conservées dans leur périmètre moteur : aucune période courte transformée en année. Null affiche « Non disponible », un zéro réellement calculé reste zéro.

Unité, méthode, période, nature d'entrée, date de calcul, statut scientifique, sources/avertissements/limites et lien vers le résultat sont accessibles. `completed` n'est pas une validation scientifique ; pending/non établie est visible. Les sources d'entrée peuvent différer mais leur provenance reste consultable ; aucune égalité entre sources ou validation de qualité n'est supposée.

Finance : LCOE projet existant reste dans son module ; pas de liaison financière démontrée aux scénarios sélectionnés, donc pas de CAPEX/OPEX/VAN/TRI/retour fabriqués dans ce tableau. Autonomie batterie absente du moteur actuel ; pas de valeur inventée. Aucune puissance saisie n'est présentée comme résultat calculé.

## 6. Limites hybrides

A = préparation ; B = indicateurs individuels ; C = orchestration chronologique indisponible. Aucun total du mix, double comptage, dispatch ou SOC commun ; ne pas additionner production PV et flux de batterie. Électricité, chaleur et énergie primaire séparées. Pas de graphiques sans résultats disponibles ni classement global. Une ligne exclue demeure visible avec la raison et les liens de traçabilité, pas avec une fausse valeur.

## 7. Tests réellement exécutés

- RÉUSSI : suite TypeScript complète, **346 tests / 27 fichiers**, dernière exécution après ajouts ; nouvelles fixtures synthétiques couvrant sélection/enveloppe, valeurs 2/3 conservées sans somme, retrait, inter-sites, dates/chronologie, unités kWh/MWh, null et zéro, failed/running/draft/queued, préparation sans résultat, sources/contrat/nature, ancien chargement hors 100, données malformées et rôles/références comparatives.
- RÉUSSI : Python **225 tests**, `/tmp/scenario-python-env/bin/python -m pytest python-engine/tests -q`, environnement temporaire Python 3.13, PySAM épinglé par requirements ; un avertissement préexistant Starlette/httpx. Cela ne démontre pas le runtime hébergé 3.12.
- RÉUSSI : parcours UI authentifié décrit au point 4, sauvegarde puis relecture et absence de valeurs inventées.
- Une première fixture TypeScript avait un nom de deux caractères contraire au minimum existant de trois : ÉCHEC corrigé dans la fixture, sans assouplir la règle ni supprimer le test.

## 8. Compilation

RÉUSSI : dernier journal de compilation automatique du preview indique build OK. Aucun build/typecheck manuel exécuté. Des erreurs transitoires entre la création du comparateur et l'ajout de son type evidence ont disparu dans les entrées suivantes. Les tests et la navigation à froid n'ont pas rencontré d'écran blanc.

## 9. Permissions et isolation

RÉUSSI audit actuel : `has_table_privilege` confirme SELECT=true et INSERT/UPDATE/DELETE=false pour authenticated sur simulations/simulation_results. Scenarios conserve les droits CRUD, soumis à RLS `app_private.can_access(owner_id)` et au garde admin/engineer de kind=hybrid_preparation. Fonction comparative avec middleware authentifié ; sauvegarde avec contrôle rôle/propriétaire/références ; aucun admin client dans ce nouveau flux. Tests unitaires refusent viewer/analyst et ingénieur non propriétaire, associations étrangères/inaccessibles.

RÉUSSI : une identité réelle, administrateur de Joël, pour création/sauvegarde/relecture. **BLOQUÉ : isolation réelle entre deux comptes non exécutée**, aucun second compte QA explicitement autorisé dans cette intervention ; tests de fonctions pures et lecture des politiques ne remplacent pas ce contrôle. Les enveloppes objectives restent éditables directement par un ingénieur/propriétaire autorisé ; les contraintes scientifiques sont donc recalculées au serveur et l'enveloppe n'est jamais preuve de résultat. Les historiques JSON ne sont pas absolument immuables ; contrôle updated_at actuel protège une concurrence pendant la requête, pas tous les brouillons client périmés. Aucune migration d'immutabilité imposée.

## 10. Render actualisé

RÉUSSI contrôle réel du 22/10 : endpoints exacts `/api/v1/health` et `/api/v1/capabilities` HTTP 200 ; health `status=ok`, **auth_configured=false**. PV/CSP/éolien/biomasse/batterie annoncés available ; hybrid/optimization/finance not_implemented. L'état available du registre n'est pas une réussite de calcul sécurisé. Aucun déploiement ni secret modifié. Une première sonde hors préfixe API a expiré/retourné 404 ; seul le contrôle corrigé ci-dessus est probant.

## 11. Bloqué / non exécuté

- BLOQUÉ : calcul sécurisé → persistance → tableau numérique hébergé ; authentification Render à configurer et simulations réellement terminées requises. Lecture actuelle de la base : aucun résultat dans simulation_results.
- BLOQUÉ : isolation A/B sur deux identités explicitement autorisées et fixtures privées appropriées.
- NON EXÉCUTÉ : tests de panne Render/rollback, classement, graphiques, orchestration C ; pas implémentés dans cette intervention.
- Comparabilité numérique démontrée seulement sur fixtures TypeScript, pas avec des calculs hébergés. Préparation/sélection sauvegardée réellement, sans prétendre remplir ce blocage.

## 12. Validation attendue de Joël

Valider la politique conservatrice même site/moteur/version/méthode/période/native unité, les différences de sources, limites et natures d'entrée acceptables, les critères d'un éventuel rapprochement inter-moteurs ou inter-sites (actuellement refusé/séparé), les bases de finance liées aux scénarios, les règles de chronologie/dispatch avant C et les références physiques pour l'acceptation des moteurs. Fournir les prérequis Render et un second compte QA autorisé pour poursuivre les preuves hébergées. **La fonctionnalité n'est pas déclarée prête pour la production.**

## 13. Rapport

Rapport versionné : `python-engine/docs/VALIDATION_SCENARIOS.md` (présent chapitre). Copie utilisateur : `PROMPT_16_RAPPORT_SCENARIOS_COMPARATIFS.md`. Captures temporaires hors dépôt : `/tmp/browser/scenario-final/roundtrip.png`, `mobile-closed.png`. Les scénarios retirés restent enregistrés et les résultats historiques n'ont pas été modifiés.
