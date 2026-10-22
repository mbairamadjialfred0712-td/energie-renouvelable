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
