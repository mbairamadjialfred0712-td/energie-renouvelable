# VALIDATION_FINANCIAL — PROMPT 18

## État initial (audit)
- Existant : `finance-engine.ts` (LCOE pur, 7 tests), `finance.functions.ts` (hypothèses projet versionnées dans `project_finance_assumptions` + historique par trigger, production année 1 issue d'une simulation terminée), page `/finance`, `project-finance.tsx`.
- `financial_assumptions` / `financial_results` : tables héritées, non utilisées par l'interface ; réutilisées par aucun flux ici (aucune migration créée).
- Absent : flux de trésorerie, VAN, TRI, retours, sensibilité, contrôle de comparabilité.

## Implémenté (`src/features/finance/cashflow-engine.ts`)
Conventions : annuel, monnaie constante (taux **réel**), année 0 = référence (CAPEX, subvention), années 1..N fin d'année, avant impôts et financement.
- CAPEX = Σ postes non marqués « déjà inclus ailleurs » ; chaque poste exige une source ou « hypothèse utilisateur ».
- OPEX annuel = Σ postes, constant.
- E_t = E₁(1−d)^(t−1) ; Revenus_t = E_t·part_vendue·tarif ; Économies_t = E_t·part_substituée·coût_réf ; part_vendue + part_substituée ≤ 1.
- CF_0 = −CAPEX + subvention ; CF_t = revenus + économies + résiduel(t=N) − OPEX − R_t.
- VA_t = CF_t/(1+r)^t ; VAN = Σ VA_t (CAPEX compté une seule fois en t=0).
- TRI : bissection ]−99 % ; 1000 %] ; indisponible si 0 ou >1 changement de signe ou absence de racine.
- Retour simple / actualisé : premier passage du cumul à ≥ 0, interpolation linéaire intra-annuelle ; « Non atteint » sinon.
- LCOE = [CAPEX + Σ(OPEX+R_t)/(1+r)^t] / Σ E_t/(1+r)^t (monnaie/kWh), identique au moteur LCOE existant (test croisé) ; revenus, subvention et résiduel exclus.
- Sensibilité : 1–9 variations relatives ±90 % max, sur CAPEX, OPEX, taux, production ou tarif ; base inchangée.
- Comparabilité : refus explicite si devise, durée ou taux diffèrent ; aucun classement.

## Indisponible / non implémenté
Inflation et flux nominaux, fiscalité, dette/fonds propres, conversion de devises, OPEX variables, persistance des analyses de flux (BLOQUÉ : choix de schéma à valider ; `project_finance_assumptions` ne contient pas les postes ni les tarifs), comparaison inter-scénarios persistée, graphique des cumuls.

## Tests
| Contrôle | Statut |
|---|---|
| Unitaires TypeScript `cashflow-engine.test.ts` (19) + `finance-engine.test.ts` (7) | RÉUSSI (`bunx vitest run src/features/finance`) |
| Python | NON EXÉCUTÉ (aucun code Python modifié) |
| Persistance/relecture des flux | BLOQUÉ (non persistés) |
| Isolation deux comptes | BLOQUÉ (comptes QA non autorisés) |
| Calcul hébergé Render | NON EXÉCUTÉ (aucun moteur requis par ce module) |

## Points à valider par Joël
Convention réelle et taux réel ; datation fin d'année ; interpolation du retour ; exclusion des revenus du LCOE ; traitement subvention en année 0 ; besoin de fiscalité/dette ; schéma de persistance des postes CAPEX/OPEX et tarifs.

Statut : non validé scientifiquement ni financièrement, non prêt pour la production.

---

# PROMPT 18.1 — Audit mathématique et intégration

