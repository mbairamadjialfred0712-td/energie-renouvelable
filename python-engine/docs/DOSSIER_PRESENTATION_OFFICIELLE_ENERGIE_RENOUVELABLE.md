# Dossier de présentation officielle — ENERGIE RENOUVELABLE

Version du 13/11/2026 — Propriétaire fonctionnel : M. N'guessan Joël Dje, ingénieur en énergie.
Documents associés : Note exécutive, Guide de défense orale, État de maturité (même dossier).

> **Encadré de synthèse.** Plateforme web d'aide à l'analyse, à la conception et à l'évaluation de solutions renouvelables. Chaîne complète et traçable, moteurs versionnés, sécurité par rôles. Maturité : prototype avancé, démonstration contrôlée. Toutes les démonstrations actuelles reposent sur des données synthétiques. Aucun moteur n'est encore validé scientifiquement par l'ingénieur.

---

## Partie I — Audit documentaire

### Documents consultés
| Document | Date | Statut |
|---|---|---|
| RAPPORT_RECETTE_GENERALE.md | 08/11/2026 | Consulté |
| VALIDATION_TERRITORIES.md | PROMPT 21.1 | Consulté |
| STRATEGIE_REFERENTIEL_DEMOGRAPHIQUE.md | 12/11/2026 | Consulté |
| VALIDATION_PV / WIND / BIOMASS / CSP / BATTERY | antérieurs | Consultés |
| VALIDATION_HYBRID / SCENARIOS / OPTIMIZATION / FINANCIAL / IMPORTS | antérieurs | Consultés |
| VALIDATION_INTERFACES.md (racine du projet) | antérieur | Consulté |
| DEPLOYMENT_RENDER.md, DEPLOYMENT_READINESS.md, render.yaml | antérieurs | Consultés |
| PLAN_DEMONSTRATION_CLIENT.md | — | **Absent** |
| GRILLE_VALIDATION_SCIENTIFIQUE.md | — | **Absent** |
| PLAN_LEVEE_RESERVES.md | — | **Absent** |
| CHECKLIST_PREPRODUCTION.md | — | **Absent** |

### Contradictions relevées (état le plus récent retenu)
1. **Démographie** : le cahier des charges indique « aucune mise à jour automatique ». Depuis le 11/11/2026, un import automatique Banque mondiale existe (hebdomadaire + bouton administrateur) et a écrit 211 valeurs pays ; les valeurs d'autres sources (ANStat) ne sont jamais écrasées. 35 pays sans donnée sont signalés.
2. **Tables** : 44 tables protégées lors de la recette ; 45 aujourd'hui (2 tables d'historique d'import ajoutées ; écart de comptage d'une unité non expliqué par les rapports).
3. **Comptes** : 5 lecteurs selon la recette, 7 aujourd'hui (1 administrateur, 1 ingénieur).
4. **Tests** : 447 (recette) → 456 (démographie) → 466 ce jour. Suites TypeScript cumulatives, non additionnables aux 225 tests Python (suite distincte).

### Niveaux de validation utilisés
N1 implémenté · N2 testé localement · N3 testé sur Render · N4 vérifié dans la version publiée · N5 validé scientifiquement · DEV en développement. Détail par fonctionnalité : `ETAT_MATURITE_LOGICIEL_ENERGIE_RENOUVELABLE.md`.

---

## Partie II — Identité du logiciel
- **Vision** : faire de chaque étude énergétique territoriale un dossier traçable, reproductible et défendable.
- **Mission** : DONNÉES → RESSOURCES → DEMANDE → DIMENSIONNEMENT → SIMULATION → SCÉNARIOS → OPTIMISATION → FINANCE → RAPPORT.
- **Problème** : données dispersées, hypothèses implicites, calculs non reproductibles.
- **Utilisateurs** : ingénieurs énergéticiens, bureaux d'études, analystes, développeurs de projets, décideurs.
- **Contextes** : électrification rurale, mini-réseaux, études de préfaisabilité, comparaison de technologies, dialogue avec partenaires.
- **Positionnement** : outil d'aide à la décision. Les résultats dépendent de la qualité des données, des hypothèses, des modèles et de leur validation. Il ne remplace ni l'ingénieur, ni le terrain.

