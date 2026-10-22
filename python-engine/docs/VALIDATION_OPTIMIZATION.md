# PROMPT 17 — Validation de l’optimisation énergétique

Date : 22 octobre 2026. Compétence de référence : energie-renouvelable.

## 1. État initial et audit de faisabilité

RÉUSSI : audit des contrats, registres, interfaces, scénarios, persistance et contrôles existants, avec deux investigations indépendantes (moteurs ; sauvegarde/permissions). `src/services/optimization/contracts.ts` était un type descriptif sans algorithme. Python annonce optimization/hybrid/finance `not_implemented`. La comparaison de scénarios n’effectue ni classement ni optimisation et reste inchangée dans sa fonction.

| Modèle | Périmètre réel | Entrées, sorties, limites | Classe actuelle |
|---|---|---|---|
| PV | PVWatts/PySAM, 8760 heures | météo GHI/DNI/DHI/température/vent, site et système kWc ; AC kWh, production mensuelle ; pas énergie servie hybride | A local ; D hébergé |
| Batterie | Réservoir + rendements, horaire | PV/demande kWh/heure, capacité de référence kWh, puissances kW, SOC/rendements %, stratégie ; ENS/flux/SOC en kWh ; pas vieillissement/autonomie garantie | A local ; D hébergé |
| Éolien | A ressource, B flux, C courbe | vent/hauteur, courbe documentée pour électricité ; flux cinétique distinct ; pas pertes supposées | A local ; D hébergé |
| Biomasse | Énergie primaire annuelle | masse/PCI/bases/période/qualité ; MWh/an primaire ; mobilisation et conversion électrique absentes | A local ; D hébergé |
| CSP | Bilan prescrit | DNI/aire/optique/pertes/température/fluide ; chaleur et électricité séparées, sorties indisponibles possibles | A local ; D hébergé |
| Hybride coordonné | Préparation et comparaison seulement | pas orchestration commune ni dispatch | E absent |
| Finance | LCOE TypeScript projet | hypothèses explicites, production annuelle ; pas coût complet lié à tous candidats batterie | C partiel pour optimisation |
| Optimisation V1 | Énumération de résultats batterie déjà calculés | pas relance scientifique ni nouvelles puissances | A local ; D parcours avec candidats réels |

A : testé localement ; B : validé hébergé ; C : partiel ; D : bloqué ; E : absent. Aucun calcul n'est classé B. Les contrats requis sont inspectés mais leur existence ne prouve pas la validation scientifique. Des relances individuelles sécurisées existent ; aucun chemin de recherche physique multi-candidat sécurisé et vérifié n'est présumé disponible. Les registres available ne prouvent pas la disponibilité opérationnelle.

## 2. Problème mathématique effectivement résolu

Soit C un ensemble explicitement sélectionné de 1 à 12 identifiants de simulations batterie enregistrées. A est le sous-ensemble admissible après vérification. La V1 énumère C et retourne tous les identifiants minimisant f(c) = `energy_not_served(c)` en kWh sur A.

- Variable de décision : identifiant catégoriel d’une configuration **déjà calculée** ; domaine discret intégral, aucun pas continu/interpolation.
- Objectif unique : minimiser l’énergie non servie calculée du modèle PV + batterie. Ce n'est pas nécessairement une énergie de panne réelle si un réseau fournit le déficit.
- Bornes : capacité **de référence avant réduction SOC** minimale/maximale en kWh, saisies explicitement et justifiées ; bornes inclusives. Elles filtrent les configurations enregistrées, ne génèrent pas de nouvelles capacités.
- Contrainte facultative : plafond ENS en kWh, sinon explicitement absent, pas zéro.
- Source du domaine et justification des contraintes obligatoires.
- Aucune pondération, front de Pareto, coût, mobilisation biomasse, optimisation de dispatch, nouvelle simulation hybride ni mélange d’unités.

