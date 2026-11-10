# VALIDATION TERRITOIRES — FIABILITÉ DÉMOGRAPHIQUE (PROMPT 21.1)

Date : 09/11/2026 — Périmètre : audit de l'API démographique, correction de la population nationale, traçabilité, interface, tests.

---

## 1. API initiale et problème constaté

**Il n'existe aucune API démographique appelée en direct par l'application.** L'audit du code (aucun appel World Bank, ANStat, UN, GeoNames ou autre dans le code serveur ou navigateur) établit que :

- les populations des localités proviennent d'un **import statique GeoNames** (extraction du 05/10/2026, licence CC BY 4.0), enregistré dans `localities.population` avec `data_source` et `data_period` renseignés ;
- la table `countries` ne contenait **aucune colonne de population** : aucune population nationale n'existait dans la plateforme ;
- le tableau de bord public additionnait les populations des localités référencées (22 418 694 hab. pour 356 localités de Côte d'Ivoire), valeur largement inférieure à la population nationale réelle car GeoNames ne couvre pas toutes les communes — cette somme pouvait être **confondue avec une population nationale** ;
- les valeurs GeoNames sont des **estimations non mesurées**, sans année de référence démographique propre (la date 05/10/2026 est la date d'extraction, pas celle du recensement).

Problème constaté : absence de population nationale tracée, et risque de confusion entre somme partielle de localités et population nationale.

## 2. Source démographique retenue et justification

Trois sources vérifiées le 09/11/2026 :

| Source | Indicateur | Valeur | Année | Méthode |
|---|---|---|---|---|
| ANStat (anstat.ci), chiffres clés | Population totale | 33,29 M (33 293 101) | 2026 | Projection démographique (mise à jour 10/09/2026) |
| Banque mondiale (API SP.POP.TOTL, vérifiée par appel direct) | Population totale | 32 711 547 | 2025 | Estimation |
| Nations Unies WPP 2024 (via Worldometer) | Population milieu d'année | 33 494 346 | 2026 | Projection |

La **source officielle nationale (ANStat)** est retenue conformément à la règle « privilégier les données officielles nationales ». Sa nature de **projection** est explicitement conservée : ce n'est pas un recensement. La Banque mondiale sert de comparaison (écart ≈ 1,8 %, cohérent).

## 3. Population nationale vérifiée

Côte d'Ivoire : **33 293 101 habitants, année 2026, méthode projection, source ANStat** (mise à jour du 10/09/2026). Aucune valeur de 35 millions n'a été imposée : aucune source officielle consultée ne la justifie.

## 4. Année et méthode de référence

Chaque population nationale porte désormais : valeur, année de référence, source, méthode (`recensement` / `estimation` / `projection`, contrainte en base) et date de mise à jour. Une projection n'est jamais présentée comme un recensement : l'interface affiche un avertissement explicite.

## 5. État des données régionales et locales

- Localités : 356 localités de référence (GeoNames, estimations), toutes marquées avec source et date d'extraction. Abidjan 6 321 017, Bouaké 832 371, Yamoussoukro 275 686 — valeurs GeoNames, non comparées à un recensement officiel local.
- Régions et départements : **aucune donnée démographique** à ces niveaux. Aucune répartition artificielle de la population nationale n'a été faite.
- Localités sans population : affichage explicite « Donnée non disponible » (aucune valeur inventée).
- Double comptage : la somme des localités n'est plus présentée comme une population nationale (libellés corrigés).

## 6. Modifications de base

Migration `0026_countries_demographics_traceability.sql` — **additive uniquement**, aucune donnée supprimée ni écrasée :
- `countries.population` (bigint, nullable) ;
- `countries.population_year` (integer, nullable) ;
- `countries.population_source` (text, nullable) ;
- `countries.population_method` (text, nullable, contraint à recensement/estimation/projection) ;
- `countries.population_updated_at` (timestamptz, nullable) ;
- mise à jour de la seule ligne Côte d'Ivoire avec la valeur ANStat 2026.

## 7. Fichiers modifiés

- `drizzle/migrations/0026_countries_demographics_traceability.sql` (nouvelle migration) ;
- `src/lib/geography.functions.ts` (schéma et enregistrement des champs démographiques pays) ;
- `src/routes/_authenticated/geography.countries.tsx` (formulaire et colonnes : population, année, méthode, source, avertissement) ;
- `src/features/geography/demography.ts` + `demography.test.ts` (libellés et avertissements, 9 tests) ;
- `src/routes/_authenticated/dashboard.tsx` (libellé « ce n'est pas la population nationale ») ;
- `src/routes/decouvrir.tableau-de-bord.tsx` (libellé « localités référencées » + mention de la date et nature GeoNames).

## 8. Tests exécutés

- 456 tests TypeScript réussis (36 fichiers), dont 9 nouveaux tests démographiques : valeur avec année, absence de donnée, projection ≠ recensement, estimation ≠ recensement, méthode non documentée, donnée ancienne, recensement récent sans avertissement.
- Vérification de typage : OK.
- Vérification navigateur (compte administrateur) : ligne Côte d'Ivoire affichant « 33 293 101 hab. (2026) — Projection — ANStat » avec l'avertissement « projection démographique, pas un recensement » ; les autres pays affichent « Donnée non disponible ». Aucune erreur console.

## 9. Impact sur les modules énergétiques

- Aucune formule scientifique modifiée ; aucun moteur touché.
- La population des localités reste une donnée d'affichage et de contexte : les calculs de demande utilisent les fiches de demande propres à chaque site, pas la population GeoNames.
- Les anciennes simulations ne sont pas affectées : la mise à jour démographique ne modifie aucun résultat enregistré (les instantanés d'entrée sont figés par conception).
- Le tableau de bord indique désormais explicitement que la somme des populations des localités n'est pas la population nationale.

## 10. Limites et données encore indisponibles

1. **Niveaux région, district, département, commune, sous-préfecture : aucune donnée démographique fiable intégrée.** Le dernier recensement ivoirien exhaustif (RGPH 2021) n'a pas été importé ; à prévoir si M. Joël fournit la source.
2. Les populations GeoNames des localités sont des estimations sans année de référence démographique ; elles ne doivent pas servir de base à un dimensionnement sans vérification.
3. La population nationale des 246 autres pays est absente (« Donnée non disponible » affiché) ; à renseigner pays par pays avec source, ou via un import documenté.
4. Aucune mise à jour automatique périodique n'existe : la date de mise à jour affichée permet de détecter une donnée vieillissante.
