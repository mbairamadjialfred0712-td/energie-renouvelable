# Validation du module hybride — préparation 1.0

Date : 17 octobre 2026. Référentiel : PROMPT 14 « Conception et intégration du module de systèmes hybrides énergétiques » et connaissance énergie-renouvelable.

## Rapport final en 12 points

### 1. État initial constaté

Les moteurs individuels PV, CSP, éolien, biomasse et batterie existent, mais le registre Python classe `hybrid` comme `not_implemented`. Aucune coordination, règle de dispatch ou persistance de résultat hybride n'existait. La page Scénarios était un formulaire générique non raccordé. L'audit a trouvé zéro scénario, zéro site d'étude, zéro simulation et zéro résultat enregistré ; le projet existant n'avait pas de localité renseignée. Le service scientifique hébergé demeure non configuré.

### 2. Fichiers et modules inspectés

- Registre et API Python v1, schémas `contract.py`, moteurs PV/CSP/wind/biomass/battery, validation structurelle et tests.
- `src/features/engine/engine-contract.ts`, sources serveur batterie/biomasse/CSP/éolien, accès moteur et transport HTTP.
- Pages projets, sites, simulations, scénarios ; navigation et composants d'interface existants.
- Fonctions projets, demande, stockage ; types et migrations des scénarios, résultats, équipements et demandes ; politiques et privilèges existants.
- `AGENTS.md`, `roadmap.md`, mémoires scientifiques et exigences PROMPT 14.

### 3. Modifications réalisées

- `src/features/hybrid/hybrid-model.ts` : contrat versionné de préparation, validation structurelle, unités par technologie, contrôles de séries, périodes, sources et références ; aucun calcul de production.
- `src/features/hybrid/hybrid-workspace.tsx` : liste, création/modification, associations, paramètres explicitement déclarés, hypothèses, contraintes, blocages, comparaison individuelle, historique et espace C indisponible.
- `src/lib/hybrid.functions.ts`, `hybrid-data.server.ts`, `hybrid-access.server.ts` : lecture et sauvegarde authentifiées, références contrôlées sous les droits de l'utilisateur, propriété et rôles vérifiés.
- Page existante `/scenarios` raccordée ; navigation « Systèmes hybrides » ; métadonnées propres à cette page.
- Migration `0023_hybrid_preparation_role_guard.sql` : garde INSERT/UPDATE/DELETE limitée aux enveloppes hybrides. Nécessité démontrée : la politique générique des scénarios ne suffisait pas à garantir le rôle d'ingénieur côté base pour ces nouvelles configurations. Les scénarios historiques non hybrides sont inchangés.
- Tests hybrides Python/TypeScript, documentation et feuille de route. Aucune formule individuelle modifiée.

### 4. Structures existantes réutilisées

`scenarios.objectives` accueille une enveloppe `kind=hybrid_preparation`, `modelVersion=preparation-1.0`, configuration et revisions. Les colonnes génériques de nom, description, technologies, puissances, hypothèses et contraintes restent alimentées. Aucune nouvelle table, route Python, moteur de batterie ou moteur hybride n'est créé. Les résultats individuels sont lus dans `simulations`/`simulation_results`, sans copie dans `scenario_results` et sans agrégation.

### 5. Combinaisons réellement prises en charge

Préparation testée : PV+batterie, éolien+batterie, PV+éolien+batterie, PV+biomasse, PV+éolien+biomasse+batterie, CSP+PV. La sélection autorise une association par technologie, jusqu'à cinq technologies. Cela ne valide pas les interactions ni l'aptitude au calcul chronologique.

### 6. Statut des niveaux A, B et C

| Niveau | État | Preuve et limite |
|---|---|---|
| A | Intégré ; brouillons incomplets sauvegardables | Création, modification, rechargement et six revisions observés dans l'aperçu authentifié |
| B | Lecture/présentation implémentée | Tests sur fixtures synthétiques ; état sans résultat observé dans l'interface. Aucun vrai résultat individuel disponible pour vérifier une comparaison alimentée |
| C | Indisponible | Bouton désactivé, sorties indisponibles, registre Python non implémenté et exécution refusée avec 503 |

Les états de préparation sont Brouillon, Données incomplètes et Validation scientifique requise. « Prêt », « en cours », « terminé » ou « échec » ne sont pas attribués à une configuration hybride sans mécanisme réel. Les statuts des simulations individuelles restent visibles et explicitement individuels.

### 7. Tests exécutés

- **TypeScript : 314 réussis, 0 échoué, 24 fichiers**, dont 25 tests de contrat hybride et 9 tests d'accès.
- **Python : 223 réussis, 0 échoué**, dont 3 nouveaux tests sur la capacité hybride indisponible, l'avertissement de validation et le refus d'exécution sans résultats.
- Une première assertion Python confondait `valid` structurel et `engine_available` ; elle a échoué, a été corrigée pour respecter la sémantique existante, puis la suite complète a réussi. Aucun comportement moteur modifié pour faire passer ce test.
- Avertissement Python préexistant de dépréciation TestClient/httpx ; pas d'erreur d'exécution.
- Application : derniers contrôles automatiques `build OK` ; zéro erreur navigateur observée lors du parcours final.
- Navigateur authentifié : sauvegarde et modification d'un brouillon explicitement SYNTHÉTIQUE QA, relecture après rechargement, historique, comparaison indisponible, calcul C désactivé. Vérification desktop 1280×1800 et mobile 390×844 ; pas de débordement horizontal.
- **Non exécutés :** calcul hybride chronologique, bilan/dispatch/SOC commun, comparaison B avec vrais résultats, intégration du service hébergé, isolation réelle entre deux comptes et pannes de persistance. Ces vérifications nécessitent des données, comptes autorisés et fonctions actuellement absents.

