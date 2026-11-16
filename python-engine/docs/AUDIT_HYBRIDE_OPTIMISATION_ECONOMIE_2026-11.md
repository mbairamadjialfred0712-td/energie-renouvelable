# Audit scientifique — systèmes hybrides, optimisation et analyse économique

**Énergie Renouvelable Pro · N’guessan Joël Dje**

Mission demandée le 15 novembre 2026 ; vérifications clôturées le 16 novembre 2026 UTC.

**Périmètre : audit exclusivement.** Aucun code applicatif, moteur, calcul, compte, permission, configuration Render, secret ou résultat n’a été modifié. Aucun déploiement ni nouveau calcul métier enregistré. Seuls ce rapport et le suivi documentaire sont ajoutés. Toute correction ou extension proposée attend une approbation explicite.

## Sommaire

1. [État réel des fonctionnalités et preuves](#1-état-réel-des-fonctionnalités-et-preuves)
2. [Fichiers, fonctions et architecture existants](#2-fichiers-fonctions-et-architecture-existants)
3. [Fonctionnalités manquantes ou incomplètes](#3-fonctionnalités-manquantes-ou-incomplètes)
4. [Risques techniques et scientifiques](#4-risques-techniques-et-scientifiques)
5. [Feuille de route proposée et décisions](#5-feuille-de-route-proposée-et-décisions)

## 1. État réel des fonctionnalités et preuves

### 1.1 Diagnostic obligatoire

| Fonctionnalité | Code présent | Calcul opérationnel | API disponible | Tests actuels | État réel |
|---|---|---|---|---|---|
| Systèmes hybrides | Préparation A et comparaison B dans l’application ; PV+batterie dans Python | Comparaison de résultats enregistrés ; PV+batterie horaire individuel ; pas d’orchestration multi-sources C | Fonctions internes authentifiées A/B ; Python `hybrid` absent | Modèle, comparaison et accès inclus dans les 466 tests TS ; batterie incluse dans les 225 Python | **Partiellement développé** ; C **absent** |
| Optimisation | Sélecteur exhaustif TypeScript de calculs batterie enregistrés | Minimum d’ENS sur un ensemble fini, sans recalcul physique | Fonctions internes authentifiées ; Python `optimization` absent | Algorithme et services simulés inclus dans les 466 tests TS | **Partiellement développé** ; algorithme fini **opérationnel et vérifié localement**, parcours sauvegarde/relecture non vérifié ici |
| Analyse économique | LCOE et flux annuels TypeScript ; hypothèses projet enregistrables | LCOE, VAN, TRI conditionnel, retours et sensibilité locale | Fonctions internes pour hypothèses et sources ; Python `finance` absent | 36 tests financiers inclus dans les 466 TS | **Partiellement développé** ; formules **opérationnelles et vérifiées localement**, analyses de flux non persistées |

« Opérationnel et vérifié localement » qualifie les calculs couverts par les tests, pas une validation scientifique, une recette publiée ou une exécution de bout en bout sur Render. L’absence de moteur Python n’implique pas l’absence de fonctionnalité dans l’application.

### 1.2 Vérifications réalisées

| Preuve | Observation | Portée et limites |
|---|---|---|
| Tests application | `bunx vitest run` : **38 fichiers, 466 tests réussis** | Contrats, calculs et services avec fixtures/mocks ; pas preuve d’isolation réelle |
| Tests Python | `python -m pytest tests -q` : **225 réussis, 2 avertissements** | Environnement temporaire Python **3.13**, PySAM **7.1.1.post1** et pvlib **0.11.2** ; pas reproduction exacte de Python 3.12.7 Render |
| Santé Render | `GET https://energie-renouvelable.onrender.com/api/v1/health` : **HTTP 200**, service 0.1.0, schéma 1.0, production, `auth_configured=true` | État public seulement ; ne prouve pas un calcul authentifié |
| Capacités Render | `/api/v1/capabilities` : **HTTP 200** | PV 1.0.1, éolien 1.0.0, batterie 1.1.0, CSP 1.0.0, biomasse 1.0.0 déclarés disponibles ; `hybrid`, `optimization`, `finance` = `not_implemented` |
| Base active, lectures seules | **3 simulations terminées**, **3 scénarios**, **0** hypothèse financière héritée, **0** résultat financier hérité, **1** hypothèse financière projet | Inventaire privilégié ; ni parcours utilisateur ni preuve de droits entre deux comptes |
| Droits SQL actifs | Écritures `authenticated` interdites sur `simulations` et `simulation_results` ; lecture autorisée sous politiques | Contrôle des GRANT actifs ; ne prouve pas les parcours RLS multi-comptes |
| Interface publiée | Non testée dans cette mission | **Non vérifiable avec les éléments exécutés** |

Les deux avertissements Python concernent une dépréciation du client de test Starlette/httpx et `DatetimeIndex.dayofyear` dans pvlib. Ils ne sont pas des échecs. Les dépendances ont été installées exclusivement dans un environnement temporaire, sans changement des fichiers du projet. Aucun nouveau contrôle de compilation n’est revendiqué : aucun code applicatif n’a été modifié.

### 1.3 Résultats enregistrés réellement observés

- Éolien **niveau A**, version 1.0.0 : période du 5 au 11 janvier 2026, sources explicitement **QA synthétiques**. Une ligne de métrique électrique existe, mais sa seule présence ne prouve pas une valeur électrique calculée au niveau A.
- PV, version 1.0.1 : période du 1er janvier au 31 décembre 2026 ; source « météo fictive 2026, aucune mesure ».
- Batterie, version 1.1.0 : même période annuelle ; références conservées vers la configuration, le PV et une demande fictive QA.
- Aucun run d’optimisation enregistré n’apparaît dans l’inventaire des simulations. Aucun résultat financier n’existe dans la table héritée des résultats financiers.

Ces observations sont des relectures de stockage, **pas une relance ni une recette**. Les résultats synthétiques ne deviennent pas des données de terrain parce qu’un enregistrement est validé ou terminé. Les anciens rapports décrivant zéro simulation ou Render non authentifié sont historiques et ne décrivent plus l’inventaire actuel.

## 2. Fichiers, fonctions et architecture existants

### 2.1 Python et API

| Fichier | Fonction réelle |
|---|---|
| `python-engine/app/engines/registry.py:25–64` | Catalogue prévu et chargement de cinq moteurs ; aucune implémentation hybride, optimisation ou finance |
| `python-engine/app/api/routes/v1.py:16–55` | Santé/capacités publiques ; `POST /api/v1/simulations/validate` et `POST /api/v1/simulations` authentifiés |
| `python-engine/app/api/schemas/contract.py` | Contrat commun des requêtes/réponses, unités, séries et provenance |
| `python-engine/app/services/validation.py` | Validation ; distingue requête valide et moteur réellement disponible |
| `python-engine/app/core/security.py:18–47` | Clé partagée et identité utilisateur vérifiée ; pas identité provenant du JSON |
| `python-engine/app/engines/{pv,wind,battery,csp,biomass}/engine.py` | Moteurs scientifiques individuels existants |
| `python-engine/requirements.txt`, `requirements-dev.txt` | PySAM fixé ; dépendances API ; pvlib de référence et pytest pour les tests |

Il n’existe pas de route spécialisée `/hybrid`, `/optimization` ou `/finance` à appeler. L’API actuelle utilise une route générique avec sélection du moteur. Une capacité déclarée n’est jamais assimilée à une validation scientifique.

Les routes `GET /api/v1/simulations/{id}` et `/results` sont présentes, mais `v1.py:9–13,58–68` utilise **NoRepository** : elles ne constituent pas un stockage Python fonctionnel. Les résultats applicatifs sont persistés puis relus dans Lovable Cloud. Il ne faut pas reconstruire un second dépôt de résultats pour masquer cette distinction. Aucune documentation OpenAPI n’a été supposée disponible.

### 2.2 Systèmes hybrides

| Fichier/fonction | Périmètre |
|---|---|
| `src/features/hybrid/hybrid-model.ts:6–40,63–147` | Configuration, contrôles horaires, limites scientifiques ; `levelC: false` |
| `src/features/hybrid/scenario-comparison.ts:9–62` / `buildScenarioComparison` | Tableau de valeurs individuelles enregistrées ; unités/méthodes/périodes/provenance |
| `src/lib/hybrid-data.server.ts` | Lectures sous droits utilisateur, snapshots, rechargement des références anciennes |
| `src/lib/hybrid-access.server.ts` | Rôles, propriétaire, références projet/site/équipement/demande/simulation |
| `src/lib/hybrid.functions.ts:7–49` | Chargement, comparaison et sauvegarde ; historique dans `scenarios.objectives` |
| `src/features/hybrid/hybrid-workspace.tsx`, `scenario-comparison-panel.tsx` | Interfaces A/B/C et historique ; pas de calcul multi-sources |

Le niveau A accepte des brouillons incomplets. Le niveau B vérifie côté serveur le site historique, le projet, les statuts terminés, versions, sources, natures, unités, méthodes et couverture temporelle. Les indicateurs incompatibles sont indisponibles avec une raison. Il n’additionne pas les productions et ne classe pas automatiquement les scénarios.

L’enveloppe conserve la préparation et les révisions, mais il ne s’agit pas d’un historique immuable normalisé. Les changements de statut ou demandes de revue ne sont pas une approbation scientifique.

### 2.3 Optimisation

| Fichier/fonction | Périmètre |
|---|---|
| `src/services/optimization/stored-battery-contract.ts:6–21` | Objectif ENS en kWh ; 1–12 UUID uniques ; référence dans l’ensemble ; bornes et justifications |
| `src/services/optimization/stored-battery-optimizer.ts:25–72` / `optimizeStoredBatteries` | Filtrage des candidats, minimum exact, ex æquo, ordre déterministe |
| `src/lib/optimization-data.server.ts:9–56` / `prepareOptimization` | Rôles, révision, projet/site, demandes/PV, requêtes et réponses batterie sauvegardées |
| Même fichier `:59–74` | Un INSERT de run avec snapshots ; historique des 30 derniers runs |
| `src/lib/optimization.functions.ts` | Inspection, exécution et historique authentifiés |
| `src/features/hybrid/optimization-panel.tsx` | Configuration du domaine et affichage des résultats |

**Problème mathématique réel :** minimiser l’ENS enregistrée parmi les candidats admissibles sélectionnés. C’est une optimisation exhaustive sur un ensemble discret fini, pas une simple mise côte à côte ; ce n’est ni un dimensionnement continu ni un optimum physique global.

Admissibilité : mêmes profils horaires PV/demande, même périmètre et méthode, versions/stratégie/hypothèses compatibles, provenance vérifiée, état terminé, bornes de capacité, politiques initiale et terminale explicites, énergie finale au moins égale à l’initiale, plafond ENS facultatif. Les contrôles réutilisent le contrat batterie et ses bilans. Aucun nouveau calcul batterie n’est créé. Les candidats rejetés ont des motifs ; l’absence de solution n’est pas enregistrée comme succès.

### 2.4 Analyse économique

| Fichier/fonction | Périmètre |
|---|---|
| `src/features/finance/finance-engine.ts:69–130` / `computeLcoe` | LCOE pur, 7 tests |
| `src/features/finance/cashflow-engine.ts` | Flux, VAN, TRI, retours, sensibilité et garde de comparabilité ; 24 tests |
| `src/features/finance/production-source.ts`, `src/lib/finance-production.functions.ts` | Production annuelle finie positive, kWh, simulation terminée, 365–366 jours ; 5 tests |
| `src/lib/finance.functions.ts:27–66` | Lecture et sauvegarde des hypothèses projet, production liée et historique |
| `src/features/projects/project-finance.tsx` | Hypothèses enregistrées ; LCOE recalculé à l’affichage |
| `src/features/finance/{finance-ui,cashflow-ui}.tsx` | Calculateurs locaux ; flux non sauvegardés |
| `drizzle/migrations/0015…sql`, `0016…sql`, `0017…sql` | Structure et corrections successives de l’historisation des hypothèses ; definitions de code, pas preuve à elles seules d’exécution des triggers |

**Conventions et formules implémentées** — taux réel r et dégradation d exprimés ici en fractions ; t = 1…N :

```text
E_t = E_1 × (1 − d)^(t−1)
LCOE = [CAPEX + Σ (OPEX + R_t)/(1+r)^t] / [Σ E_t/(1+r)^t]
CF_0 = −CAPEX + subvention
CF_t = E_t × (part_vendue × tarif + part_substituée × coût_référence)
       − OPEX − R_t + valeur_résiduelle si t=N
VAN = Σ CF_t/(1+r)^t, t=0…N
```

- Monnaie constante, échéances annuelles en fin d’année ; CAPEX/subvention en année zéro ; pas de fiscalité ni de financement.
- Parts vendue et substituée totalisant au plus 100 % ; coûts déjà inclus ailleurs exclus. Tarifs absents : revenu correspondant nul avec avertissement, pas inventé.
- LCOE en devise/kWh : **CAPEX brut**, OPEX et remplacements, hors subvention, recettes et résiduel.
- TRI par bissection entre −99 % et 1000 % ; indisponible sans changement de signe, avec plusieurs changements, ou sans racine encadrée. Le refus de plusieurs changements est conservateur, pas preuve de plusieurs TRI.
- Retour simple/actualisé : premier cumul non négatif, interpolation intra-annuelle. Il peut ne pas être durablement positif après un remplacement ultérieur.
- Sensibilité : 1–9 variantes relatives, bornées à ±90 %, sans modifier la base. Comparabilité : devise/durée/taux, sans classement.

## 3. Fonctionnalités manquantes ou incomplètes

### 3.1 Combinaisons physiques

| Combinaison | État |
|---|---|
| PV + batterie | Moteur horaire existant avec demande, SOC, charge/décharge, puissances, pertes, surplus et ENS ; résultat QA déjà stocké, pas relancé ici |
| Éolien + batterie | Préparation possible ; moteur batterie actuel alimenté par PV, pas de chaîne éolienne dédiée vérifiée |
| PV + éolien | Préparation/comparaison individuelle seulement ; dispatch commun absent |
| PV + éolien + batterie | Préparation possible ; orchestration chronologique absente |
| PV + biomasse | Préparation seulement ; biomasse primaire distincte de l’électricité, conversion électrique absente |
| Multi-sources avec CSP | Chaleur CSP distincte ; pas de substitution électrique implicite ni de dispatch validé |

Il manque au niveau C : répartition horaire par source, priorité de service/charge, éventuel écrêtement, bilan électrique global, politiques terminales, pertes définies, attribution de l’autoconsommation et part renouvelable. Les résultats individuels ne remplacent pas ces calculs.

### 3.2 Optimisation

Absents : recherche de puissance PV/éolienne optimale, création de nouveaux candidats physiques, optimisation conjointe multi-sources, minimisation des coûts, maximisation de l’autoconsommation, objectifs multicritères. Les puissances et capacités existantes sont **évaluées/sélectionnées**, pas dimensionnées automatiquement. Les contraintes opérationnelles viennent des simulations enregistrées ; aucune contrainte réseau ou vieillissement supplémentaire n’est résolue.

### 3.3 Économie

Disponibles : CAPEX/OPEX agrégés ou postes locaux, remplacements, durée, LCOE, VAN, TRI sous conditions, retours, économies annuelles hypothétiques, sensibilité bornée.

Incomplets/absents : coût nivelé du stockage dédié (LCOS), monétisation basée sur exports/autoconsommation horaires effectivement servis, comparaison économique multi-scénarios persistée, flux nominaux/inflation, fiscalité, dette, escalade tarifaire et OPEX variables. Un poste batterie peut être saisi ; cela ne constitue pas un modèle économique spécialisé du stockage.

**Persistance distincte :** les hypothèses projet LCOE sont stockées ; leurs résultats sont recalculés. Les analyses de flux/VAN/TRI et variantes restent locales. Les tables financières héritées vides ne prouvent pas une sauvegarde fonctionnelle. La proposition de révisions immuables du rapport `VALIDATION_FINANCIAL.md` reste non appliquée.

## 4. Risques techniques et scientifiques

### 4.1 Constats établis dans le code — aucune correction effectuée

| Réserve | Preuve et impact | Qualification |
|---|---|---|
| Contrôle chronologique B moins strict que A | `scenario-comparison.ts:20,48` vérifie présence/égalité mais ne réutilise pas le validateur horaire `hybrid-model.ts:63–86` ; deux séries identiquement mal formées peuvent franchir cette seule garde | Lacune de contrôle démontrée par lecture, incident réel non reproduit |
| Éditeur hybride périmé | `hybrid.functions.ts:27–48` compare la révision relue durant la sauvegarde, pas celle chargée par l’éditeur ; une modification antérieure à cette lecture peut être écrasée | Risque de concurrence établi, non provoqué sur les données |
| Historique d’optimisation non validé à la lecture | `optimization-data.server.ts:70–74` attribue des types à du JSON sans parse runtime ; l’interface attend des tableaux | Risque de panne sur historique malformé ; aucune ligne injectée |
| Optimisation, révision non atomique | Contrôle à `optimization-data.server.ts:18`, INSERT séparé `:59–68` ; aucun verrou/recontrôle transactionnel | Snapshot identifiable, mais changement concurrent possible |
| Rapport optimisation périmé | État local initialisé depuis les props, non réinitialisé systématiquement par révision/modification des champs (`optimization-panel.tsx:27–60`) | Défaut potentiel d’association saisie/résultat, navigateur non reproduit ici |
| Snapshot optimisation incomplet | `optimization-data.server.ts:55–56` omet nom/statut/projectId des candidats présents dans les arguments du sélecteur | Reproduction autonome intégrale à renforcer |
| Production financière incohérente entre chemins | `finance.functions.ts:53–59` n’impose pas unité, année complète, identité PV ou projet non nul ; `production-source.ts` est plus strict | Une source refusée en flux peut être acceptée par la sauvegarde projet |
| Valeurs vides devenant zéro | `Number("")` dans les formulaires finance ; taux/OPEX/dégradation peuvent devenir des zéros implicites | À remplacer par distinction manquant/valeur explicite après approbation |
| Résultats locaux périmés | LCOE autonome non invalidé après saisie ; sensibilité non invalidée à tout changement de variable/variantes | Calcul précédent peut rester visible à côté de nouvelles entrées |
| Remplacements hors durée acceptés au serveur | `finance.functions.ts:5–16` borne l’année à 100, pas à la durée ; le moteur refuse ensuite | Sauvegarde incohérente et message d’erreur trompeur possibles |
| Ancienne production liée non retrouvée | `finance.functions.ts:33,39–43` dépend des 50 dernières simulations | Source valide ancienne peut être présentée comme saisie manuelle |
| Débordements numériques non contrôlés en sortie | `finance-engine.ts:101–129`, `cashflow-engine.ts:154–182` : entrées finies mais aucune garantie de résultats finis | Valeurs extrêmes/taux proches de −100 % à tester et refuser |

L’égalité par `JSON.stringify` des profils/hypothèses d’optimisation est conservatrice : des objets équivalents représentés différemment peuvent être rejetés. Cela ne justifie pas une conversion ou une harmonisation silencieuse.

### 4.2 Sécurité : droits actifs, pas conclusions à partir d’une migration ancienne

- **Simulations et résultats :** GRANT actifs `authenticated` SELECT=true, INSERT/UPDATE/DELETE=false. Les politiques ALL existent encore, mais elles ne réaccordent pas les privilèges révoqués. La suspicion de falsification directe d’un run d’optimisation par un utilisateur fondée sur la migration initiale est donc **écartée dans l’état actif contrôlé**.
- **Tables financières héritées et hypothèses projet :** CRUD `authenticated` actif ; les politiques héritées vérifient propriétaire/admin, celles des hypothèses projet emploient `can_write_resource` pour les écritures. Elles ne suffisent pas à imposer tous les contrats de calcul et références vérifiés seulement par le service. Ne pas réutiliser ces droits comme garantie de résultat financier authentique.
- **Scénarios :** CRUD sous politique propriétaire/admin. L’enveloppe et l’historique ne doivent pas être décrits comme immuables. Le trigger de rôle est présent dans les fichiers de migration ; son exécution effective n’a pas été démontrée dans cet audit. La lecture des métadonnées de triggers n’a fourni aucune ligne exploitable : ce n’est pas une preuve d’absence.
- Aucune écriture négative, tentative inter-comptes ni création de compte n’a été effectuée. **Isolation multi-comptes non validée.** Aucune clé n’a été lue, affichée ou modifiée.

### 4.3 Réserves scientifiques

1. Additionner des productions annuelles ne produit ni un bilan horaire ni une couverture de demande.
2. Flux cinétique éolien, chaleur CSP et énergie primaire biomasse ne sont pas de l’électricité nette.
3. Un bilan batterie cohérent ne valide pas sa physique réelle, ses paramètres ni son vieillissement.
4. Un minimum discret d’ENS ne prouve pas une solution globale, économique ou optimale hors candidats.
5. Parts vendues/substituées fixes et projection géométrique ne sont pas des mesures de recettes futures.
6. Le mot « validé » dans certains commentaires de code n’est pas une preuve d’approbation scientifique de Joël.
7. Les données QA restent fictives ; la validation sur données de terrain manque. Aucun parcours publié connecté n’a été exécuté.

## 5. Feuille de route proposée et décisions

**Aucune mise en œuvre commencée.** Ordre proposé : sécuriser les limites existantes, finaliser la finance sans duplications, définir puis développer C, étendre l’optimisation seulement sur des modèles validés.

| Priorité | Travail proposé | Réutilisation et fichiers possibles | Données/approbation nécessaires | Tests et critère de fin |
|---|---|---|---|---|
| P0 | Fermer les écarts de validation et états périmés | Validateur horaire A pour B ; `hybrid.functions.ts`, `optimization-data.server.ts`, formulaires et fonctions finance | Approbation des corrections, conventions d’année et de références | Régressions ciblées, séries dupliquées/non horaires, révision périmée, historique malformé, manquants distincts de zéro, valeurs extrêmes ; aucune ancienne sortie modifiée |
| P1 | Persister les analyses financières avec provenance et révisions | Moteurs purs existants ; proposition 18.2, fonctions internes et stockage append-only à finaliser | Conservation, rôles, devise/taux réel, sources des postes/tarifs/remplacements, transaction atomique | Recalcul serveur avec moteur unique ; sauvegarde/relecture exacte ; ancienne révision intacte ; refus sortie fabriquée/référence inaccessible ; rollback/concurrence ; tests A/B autorisés |
| P2 | Définir le contrat hybride C, initialement PV+éolien puis batterie | Contrat commun, sorties électriques PV/éolien appropriées et noyau batterie existant ; futur `python-engine/app/engines/hybrid/`, registre et validations | Dispatch, priorités, pertes, limites puissance, SOC initial/terminal ; séries UTC réellement alignées, sources documentées ; validation Joël | Bilans horaires indépendants, zéro/absence distincts, puissance/SOC/ENS/surplus ; aucun double stockage ni conversion ; run Render sauvegardé puis relu sous compte autorisé |
| P3 | Étendre l’optimisation au domaine physique approuvé | Sélecteur fini et snapshots existants, appels aux moteurs validés | Variables/bornes/pas/budget calcul, objectif unique ou méthode multicritère approuvée, contraintes vérifiables | Exhaustivité ou statut d’approximation prouvé ; mêmes entrées et versions ; optimum limité au domaine ; absence de solution explicite ; pas second moteur physique |
| P4 | Économie du stockage et comparaison des scénarios | Finance existante + flux effectivement servis/exportés | CAPEX/OPEX/remplacements batterie, durée/cycles et périmètre du LCOS ; recettes sourcées | Références indépendantes, absence de double comptage, comparabilité technique/temporelle/monétaire ; aucune extrapolation implicite |
| P5 | Recette scientifique et livraison | Rapports et matrices d’isolation existants | Données réelles et second compte non privilégié explicitement autorisé ; version publiée désignée | Parcours connectés A/B, refus croisés, console/appels, sauvegarde/relecture, validation signée de Joël ; pas publication automatique |

**API future :** pour C, conserver `POST /api/v1/simulations/validate` et `/simulations` avec un véritable moteur `hybrid` enregistré. Pour l’optimisation élargie, définir le contrat et choisir l’orchestration avant toute nouvelle route. Pour la finance, conserver de préférence le moteur TypeScript unique et ses fonctions internes ; un déplacement vers Python reste une décision explicite, avec références croisées avant remplacement. Aucune route proposée n’est annoncée comme existante.

### Décisions attendues de Joël

1. Approuver le rapport et choisir la première étape ; aucune approbation précédente d’un audit ne vaut accord d’implémentation.
2. Confirmer finance TypeScript conservée ou transfert Python justifié ; éviter deux copies divergentes des formules.
3. Confirmer révisions financières immuables, provenance requise et droits de sauvegarde.
4. Valider le dispatch hybride, les frontières énergétiques, pertes et politiques SOC avant C.
5. Définir objectifs/domaines/budget d’optimisation étendue.
6. Fournir données réelles et autoriser les comptes/parcours nécessaires à la recette.

### Conclusion

La plateforme dispose déjà d’une préparation/comparaison hybride, d’une optimisation finie de candidats batterie et de calculs financiers déterministes. **Les trois moteurs homonymes restent absents de Python**, ce qui est cohérent avec les capacités Render observées. Le couplage PV+batterie existe mais ne prouve pas une orchestration multi-sources. Les réserves de validation, persistance et interface doivent être levées avant extension et livraison ; aucun résultat scientifique, économique ou d’isolation non exécuté n’est déclaré validé.