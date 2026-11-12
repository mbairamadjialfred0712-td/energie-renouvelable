# Stratégie du référentiel démographique — PROMPT 23.1

Date de rédaction : 12/11/2026. Document d'architecture uniquement : aucune migration, aucune table modifiée, aucune donnée supprimée, aucun import lancé, aucun moteur scientifique modifié pendant cette étape.

> **Correction du contexte du prompt.** Le prompt indique « mise à jour manuelle, sans écriture automatique ». Ce n'est plus exact depuis le 11/11/2026 : un **import automatique Banque mondiale** a été ajouté à la demande de l'utilisateur (planification hebdomadaire + bouton administrateur) et **a écrit des valeurs en base** lors d'un lancement manuel réel. Ce document décrit l'état réellement vérifié.

---

## 1. Audit de l'existant (vérifié dans le code et la base)

### 1.1 Hiérarchie territoriale
`countries → regions → departments → localities` (+ `study_sites` rattachés aux localités). **Il n'existe pas de niveau « commune »** : les communes GeoNames sont stockées comme localités. Clés étrangères : `regions.country_id`, `departments.region_id`, `localities.department_id` (nullable, `ON DELETE SET NULL`).

### 1.2 Champs démographiques
| Table | Champs | Constat |
|---|---|---|
| `countries` | `population`, `population_year`, `population_source`, `population_method` (CHECK recensement/estimation/projection), `population_updated_at` (migration 0026) | Une seule valeur par pays ; la précédente n'est conservée que dans `country_population_history` (si écrite par l'import). |
| `localities` | `population`, `data_source`, `data_period`, `data_quality` | Pas d'année démographique ni de méthode dédiées. |
| `regions`, `departments` | aucun | — |
| `population_import_runs` (0027) | statut, déclencheur, compteurs, `missing_countries`, `source_last_updated`, erreur | Journal des imports. |
| `country_population_history` (0027) | action, valeurs précédentes (valeur/année/source/méthode), valeur et année observées | Une ligne par pays et par import. |