## Audit mathématique (cashflow-engine.ts)
| Point | Constat | Statut |
|---|---|---|
| CAPEX, lignes « déjà incluses ailleurs » | Exclues de la somme, source exigée, négatifs refusés | RÉUSSI |
| Année 0 | CF₀ = −CAPEX brut + subvention, non actualisé | RÉUSSI |
| Flux réels / taux réel | Aucune inflation appliquée ; libellés explicites ajoutés dans l'écran | RÉUSSI |
| Datation | Années 1…N en fin d'année, VA_t = CF_t/(1+r)^t | RÉUSSI (référence annuité 228,913 XOF) |
| VAN | Σ VA_t, CAPEX compté une seule fois | RÉUSSI |
| TRI | Bissection ]−99 % ; 1000 %], refus 0 / >1 changement de signe / pas de racine | RÉUSSI (référence 23,3752 %) |
| Retours simple/actualisé | 1er passage du cumul ≥ 0, interpolation linéaire dans l'année ; « Non atteint » sinon | RÉUSSI (5,0 et 3,333 ans) |
| LCOE | Identique au moteur existant (test croisé) ; CAPEX brut + OPEX + remplacements ; hors subvention et revenus | RÉUSSI (référence 0,15 à taux 0) |
| Sensibilité | Copie profonde, base inchangée, ±90 %, ≤ 9 variantes | RÉUSSI |
| Sensibilité sur le taux à 0 % | Variation relative d'un taux nul = aucun effet (limite documentée, non corrigée) | À VALIDER |

**Défauts constatés et corrigés (interface, aucune formule modifiée)** :
1. Résultats obsolètes affichés après modification d'une entrée → désormais effacés à chaque modification.
2. Production année 1 uniquement manuelle et sans source → sélection d'une simulation terminée, ou saisie avec source obligatoire.
3. Subvention non distinguée → CAPEX brut, subvention et investissement net affichés séparément.
4. Calculateur LCOE historique : devise « EUR » préremplie et texte « VAN/TRI non calculés » obsolète → devise vide obligatoire, texte corrigé.

## Production de référence
- Liste lue sous RLS (`listFinanceProductionSources`) : simulations `completed` avec `annual_ac_energy`.
- Éligible seulement si unité `kWh`, valeur > 0 et période complète de 365–366 jours (`production-source.ts`) ; une période partielle est refusée, jamais extrapolée.
- Années 2…N = projection E₁(1−d)^(t−1), affichée comme projection.
- Saisie manuelle = « hypothèse utilisateur » avec source obligatoire.
- Le site et la technologie de la simulation ne sont pas encore recoupés avec un projet financier : la sélection n'est pas filtrée par projet (BLOQUÉ tant que l'analyse n'est pas liée à un projet sauvegardé).

## Persistance — audit, aucune migration
- `financial_assumptions` / `financial_results` : 0 ligne, RLS `app_private.can_access(owner_id)`, non utilisées par l'application.
- `financial_assumptions` contient devise, CAPEX/OPEX agrégés, tarif, inflation, taux, `assumptions jsonb` ; `financial_results` : metric/value/unit/method/`input_snapshot`.
- Insuffisances : pas de postes CAPEX/OPEX structurés hors JSON, pas de parts vendue/substituée, pas de version de modèle, pas d'historique ni de lien simulation de production.
- **Proposition (non appliquée, à approuver)** : réutiliser `financial_assumptions` en ajoutant `analysis_kind`, `model_version`, `production_simulation_id`, et un historique immuable sur le modèle de `project_finance_assumption_history` ; stocker postes, parts et tarifs dans `assumptions` validé côté serveur ; `financial_results` avec `input_snapshot` complet par calcul. Risque : `financial_assumptions` n'a aucune contrainte de projet obligatoire.
- Statut persistance : NON EXÉCUTÉ.

## Tests 18.1
| Contrôle | Statut |
|---|---|
| Unitaires `src/features/finance` (36 : 24 flux, 7 LCOE, 5 production) | RÉUSSI (local) |
| Typage `tsgo` | RÉUSSI (local) |
| Navigateur local (admin Joël) : simulation PV QA 15 500 kWh sélectionnée, calcul VAN 5 120 064,2 XOF / TRI 10,96 % sur entrées test, effacement des résultats après modification | RÉUSSI (local, données QA synthétiques) |
| RLS / isolation deux comptes | BLOQUÉ |
| Hébergé | NON EXÉCUTÉ |

## À valider par Joël
Interpolation du retour ; subvention hors LCOE ; règle « année complète 365–366 j » ; sensibilité relative sur le taux ; schéma de persistance proposé.
