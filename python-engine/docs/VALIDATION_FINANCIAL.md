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