### 1.3 État des données (requête du 12/11/2026)
- Pays : 247 ; 212 avec population ; 211 issues de la Banque mondiale ; 1 ANStat (Côte d'Ivoire, projection 2026, 33 293 101) ; 0 sans ISO3.
- Localités : 357 ; 356 avec population (GeoNames, estimations, extraction du 05/10/2026, CC BY 4.0) ; somme 22 418 694 — **ce n'est pas une population nationale**.
- Imports : 1 exécution manuelle réussie (211 mises à jour, 1 conservée autre source, 35 sans donnée, publication BM du 2026-10-08). Aucune exécution planifiée encore observée.

### 1.4 Règles d'accès (RLS)
- `countries`, `regions`, `departments`, `localities` : `app_private.can_access(owner_id)` (tout) + lecture des lignes `is_reference`.
- `population_import_runs`, `country_population_history` : lecture réservée aux administrateurs (correctif sécurité du 12/11/2026) ; aucune écriture navigateur ; écriture uniquement côté serveur privilégié.
- Conséquence : l'import (privilégié) modifie des pays de référence lisibles par tous les utilisateurs connectés.

### 1.5 Suivi démographique (onglet)
- `checkDemographySources` : lecture seule, compare base et Banque mondiale.
- `runPopulationImportNow` (admin, contrôle du rôle côté serveur) et route planifiée `/api/public/jobs/population-import` (authentification de tâche planifiée, lundi 03:00 UTC).

### 1.6 Usages actuels de la population
Vérifiés par recherche dans le code : affichage (fiches pays/localités, cartes publiques, tableau de bord : somme « population géolocalisée »), contexte des fiches ressources/solaire. **Aucun moteur énergétique (PV, éolien, batterie, biomasse, CSP, demande, finance) n'utilise la population dans un calcul.** Le moteur de demande repose sur l'inventaire d'équipements.

---

## 2. Audit du suivi démographique

| Élément | Valeur vérifiée |
|---|---|
| Fournisseur | Banque mondiale, API v2 `api.worldbank.org` |
| Indicateur | `SP.POP.TOTL` (population totale), `mrnev=1` : dernière valeur non vide par pays |
| Année de référence | celle renvoyée pour chaque pays (`date`) ; elle peut varier d'un pays à l'autre |
| Date de publication | `lastupdated` des métadonnées (2026-10-08 au dernier import) |
| Méthode enregistrée | `estimation` |
| Comparaison | même source **et** même année uniquement ; sinon statut « source différente (non comparable) » |
| Seuil | écart relatif > 0,5 % → « écart à vérifier » (comparaison uniquement, pas l'import) |
| Sources différentes | jamais comparées numériquement ; à l'import, jamais écrasées (`kept_other_source`) |
| Erreur réseau / HTTP / réponse vide | import marqué `failed` avec message ; **aucune valeur modifiée** |
| Pays sans donnée | action `missing`, valeur existante conservée, alerte rouge listant les pays |
| Source indisponible | idem erreur réseau ; l'onglet affiche l'échec |

**Limite de l'import actuel :** il écrit directement dans `countries` sans validation humaine préalable. C'est en tension avec la règle « validation humaine avant intégration » (§5) — voir Décisions.

**Tests :** 5 tests unitaires de la règle d'import + tests du comparateur. Ils **ne remplacent pas** un test du bouton dans l'application connectée. Un lancement réel par compte administrateur a été observé en aperçu ; l'exécution planifiée et la version publiée **ne sont pas validées**.

---

## 3. Architecture cible : observations démographiques

### 3.1 Proposition : table dédiée `demographic_observations`
Champs : `id`, `territory_level` (country/region/department/locality), `territory_id`, `value`, `unit` (`habitants`, `ménages`…), `reference_year`, `published_on`, `source_id` (→ `demographic_sources`), `source_url`, `method` (recensement/estimation/projection), `imported_at`, `import_run_id`, `validation_status` (unverified/in_review/validated/rejected), `comment`, `created_by`. Historique des modifications par table d'historique alimentée par déclencheur (modèle déjà employé dans le projet). Unicité : (`territory_level`, `territory_id`, `source_id`, `reference_year`, `method`, `unit`).

La colonne `countries.population` deviendrait la **valeur retenue** (pointeur vers une observation validée, ou vue), jamais la source de vérité.

### 3.2 Comparaison des approches
| | Table dédiée | Colonnes dans `countries` |
|---|---|---|
| Avantages | séries multiples, plusieurs sources par année, tous niveaux géographiques, validation par observation, pas d'écrasement | simple, déjà en place, lecture directe |
| Risques | jointure polymorphe (pas de clé étrangère native sur `territory_id`), migration des valeurs existantes, choix de la « valeur retenue » | écrasement, une seule source, colonnes à dupliquer par niveau, historique partiel |
| Conséquences | nouvelles migrations additives, adaptation de l'import et de l'onglet | dette croissante dès la 2ᵉ source ou le niveau régional |

Recommandation architecturale : table dédiée (validation scientifique/métier requise, §8).

## 4. Gestion des sources
Table `demographic_sources` : nom, organisme, type (INS national, Banque mondiale, Nations Unies – WPP, autre), URL, licence, couverture, fréquence. Un connecteur par source produit des observations `unverified`, sans jamais écrire la valeur retenue. Toute comparaison entre sources affiche un avertissement méthodologique (définition, date de référence, méthode). Les séries historiques sont conservées ; aucune observation n'est écrasée — une correction crée une nouvelle version.

## 5. Qualité et validation
Contrôles automatiques avant enregistrement : valeur > 0 et entière pour `habitants` ; unité dans une liste fermée ; année entre 1800 et année courante + horizon de projection explicite ; source identifiée ; niveau géographique cohérent avec le territoire ; doublon refusé par l'unicité ; cohérence temporelle (variation annuelle hors d'une plage **à définir par l'ingénieur** signalée, non bloquée) ; signalement des écarts inter-sources (avec avertissement). Validation humaine (ingénieur/admin) obligatoire avant qu'une observation devienne valeur retenue. Une projection reste libellée projection ; une estimation n'est jamais affichée comme mesure ; la somme des localités n'est jamais présentée comme population nationale.

## 6. Usages dans les modules énergétiques
| Usage | Données nécessaires | Limites |
|---|---|---|
| Estimation de demande | population et nombre de ménages par localité, année | aucune formule population → kWh n'est validée ; la demande reste fondée sur l'inventaire |
| Électrification rurale | population/ménages des localités non raccordées, accès réseau | GeoNames incomplet et non daté |
| Dimensionnement territorial | population par niveau administratif | agrégation uniquement entre données de même source/année |
| Estimation des ménages | population + taille moyenne des ménages sourcée (INS) | taille des ménages non disponible aujourd'hui |
| Scénarios | trajectoire démographique (projections sourcées) | projection ≠ observation ; hypothèse à afficher |
| Analyses financières | nombre de bénéficiaires/abonnés | dépend de données de raccordement, pas de la seule population |

Aucune formule démographique ou énergétique n'est introduite par ce document.

## 7. Plan d'implémentation
| Phase | Prérequis | Livrables | Risques | Critères d'acceptation |
|---|---|---|---|---|
| A — Stabilisation nationale | décision sur l'import direct (D1) | import en mode « proposition » ou maintenu, test planifié observé, test publié | écrasement de valeurs validées | un import planifié réel journalisé ; aucune valeur non BM modifiée ; alerte des pays manquants vérifiée |
| B — Observations historiques | D2, D3 validées | tables sources/observations/historique, migration additive des valeurs pays et de l'historique d'import | migration incomplète | chaque valeur actuelle retrouvable comme observation avec source ; aucune perte |
| C — Régional/local vérifiable | sources INS identifiées (ex. RGPH ANStat) | import validé par fichier officiel, correspondance des codes territoriaux | appariement de noms erroné | 100 % des observations rattachées par code ou validées manuellement |
| D — Autres pays | connecteurs par source | couverture documentée par pays | hétérogénéité des définitions | chaque pays affiche source, année, méthode ou « donnée non disponible » |
| E — Intégration énergétique | formules validées par l'ingénieur | utilisation explicite et traçable dans les scénarios | biais de demande | chaque usage relie l'observation utilisée dans l'instantané de calcul |

## 8. Décisions nécessitant une validation
**Architecture (équipe technique) :**
- D2 — table dédiée d'observations vs colonnes (recommandé : table dédiée).
- D3 — `countries.population` conservée comme valeur retenue dérivée.

**Scientifiques / métier (ingénieur — Joël) :**
- D1 — l'import automatique doit-il continuer à **écrire directement** les valeurs Banque mondiale, ou seulement proposer des observations à valider ? (état actuel : écriture directe)
- D4 — source prioritaire par pays (ANStat vs Banque mondiale vs ONU) et règle de « valeur retenue ».
- D5 — plage de variation annuelle signalée pour la cohérence temporelle.
- D6 — conserver ou remplacer les populations GeoNames des localités.
- D7 — toute formule population → ménages → demande.

---

## Rapport synthétique
**Fichiers consultés :** `drizzle/migrations/0026`, `0027`, `0028`, migration initiale `supabase/migrations/20260926142131_…`, `src/features/geography/demography-watch.ts`, `demography.ts`, `src/lib/demography-watch.functions.ts`, `population-import.server.ts`, `src/routes/api/public/jobs/population-import.ts`, `geography.demography-watch.tsx`, `geography.countries.tsx`, `public.functions.ts`, `dashboard.functions.ts`, `solar.functions.ts`, `resources.functions.ts`, `VALIDATION_TERRITORIES.md` ; requêtes en lecture sur les pays, localités, imports et règles d'accès.

**Constats vérifiés :** hiérarchie à quatre niveaux sans communes ; une seule valeur par pays ; 211 pays alimentés par la Banque mondiale, Côte d'Ivoire conservée en ANStat ; 35 pays sans donnée signalés ; population non utilisée par les moteurs énergétiques ; historique d'import lisible par les administrateurs seulement.

**Limites :** exécution planifiée et version publiée non testées ; import direct sans validation humaine ; GeoNames non daté et incomplet ; aucune donnée régionale/départementale.

**Décisions à prendre :** D1 à D7 ci-dessus, en priorité D1.