---

## Partie III — Architecture technique

```text
 Navigateur (utilisateur)
        |
        v
 Application web  (React 19, TypeScript, Tailwind CSS, TanStack Start)
        |   fonctions serveur (clés jamais envoyées au navigateur)
        +-----------------------------+
        v                             v
 Lovable Cloud                  Moteur scientifique Python
 - authentification             (FastAPI, hébergé sur Render)
 - base PostgreSQL + RLS        - /api/v1/health, /capabilities
 - stockage privé de fichiers   - /simulations/validate, /simulations
 - historiques                  - PV (PySAM PVWatts v8), éolien,
                                  batterie, CSP, biomasse
```

1. **Interface** : application web (React, TypeScript, Tailwind CSS) ; 60+ pages authentifiées : tableau de bord, territoires, ressources, météo, demande, technologies, stockage, simulations, scénarios, finance, projets, importations, rapports, paramètres.
2. **Base et utilisateurs** : Lovable Cloud (base PostgreSQL). Hiérarchie Pays → Région → Département → Localité → Site. Rôles réellement configurés : administrateur (1), ingénieur (1), analyste (0), lecteur (7). Les permissions sont appliquées en base et dans les fonctions serveur.
3. **Moteur Python** : service FastAPI séparé sur Render (Python 3.12.7 ; dépendances : FastAPI, Pydantic, httpx, uvicorn, NREL PySAM 7.1.1). Appelé uniquement par le serveur de l'application avec une clé partagée et le jeton de l'utilisateur. En ligne et authentifié le 13/11/2026.
4. **Sécurité** : authentification obligatoire ; règles d'accès (RLS) sur les 45 tables ; espace de fichiers privé `project-imports` ; secrets uniquement côté serveur ; historiques pour demandes, batteries, configurations, importations, finances, rôles, imports démographiques. *La présence de règles n'équivaut pas à une validation de leur efficacité : le test d'isolation entre deux comptes autorisés n'a pas été réalisé.*

---

## Partie IV — Modules métier
Pour chaque module : objectif · fonctionnement · données · traitements · résultats · utilité · limites · statut.

### 1. Territoires et démographie
- Objectif : référentiel géographique des études. Pays (247), localités de référence (357), régions, départements, sites d'étude.
- Démographie : population nationale avec valeur, année, source, méthode (recensement / estimation / projection). Côte d'Ivoire : 33 293 101 hab., **projection ANStat 2026** (≠ recensement). Localités : estimations GeoNames (extraction 05/10/2026) ; leur somme (22,4 M) n'est pas une population nationale.
- Suivi : comparaison à la Banque mondiale (indicateur SP.POP.TOTL), signalement des nouvelles publications et des écarts > 0,5 % à source et année identiques ; import automatique hebdomadaire (voir contradiction 1) avec historique et alerte des pays sans donnée (lecture réservée aux administrateurs).
- Limites : pas de niveau commune distinct ; pas de données régionales ; import direct sans relecture. Statut : N1–N2.

### 2. Ressources solaires
Indicateurs : GHI, DNI, DHI (unités explicites), irradiation annuelle, températures moyenne/min/max, durée d'ensoleillement, période, nature de la donnée, statut. Utilité : PV (GHI/DHI) et CSP (DNI). Limites : aucune ressource réelle validée sur le site QA. Statut : N1–N2.

### 3. Ressources éoliennes
Vitesse moyenne et maximale, hauteur de mesure, direction, densité de l'air, facteur de capacité et méthode, séries et distributions. Niveaux d'analyse A/B/C côté moteur. Limite : une vitesse moyenne seule n'est pas suffisante pour une étude détaillée. Statut : N1–N2.