La méthode est une énumération déterministe exhaustive, pas une recherche approchée. Optimum démontré **sur A uniquement**, jamais sur l’ensemble physique/continu des systèmes. Ex æquo retournés ensemble, tri d’identifiants déterministe ; le premier sert seulement à la vue avant/après, pas à une décision de l’ingénieur. Un candidat admissible seul ne démontre aucun gain face à d’autres configurations.

## 3. Admissibilité et contraintes

RÉUSSI tests locaux :

1. Identité authentifiée, admin/ingénieur ; ingénieur propriétaire du scénario, admin autorisé ; site/projet accessibles sous RLS et de même localité ; révision enregistrée inchangée.
2. Candidats accessibles, moteur batterie terminé, identité de réponse/date/version connues, sources et nature des entrées ; contrat complet, pas de null/valeur non finie substituée.
3. Source historique : configuration de stockage validée et instantané, lien PV terminé du même projet, confirmation historique de demande projet. Site établi à partir du **snapshot historique PV**, pas d’une association actuelle inventée.
4. Revalidation des résultats par `checkBatteryResponse` : tous les bilans/SOC/puissances/rendements et agrégats existants, sans recalcul du dispatch. Aucune seconde formule énergétique.
5. Même objet de séries que la référence : valeurs PV/demande, sources, unités, nature, horodatages, UTC, convention et période ; même stratégie/hypothèses, version et méthode ENS. Égalité stricte, aucune conversion/annualisation.
6. Même énergie initiale mobilisable E × (SOCinitial − SOCmin)/100. Tolérance de comparaison 1e−9 relative/absolue ; stock final au moins initial (tolérance absolue 1e−9 kWh). Ces politiques sont exposées et obligatoires en V1, sans option cachée. Les SOC absolus/capacités peuvent différer, leurs valeurs sont conservées.
7. Capacité dans bornes, ENS non négative dans plafond lorsqu’il existe.

Une contrainte échouée rend le candidat inadmissible, motif conservé. Référence absente/incomplète => blocked, pas de réussite enregistrée. Référence complète mais aucun candidat admissible => no_feasible et statut de stockage failed. La V1 ne vérifie pas coût, budget, réseau, constructeur au-delà du snapshot, vieillissement, autonomie ou rendement réel de terrain. Ces limites sont affichées, jamais déclarées satisfaites.

## 4. Réutilisation et fichiers

Ajoutés :
- `src/services/optimization/stored-battery-contract.ts` : schéma versionné du problème et contrats de sortie.
- `src/services/optimization/stored-battery-optimizer.ts` : sélection finie pure, côté serveur uniquement (provenance réutilisée).
- `src/services/optimization/stored-battery-optimizer.test.ts` : 30 tests, fixtures arithmétiques synthétiques hors base.
- `src/lib/optimization-data.server.ts` et `optimization.functions.ts` : lecture sous RLS, préparation/exécution authentifiées, persistance et historique.
- `src/lib/optimization-data.test.ts` : 8 tests de permissions/révision et persistance avec client simulé.
- `src/features/hybrid/optimization-panel.tsx` : onglet, domaine/référence/bornes/justifications, contrôle, résultat/historique.
- Présent document.

Modifiés : `hybrid-model.ts` (champ optionnel optimization compatible avec anciennes enveloppes), `hybrid-access.server.ts`, `hybrid-data.server.ts`, `hybrid.functions.ts` (références anciennes rechargées), `hybrid-workspace.tsx`, `engine.functions.ts` et page résultats (lecture des runs sans les présenter comme simulation physique), `AGENTS.md`, `roadmap.md`.

**Aucune migration**, table nouvelle, modification de moteur Python, formule, secret, rôle ou déploiement. Le type descriptif initial d’optimisation est conservé ; le nouveau contrat spécialisé n’est pas une seconde architecture de persistance.

## 5. Sauvegarde et traçabilité