Les fixtures et le brouillon QA ne constituent aucune validation scientifique. Un seul brouillon de préparation SYNTHÉTIQUE QA a été créé sur le projet accessible pendant le parcours ; aucune mesure, puissance, production, demande ou résultat énergétique synthétique n'a été ajouté à la base.

### 8. Contrôles de sécurité réalisés

Authentification obligatoire sur les fonctions ; lecture sous RLS ; rôle ingénieur propriétaire ou administrateur ; refus testé des viewers/analystes, propriétaires étrangers et références inaccessibles. La base impose également le rôle et la propriété sur les enveloppes hybrides et interdit leur changement de propriétaire. Aucun secret ajouté, affiché ou transmis au navigateur. Les modules de lecture serveur sont importés dynamiquement depuis les handlers.

La sécurité scientifique ne repose pas sur le JSON éditable de préparation : aucun résultat calculé n'y est admis comme preuve et aucune écriture de résultats n'est exposée. L'isolation croisée réelle nécessite encore deux comptes QA autorisés ; les tests unitaires de refus ne remplacent pas cette vérification.

### 9. Sauvegarde et récupération

Le brouillon enregistré et ses modifications ont été relus via l'interface après rechargement. L'enveloppe conserve les revisions antérieures ; les anciennes enveloppes non hybrides ne sont pas transformées. Un contrôle `updated_at` protège la fenêtre lecture-écriture côté serveur. Limite : cela ne constitue pas encore une gestion complète des conflits de brouillons ouverts longtemps ; la base ne garantit pas un historique append-only contre des modifications directes d'un ingénieur autorisé. Les résultats individuels restent leurs propres instantanés de référence immuables.

La liste des simulations charge actuellement les 100 dernières accessibles ; le chargement complet des longues séries/historiques au-delà des limites du service de données doit être paginé avant un usage à grande échelle. Un résultat partiel ou une métadonnée absente ne rend jamais C disponible.

### 10. État réel du service hébergé

Service scientifique non configuré ; aucun déploiement, URL ou clé ajouté. La sauvegarde de configuration A dans Lovable Cloud a été vérifiée depuis l'aperçu ; ce n'est pas une exécution scientifique hébergée et ce n'est pas une publication de l'application. Aucune simulation hybride hébergée réussie n'est revendiquée.

### 11. Limites et validations scientifiques restantes

Pas de formule hybride, addition de production, conversion d'unité, rééchantillonnage, annualisation, dispatch, SOC ou optimisation implémenté. Les horodatages doivent être présents, uniques, continus par heure, porter une convention `period_start` et un décalage UTC connu ; limite 8784 pas. Les séries associées restent natives. Des décalages ou horodatages différents produisent un blocage, jamais une transformation automatique.

| Technologie | Contrat natif conservé | Limite hybride |
|---|---|---|
| PV 1.0.1 | PVWatts v8/PySAM, électricité kWh/pas et puissance W, année civile avec 29 février omis | Ne peut être synchronisé implicitement avec une série conservant ce jour |
| Éolien 1.0.0 | UTC horaire, observations m/s, flux W et turbine W seulement avec courbe documentée | Flux cinétique jamais assimilé à électricité ; contrôle de présence de `series_turbine_power` |
| Biomasse 1.0.0 | Énergie primaire MWh/an | Pas de série horaire, disponibilité/mobilisation ou conversion électrique supposée |
| CSP 1.0.0 | UTC horaire, DNI W/m², bilan thermique signé, net électrique éventuellement absent | Chaleur distincte de l'électricité ; contrôle de `series_net_electric_power` |
| Batterie 1.1.0 | PV et demande alignés, SOC kWh, rendements et limites documentés | Aucun deuxième moteur ; configuration validée et interactions communes requises |
| Demande | Données mesurées distinctes des estimations d'inventaire | Profil quotidien non prolongé automatiquement sur une année |

Les puissances déclarées sont des paramètres de préparation avec source fournie, pas des mesures ni des consignes moteur. Les snapshots des résultats individuels gardent leurs sources et hypothèses propres. À valider par Joël : architecture électrique/thermique commune, critères de compatibilité site, profils de demande, conventions de calendrier, politique de dispatch et priorité, puissances charge/décharge, SOC initial/final, rendements, écrêtage, mobilisation biomasse, conversion CSP, métriques de couverture et tolérances de bilan. Aucun scénario n'est désigné automatiquement meilleur.

### 12. Prochaine étape recommandée

Fournir un site/project lié et des données documentées compatibles, obtenir l'accord sur le service hébergé et deux comptes QA autorisés, puis produire et vérifier les résultats individuels. Valider ensuite avec Joël un contrat d'orchestration limité, par exemple PV+batterie+demande, avec calendrier, contraintes et bilans explicites ; seulement après cette validation implémenter et tester C, y compris calcul → sauvegarde → relecture et pannes. Les moteurs individuels restent réutilisés sans duplication.