### 4. Biomasse et déchets
Type, quantité annuelle (t/an), humidité, PCI (base explicite), fraction exploitable, niveaux de disponibilité (théorique, technique, durable, collectable, livrable). Le bilan exige un statut validé, une quantité en t/an et un PCI brut ; aucune conversion implicite. Références de stocks forestiers séparées. Statut : N1–N2.

### 5. Demande énergétique
Inventaire d'équipements (puissance, heures/jour, jours/semaine, facteur d'usage), profils journaliers et horaires, mesures séparées des estimations, croissance, criticité, statut de validation. Convention documentée : jours hebdomadaires, mois de 30 jours. Statut : N1–N2 ; demande horaire actuelle fictive (QA).

### 6. Moteur photovoltaïque
Modèle : **PVWatts v8 via la bibliothèque officielle NREL PySAM** (aucune équation PV maison). Entrées : météo horaire de 8 760 h (GHI, DHI, DNI, température, vent), puissance, inclinaison, orientation, pertes, ratio DC/AC, rendement onduleur, type de module, montage, GCR, albédo. Résultats : production horaire et annuelle, sauvegardés avec la requête complète. Démonstration : 10 kWc → 15 468 kWh/an sur météo **synthétique** et paramètres **hypothétiques**. Statut : N3 (QA).

### 7. Moteur CSP
Bilan thermique horaire à rendement effectif constant, pertes et auxiliaires prescrits, DNI validée sélectionnée par le serveur. Pas de modèle de géométrie, fluide caloporteur, démarrage, stockage, dégradation, dispatch ni électricité. Statut : N1–N2.

### 8. Moteur éolien
Niveaux A/B/C isolés ; courbes de puissance documentées enregistrées dans la requête ; météo horaire validée. Le niveau A caractérise la ressource (flux cinétique) sans production électrique. Démonstration : 168 h, vent moyen 5,60 m/s (QA). Statut : N3 niveau A.

### 9. Moteur biomasse
Énergie primaire uniquement (quantité × PCI × fractions déclarées), unités explicites. **L'énergie primaire n'est jamais présentée comme électricité produite.** Statut : N1–N2, non exécuté sur Render faute de fiche validée.

### 10. Moteur batterie
Capacité, énergie utile de référence, SOC min/max, rendements de charge/décharge, état de charge suivi heure par heure ; bilans vérifiés avant sauvegarde. Résultats : couverture, énergie non servie (ENS), surplus, autoconsommation. Démonstration QA : couverture 81,1 %, ENS 3 026 kWh, surplus 1 986 kWh, autoconsommation 87,2 %. Statut : N3 (QA).

### 11. Systèmes hybrides
Préparation versionnée (site, demande, composants), contrôles d'alignement des séries horaires, comparaison côte à côte de simulations individuelles, blocage des comparaisons inter-sites. **La simulation chronologique multi-sources n'est pas disponible.** Seul PV + batterie est calculé heure par heure (moteur batterie). Statut : partiel.

### 12. Comparaison de scénarios
Tableau multi-scénarios sans agrégation ni classement automatique ; compatibilité site/période/unité/provenance contrôlée côté serveur ; valeurs indisponibles affichées comme telles. Statut : N1–N2.

### 13. Optimisation
V1 : sélection exhaustive parmi 1 à 12 configurations batterie enregistrées partageant la même référence PV/demande ; objectif = ENS minimale ; plafond ENS facultatif ; politiques d'état initial/final explicites ; ex æquo conservés ; aucun recalcul physique. Pas de dimensionnement PV/éolien, ni objectif de coût. Statut : N1–N2, non validée.