Problème éditable stocké dans le même `scenarios.objectives.config.optimization`, sous `kind=hybrid_preparation`, garde de rôle existant et historique réutilisés. Aucun score/winner trusted dans cet objet éditable.

Exécution : lecture des identifiants et valeurs sous les droits utilisateur ; contrôle rôle/propriétaire/révision ; import privileged seulement après ces contrôles. **Une seule INSERT simulations** stocke le snapshot complet problem/report/candidats/requêtes/réponses/sources/version/date début-fin/révision. Pas de lignes simulation_results à finaliser partiellement, ni de résultat scientifique copié/requalifié. Chaque lancement crée une ligne indépendante ; les anciennes exécutions ne sont jamais mises à jour par ce chemin. Comparaison avant/après uniquement si référence elle-même admissible, différences ENS et capacité kWh ; pas coût ni pourcentage inventé.

`completed` uniquement pour sélection admissible ; no_feasible enregistré failed avec sa distinction dans report ; blocked n’est pas enregistré. Erreur INSERT => aucun succès confirmé. Relecture sous RLS via onglet/historique et page résultats existante. Historique des 30 runs les plus récents par configuration ; limitation explicite, pas pagination nouvelle.

Limites : browser-protected ne veut pas dire immuable face à une opération administrative privileged ; pas de nouvelle garantie d’immutabilité absolue. Pas de clé d’idempotence : lancements simultanés peuvent créer des snapshots identiques indépendants, sans modifier les précédents ; aucune orchestration/job infinie. Révision contrôlée au départ, un changement ultérieur n’altère pas le snapshot déjà lu, indiqué « configuration modifiée depuis ». Snapshot d’entrées réel nécessaire pour rejouer scientifiquement ; l’optimiseur conserve celles qu’il a lues.

## 6. Limites d’exécution et sécurité

- 1–12 candidats uniques, schéma strict et bornes finies positives ; contraintes et limites validées au serveur.
- Maximum 8784 pas via contrat existant ; revalidation O(candidats × heures), énumération finie. Aucun appel à Render, donc absence de dépendance aux secrets pour sélectionner des résultats préexistants.
- Lecture limitée aux ID explicites ; préparation deadline 15 s et signal d’annulation réseau partagé. Dépassement/refus => pas de sauvegarde.
- Boutons désactivés en exécution et tant que problème non enregistré ; pas de progrès fictif, annulation asynchrone non implémentée. Les contrôles de deadline ne constituent pas une mesure de performance de charge concurrente.
- Privilèges actuels relus : authenticated peut SELECT mais pas INSERT/UPDATE simulations et simulation_results ; scénarios CRUD sous RLS ; politiques owner/admin constatées.
- Aucun secret dans requête UI ni dans sortie ; erreurs publiques propres et métadonnées étrangères non retournées quand ID inaccessible.
- NON EXÉCUTÉ : test de charge concurrente/idempotence, panne réseau pendant INSERT, isolation réelle entre deux comptes.

## 7. Tests TypeScript réellement exécutés

RÉUSSI : **384 tests, 29 fichiers**, suite `bunx vitest run` complète après corrections. Les 38 nouveaux tests vérifient objectif/ENS 1,4 et 0 kWh, optimum borné/ex æquo/reproductibilité, delta −1,4 kWh et +2 kWh, bornes 2–4 inclusives/hors bornes/inversées, plafond ENS, unité MWh rejetée, 13 candidats rejetés, doublons, absence de référence, états non terminés, site/provenance/demande identique dans valeurs, null, agrégat corrompu, stock final et biais initial, version, séries manquantes, lecture d’enveloppe, permissions, révision obsolète, persistance/relecture mocked, no_feasible failed et erreur d’écriture. Aucun test supprimé/désactivé.

