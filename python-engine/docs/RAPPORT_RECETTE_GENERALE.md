# RAPPORT DE RECETTE GÉNÉRALE — PLATEFORME ÉNERGIE RENOUVELABLE

Date : 08/11/2026 — Auditeur : assistant de développement — Commanditaire : M. Joël (N'guessan Joël Dje)
Périmètre : audit final, recette des parcours métier, sécurité, stockage, validation technique, préparation de livraison.
Règle appliquée : aucune réécriture de module, aucune formule modifiée, aucune donnée supprimée, aucune migration, aucun résultat synthétique présenté comme réel.

---

## 1. Architecture et modules examinés

- Application : TanStack Start (React 19, SSR), hébergée sur la plateforme Lovable ; backend Lovable Cloud (base de données, authentification, stockage privé).
- Moteur scientifique : service Python/FastAPI séparé, hébergé sur Render (`energie-renouvelable.onrender.com`), appelé uniquement côté serveur avec une clé partagée jamais exposée au navigateur.
- 44 tables applicatives, toutes protégées par des politiques d'accès (RLS) ; 25 migrations appliquées, toutes additives.
- 57 routes authentifiées couvrant : tableau de bord, territoires, ressources (solaire, éolien, biomasse, déchets), demande, technologies, stockage, simulations, hybrides/scénarios, optimisation, finance, projets, importations, rapports, paramètres, testeurs.
- Documents de validation relus (tous présents) : VALIDATION_PV, VALIDATION_WIND, VALIDATION_BIOMASS, VALIDATION_CSP, VALIDATION_BATTERY, VALIDATION_HYBRID, VALIDATION_SCENARIOS, VALIDATION_OPTIMIZATION, VALIDATION_FINANCIAL, VALIDATION_IMPORTS, VALIDATION_INTERFACES, DEPLOYMENT_RENDER, DEPLOYMENT_READINESS.

## 2. État de chaque fonctionnalité

| Module | État |
|---|---|
| Territoires et localités | Opérationnel (357 localités, import CSV/XLSX) |
| Ressources solaire/éolien/biomasse/déchets | Opérationnel, fiches détaillées et statuts de validation |
| Météo par site | Opérationnel (séries horaires, import fichier et service en ligne) |
| Demande énergétique | Opérationnel (profils horaires, équipements, validation) |
| Simulation PV horaire | Opérationnel via moteur Render (PVWatts v8 / PySAM officiel NREL) |
| Simulation éolienne | Opérationnel niveau A ; niveaux B/C limités et documentés |
| Bilan primaire biomasse | Opérationnel (énergie primaire uniquement, pas de conversion électrique) |
| Simulation batterie | Opérationnelle (bilan horaire, SOC, énergie non servie) |
| CSP | Bilan thermique limité uniquement ; pas une simulation de centrale complète |
| Systèmes hybrides | Comparaison de résultats individuels ; dispatch chronologique synchronisé NON disponible |
| Comparaison de scénarios | Opérationnelle (contrôles serveur de compatibilité) |
| Optimisation | V1 : sélection exhaustive de configurations batterie enregistrées ; non validée scientifiquement |
| Analyse financière | Opérationnelle (VAN, TRI, retour, LCOE ; hypothèses visibles et versionnées) |
| Importation de documents | Opérationnelle (PDF/XLSX/CSV/DOCX, extraction, corrections, validation humaine, historique) |
| Rapports | Structure présente ; génération à éprouver sur un projet réel |

Fonctionnalités nécessitant une configuration externe : toutes les simulations scientifiques dépendent du service Render (actuellement en ligne et authentifié).
Fonctionnalités nécessitant la validation scientifique de M. Joël : tous les moteurs (PV, éolien, biomasse, batterie, CSP, optimisation).

## 3. Résultats des tests

- TypeScript : 447 tests réussis (35 fichiers), 0 échec.
- Python (moteur) : 225 tests réussis, 0 échec.
- Vérification de typage : OK.
- Build de production : OK (aucune erreur journalisée).

## 4. Résultats des parcours métier (navigateur, compte administrateur de M. Joël)

Neuf parcours exécutés dans le navigateur, sans erreur console ni erreur d'exécution :

- A. Ressources : territoires → localités → ressources solaires → fiche détaillée avec statut de validation. Vérifié.
- B. Photovoltaïque : résultats de la simulation QA 8 760 h (15 500 kWh, productible 1 550 kWh/kWc, facteur de capacité 17,7 %). Chaque entrée est affichée avec sa provenance ; toutes les données sont marquées « QA synthétique — aucune mesure » et les paramètres « assumption ». Vérifié.
- C. Éolien : résultats niveau A (statistiques de vent sur 168 h, sans production — conforme au niveau). Vérifié.
- D. Biomasse : page et fiches accessibles ; bilan primaire distinct de toute production électrique. Vérifié.
- E. Batterie : bilan horaire complet (couverture 81,065 %, autoconsommation 87,16 %, énergie non servie 3 025,722 kWh, pertes charge/décharge, SOC final, courbe SOC sur 8 760 h). Vérifié.
- F. CSP : formulaire présent avec limites explicites. Vérifié.
- G. Hybrides/scénarios : comparaison de résultats individuels, clairement distinguée d'une simulation synchronisée. Vérifié.
- H. Analyse financière : page opérationnelle, hypothèses visibles. Vérifié (aucune rentabilité réelle simulée : données QA).
- I. Importation : parcours complet dépôt → extraction → correction → validation → historique vérifié le 08/11/2026 ; la validation humaine n'entraîne aucune intégration automatique dans les fiches scientifiques. Vérifié.

Toutes les données utilisées sont synthétiques et marquées comme telles ; aucune n'est une mesure réelle.

## 5. État des moteurs scientifiques

Service Render : santé OK, version 0.1.0, schéma 1.0, environnement production, authentification configurée.
Cinq moteurs déclarés disponibles par le service : photovoltaïque 1.0.1, CSP 1.0.0, éolien, batterie, biomasse.
Preuves d'exécution réelle : trois simulations QA terminées (PV, éolien A, batterie) calculées par le service et relues en base.
Aucun moteur n'est déclaré disponible sur la seule base de son interface.

## 6. État du stockage et des importations

- Bucket privé `project-imports` : accès limité au dossier de chaque utilisateur ; liens signés de 5 minutes.
- Inventaire des objets orphelins : 9 objets privés `mesures-qa.csv` (quelques centaines d'octets chacun) créés pendant les essais du module d'importation, sans ligne en base. Non supprimés (la suppression directe est bloquée par une protection de la plateforme ; suppression possible via l'API de stockage sur décision de M. Joël).
- Aucun document utilisateur réel n'est affecté.

## 7. État des permissions

- Rôles en base : 1 administrateur (M. Joël), 1 ingénieur, 5 lecteurs.
- Les 44 tables ont au moins une politique d'accès active ; les tables de ressources, demandes, batteries et configurations appliquent la règle propriétaire/administrateur ; les historiques sont interdits à la modification et à la suppression.
- Aucun secret n'est exposé au navigateur : la clé du moteur n'est lue que côté serveur.
- Isolation multi-comptes : NON validée. Aucune paire de comptes QA non administrateurs n'a été désignée et autorisée ; la matrice de tests ISO-01–10 est prête dans VALIDATION_INTERFACES.md.

## 8. Vérifications locales

Toutes effectuées sur l'environnement de prévisualisation : tests, typage, build, parcours navigateur A–I, fiche solaire, santé du moteur Render.

## 9. Vérifications sur la version publiée

Non effectuées dans cette recette. La version publiée (energie-renouvelable.lovable.app) n'a pas été re-contrôlée ; le domaine personnalisé est en attente de configuration DNS. À faire avant toute démonstration externe.

## 10. Blocages et risques

1. Validation scientifique des moteurs par M. Joël : non réalisée (prévue par conception).
2. Isolation entre comptes : non vérifiable sans second compte QA autorisé.
3. Version publiée et domaine personnalisé : non contrôlés.
4. Données réelles : absentes ; tous les résultats actuels proviennent de données synthétiques QA.
5. Dispatch hybride chronologique synchronisé : non implémenté (comparaison uniquement).
6. Optimisation : V1 non validée scientifiquement.
7. CSP : bilan thermique limité, pas de simulation de centrale.
8. 9 objets orphelins de test dans le stockage privé (sans impact, suppression sur décision).

## 11. Validations attendues de M. Joël

1. Validation scientifique des modèles PV (PVWatts v8), éolien (courbes A/B/C), biomasse (bilan primaire), batterie (réservoir + rendements), CSP (bilan limité).
2. Fourniture de données réelles : météo annuelle, demande horaire, paramètres PV du site, courbes de puissance de turbines, fiches batteries.
3. Désignation d'un second compte QA pour les tests d'isolation.
4. Décision sur la suppression des 9 objets orphelins de test.
5. Décision sur la publication d'une nouvelle version et la configuration DNS du domaine personnalisé.
6. Validation des hypothèses financières par défaut avant toute étude réelle.

## 12. Recommandation finale

**Prêt pour une démonstration contrôlée.**

La plateforme est cohérente, traçable et techniquement honnête : chaque résultat est relié à ses données, hypothèses et provenance, et les données synthétiques sont explicitement marquées. Elle n'est pas prête pour une recette scientifique (validation des modèles par M. Joël requise) ni pour une mise en production (données réelles, isolation multi-comptes et version publiée à vérifier).

Scénarios de démonstration proposés :
1. Parcours PV complet : météo QA → simulation 8 760 h → résultats tracés.
2. Parcours batterie : configuration → bilan horaire → couverture et énergie non servie.
3. Comparaison PV seul / PV + batterie dans le tableau multi-scénarios.
4. Importation d'un document réel : extraction → correction → validation → historique.
5. Analyse financière d'un projet avec hypothèses visibles et modifiables.