### 14. Analyse financière
CAPEX, subventions et investissement net séparés ; OPEX ; remplacements ; flux annuels ; VAN ; TRI avec garde-fous ; délai de récupération ; LCOE = [CAPEX + Σ (OPEX + Rₜ)/(1+r)ᵗ] / [Σ E₁(1−d)ᵗ⁻¹/(1+r)ᵗ] ; sensibilité (jusqu'à 9 variantes). Hypothèses versionnées ; production issue d'une simulation PV terminée prioritaire. Calculé dans l'application (pas dans Python). *Une estimation financière n'est ni un devis ni une garantie de rentabilité.* Statut : N1–N2.

### 15. Importation de documents
PDF, XLSX, CSV, DOCX ; dépôt privé ; 14 catégories ; extraction déterministe ; corrections humaines ; validation ingénieur/administrateur ; historique. Pas d'OCR : les documents scannés sont signalés, non lus. Statut : N1–N2.

---

## Partie V — Données, modèles et crédibilité scientifique
| Nature | Exemples dans le projet | Présentation |
|---|---|---|
| Mesurée | Champs dédiés (demande, vent) | Aucune mesure terrain réelle enregistrée à ce jour |
| Importée | Fichiers CSV/XLSX, localités GeoNames | Source et date conservées |
| API | Banque mondiale (populations) | Estimations, date de publication conservée |
| Estimée | GeoNames, Banque mondiale | Jamais présentée comme mesure |
| Projetée | ANStat 2026 | Libellée projection |
| Synthétique | Météo 8 760 h QA, demande QA | Libellée QA / non mesurée |
| Calculée | Résultats des moteurs | Entrées et version de modèle sauvegardées |

Par moteur : références (PVWatts v8/NREL ; courbes constructeur documentées ; conventions documentées pour batterie, biomasse, CSP), unités explicites, paramètres obligatoires, contrôles de cohérence et limites sont détaillés dans les rapports `VALIDATION_*.md`. Validation encore nécessaire pour **tous** les moteurs : cas de référence réel, comparaison à un outil reconnu, signature de l'ingénieur. Aucune formule n'a été simplifiée pour ce dossier.

---

## Partie VI — Bilan technique
### Recette générale du 08/11/2026 (documentée)
447 tests TypeScript et 225 tests Python réussis ; typage et build réussis ; 5 moteurs disponibles ; 9 parcours métier vérifiés sous compte administrateur ; 44 tables protégées ; Render authentifié. Décision : démonstration contrôlée.

### Évolutions postérieures
- Démographie (PROMPT 21.1) : population nationale tracée, 456 tests.
- Suivi et import Banque mondiale (11/11) : 211 pays alimentés, 1 conservé (ANStat), 35 sans donnée ; lecture de l'historique restreinte aux administrateurs (12/11).
- Stratégie du référentiel démographique (12/11).
- Ce jour : 466 tests TypeScript réussis ; tests Python non réexécutés ; moteur Render en ligne et authentifié ; application publiée répond.

### Limites restantes
Validation scientifique ; données réelles de référence ; isolation multi-comptes ; recette de la version publiée ; domaine personnalisé non configuré ; hybride chronologique ; optimisation étendue ; export PDF des rapports.

---

## Partie VII — Valeur ajoutée
| Bénéfice | Statut |
|---|---|
| Centralisation des données territoriales et énergétiques | Démontré (fonctionnel) |
| Traçabilité des hypothèses et des résultats | Démontré (fonctionnel) |
| Comparaison de technologies et scénarios | Démontré partiellement |
| Analyse technique et financière | Démontré sur données QA |
| Réduction des tâches répétitives | Attendu, à mesurer |
| Qualité des dossiers d'étude | Attendu, à mesurer |
| Communication ingénieurs–décideurs | Attendu |
Aucun gain financier chiffré n'est revendiqué.

---

## Partie VIII — Limites, risques et plan d'amélioration
| Priorité | Point | Situation | Risque | Action | Responsable | Critère de validation |
|---|---|---|---|---|---|---|
| 1 Scientifique | Validation des moteurs | Non faite | Résultats non opposables | Grille de validation + cas réel | M. Joël | Grille signée par moteur |
| 1 Scientifique | Paramètres PV | Hypothèses | Production biaisée | Saisir les vraies données site | M. Joël | Paramètres sourcés |
| 2 Sécurité | Isolation multi-comptes | Non testée | Fuite entre comptes | Second compte QA autorisé + scénarios prêts | Admin + équipe | Aucune lecture croisée |
| 3 Données | Données synthétiques | Seules disponibles | Confusion démo/réel | Importer météo et demande mesurées | M. Joël | Jeux validés |
| 3 Données | Import démographique direct | Actif | Valeurs non relues | Décision D1 | Direction / M. Joël | Politique écrite |
| 4 Technique | Hybride chronologique | Absent | Analyses incomplètes | Règle de dispatch validée puis moteur | Équipe + M. Joël | Bilans horaires équilibrés |
| 4 Technique | Optimisation étendue | Limitée | Dimensionnement manuel | Objectifs/contraintes validés | Équipe + M. Joël | Résultats reproductibles |
| 5 Production | Version publiée | Non recettée | Écart aperçu/production | Recette connectée | Équipe | Parcours OK publiés |
| 5 Production | Domaine personnalisé | Non configuré | Image institutionnelle | Configurer DNS | Admin | Domaine actif |
| 6 Évolution | Rapports PDF | Pas d'export fiable | Diffusion manuelle | Export validé | Équipe | PDF conforme |

Feuille de route (sans délais engagés) : Phase 1 validation scientifique et pilote réel → Phase 2 sécurité et production → Phase 3 hybride et optimisation → Phase 4 rapports et extension territoriale.

---

## Partie IX — Guide pour M. Joël
Voir `GUIDE_DEFENSE_ORALE_MR_JOEL.md` (discours 2 et 5 min, 10 questions, arguments, démonstration, recommandations).

---

## Partie X — Glossaire
- **PV** : photovoltaïque, conversion directe du soleil en électricité.
- **CSP** : solaire thermodynamique à concentration, produit de la chaleur à partir du rayonnement direct.
- **GHI** : rayonnement global reçu sur une surface horizontale.
- **DNI** : rayonnement direct reçu face au soleil.
- **DHI** : rayonnement diffus (ciel) sur une surface horizontale.
- **CAPEX** : investissement initial. **OPEX** : coûts annuels d'exploitation.
- **VAN** : valeur actuelle nette, gain total ramené à aujourd'hui.
- **TRI** : taux de rentabilité interne, taux qui annule la VAN.
- **LCOE** : coût moyen actualisé d'un kWh sur la durée de vie.
- **SOC** : état de charge d'une batterie (%).
- **API** : interface permettant à deux logiciels d'échanger des données.
- **SaaS** : logiciel accessible en ligne, sans installation.
- **Base de données** : stockage organisé des informations.
- **Moteur de calcul** : programme qui réalise les calculs scientifiques.
- **Simulation** : calcul du comportement d'un système dans des conditions définies.
- **Données synthétiques** : données fabriquées pour tester, jamais mesurées.
- **RLS** : règles en base qui limitent ce que chaque utilisateur peut lire ou modifier.
- **FastAPI** : technologie Python utilisée pour le moteur de calcul.
- **Render** : hébergeur du moteur de calcul.
- **Supabase / Lovable Cloud** : service hébergeant la base, l'authentification et les fichiers.

---

## Partie XI — Conclusion et positionnement officiel
ENERGIE RENOUVELABLE est un **prototype avancé** qui couvre déjà l'essentiel de la chaîne d'une étude énergétique territoriale, avec une exigence rare de traçabilité : chaque donnée garde sa source, chaque calcul ses entrées, chaque estimation est nommée comme telle. Les moteurs PV, éolien et batterie s'exécutent sur un service hébergé sécurisé.
Son exploitation officielle suppose : la validation scientifique de chaque moteur par l'ingénieur, un pilote sur données réelles, le test d'isolation entre comptes et la recette de la version publiée. Ces conditions remplies, la plateforme pourra devenir l'outil de référence des études de l'organisation, puis s'étendre à la simulation hybride complète, à l'optimisation et aux rapports exportables.

**Export PDF** : l'application ne dispose pas d'un export PDF fiable des rapports ; aucune version PDF n'a été produite dans cette mission.