RÉUSSI : sauvegarde/relecture sur **client simulé**, pas sur base hébergée ; ne pas qualifier ces tests d’intégration hébergée. Les tests HTTP existants couvrent erreurs des moteurs ; la V1 ne les appelle pas et n’annonce pas une validation hébergée de ces chemins.

## 8. Tests Python réellement exécutés

RÉUSSI : **225 tests**, `/tmp/scenario-python-env/bin/python -m pytest python-engine/tests -q`. Environnement temporaire Python 3.13, pas preuve du runtime hébergé 3.12. Un avertissement préexistant Starlette/httpx. Aucun moteur Python ou test existant modifié ; pas de deuxième optimiseur Python ajouté pour dupliquer la sélection serveur TypeScript.

## 9. Compilation et interface

RÉUSSI : compilation automatique du preview build OK dans le journal après modifications. Erreur transitoire de type non sérialisable `sources: unknown` corrigée vers JSON ; pas de build/typecheck manuel.

RÉUSSI : navigateur authentifié avec le compte administrateur Joël, `/scenarios` → Optimisation ; état sans calcul batterie, bouton lancement désactivé, tentative de sauvegarde incomplète refusée avec message lisible ; aucune donnée persistée. Vérification desktop 1280×1800 et téléphone 390×844, formulaire inspecté, document largeur 390, zéro erreur JavaScript. Aucun chiffre résultat affiché. Les valeurs 2/4 saisies pour tester le refus n’ont pas été sauvegardées.

## 10. Intégration hébergée et état Render actualisé

RÉUSSI contrôle réel au début de cette intervention : `/api/v1/health` HTTP 200, status ok, environment production, **auth_configured=false** ; `/api/v1/capabilities` 200, cinq moteurs annoncés available, optimization/hybrid/finance not_implemented. Aucun redéploiement/changement de configuration.

RÉUSSI lecture base : **0 simulations, 0 résultats** pendant cette intervention. Aucun candidat scientifique fictif créé. Le parcours central exécution → sauvegarde → relecture sur données réelles est **BLOQUÉ**, pas validé par le contrôle sans données. Référence PV historique avec site requis ; le chemin PV actuel peut conserver source_snapshot null : aucun site ne sera inféré pour rendre un candidat admissible. Ce point de provenance doit être fourni/corrigé explicitement dans une intervention de simulation, pas contourné ici.

## 11. Risques et validations requises

- BLOQUÉ : produire des calculs PV/batterie terminés compatibles, avec site/provenance historiques et demande documentée, après authentification sécurisée Render. Tester ensuite sélection → sauvegarde → relecture réelle.
- BLOQUÉ : isolation réelle deux comptes QA explicitement autorisés ; tests unitaires de rôles/politiques ne la remplacent pas.
- Validation de Joël : objectif ENS du modèle, politique énergie initiale mobilisable/stock terminal, domaine et bornes documentés, conditions de site/PV/demande, tolérances, acceptation physique des moteurs. Un résultat pending conserve ce statut.
- Extensions seulement après données/modèles : relances de puissances PV, choix stockage fabricant, coût complet/budget, plusieurs objectifs et Pareto, demande/site certifiés, orchestration hybride. Rien de ceci n’est implicitement disponible dans la V1.
- L’optimiseur n’est **pas déclaré validé scientifiquement ni prêt en production**. Le module Python optimization reste honnêtement not_implemented ; cette V1 est une sélection côté serveur de calculs enregistrés.

## 12. Livraison

Document versionné : `python-engine/docs/VALIDATION_OPTIMIZATION.md`.
Copie utilisateur : `PROMPT_17_RAPPORT_OPTIMISATION.md`.
Captures temporaires : `/tmp/browser/optimization/desktop.png`, `mobile.png`.
Statuts employés : RÉUSSI vérifié, ÉCHEC exécuté incorrect, BLOQUÉ prérequis absent, NON EXÉCUTÉ non testé. Le rapport distingue calculs locaux, sauvegarde simulée, accès réel et calcul hébergé indisponible.