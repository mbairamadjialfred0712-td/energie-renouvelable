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

---

# PROMPT 18.2 — Revue uniquement (29/10/2026)

Aucune migration créée ou appliquée, aucune donnée modifiée, aucun comportement de l'application changé. Les lectures ci-dessous portent sur la base Lovable Cloud du projet, commune à l'aperçu et à l'application publiée ; elles ne constituent pas un test des parcours publiés ou de l'isolation entre comptes.

## 1. Schéma actuel vérifié

- `financial_assumptions` : **0 ligne** au moment de cette revue. UUID, owner, projet et scénario facultatifs, devise (défaut EUR), CAPEX/OPEX agrégés, maintenance, remplacement, tarif, inflation, taux, durée, `assumptions` JSONB (défaut tableau vide), création/mise à jour. Projet/scénario : suppression CASCADE.
- `financial_results` : **0 ligne**. UUID, owner, assumption obligatoire, metric/value/unit/method, input_snapshot, calculated_at/created_at. Les métriques admises sont LCOE, NPV, IRR, PAYBACK, CASH_FLOW ; pas de métrique distincte pour retour actualisé. Suppression CASCADE avec l'hypothèse.
- `project_finance_assumptions` : une ligne existante ; UNIQUE(project_id), devise, CAPEX/OPEX, durée, taux, dégradation, remplacements JSONB, notes, updated_by, production manuelle ou simulation. Ne pas la traiter comme vide ni transformer ses valeurs en nouvelles hypothèses réelles.
- `project_finance_assumption_history` : snapshots des modifications LCOE via trigger, acteur et dates ; ne sauvegarde pas les analyses de flux actuelles.
- RLS hérité sur les deux tables financières : ALL authenticated, lecture propriétaire/admin, écriture propriétaire/admin **sans obligation de rôle ingénieur**. Il ne vérifie pas les références projet/simulation ni les résultats. L'accès projet LCOE emploie `can_write_resource` : admin ou propriétaire ingénieur. Analyste/lecteur : lecture de leurs données via `can_access`, pas d'écriture via cette fonction.
- Privilèges effectifs vérifiés avec `has_table_privilege` : anon et authenticated ont CRUD sur les tables financières héritées ; les politiques n'autorisent pas anon. Les simulations n'autorisent plus les écritures client. Les droits des tables financières héritées ne doivent donc pas devenir le mécanisme d'intégrité des nouveaux résultats.

Réutilisables : références projet/simulation, catalogue de rôles, fonctions d'accès, résultats PV persistés, principes de snapshots et moteur financier pur. Les tables héritées restent intactes ; leurs champs ne suffisent pas à préserver une analyse complète et versionnée.

## 2. Schéma cible proposé, non implémenté

Après examen, remplacer la proposition sommaire d'extension des tables héritées par un **stockage append-only isolé** : une analyse stable et plusieurs révisions immuables contenant les entrées et sorties complètes. Les références et versions sont normalisées ; les structures détaillées restent des enveloppes JSONB versionnées, pas un seul chiffre final. Aucun second moteur de calcul.

- Analyse : ID stable, owner, auteur, projet facultatif, création. Une nouvelle révision ne modifie jamais la précédente.
- Révision : numéro, auteur, date, simulation source facultative, période source, année financière de référence, devise, version du modèle et des conventions, entrées/provenance/résultats complets. `created_at` de la dernière révision tient lieu de date de dernière mise à jour.
- `input_snapshot` : tous les champs CashflowInput, postes CAPEX/OPEX et indicateur d'inclusion, remplacements datés, subvention/résiduel, parts vendues/substituées, tarifs/coût de référence, durée/taux réel/dégradation. Aucune valeur par défaut silencieuse. Les sources des remplacements, tarifs, subvention et résiduel doivent être ajoutées au contrat de sauvegarde : elles ne sont pas toutes collectées aujourd'hui.
- `provenance_snapshot` : sources et nature de chaque montant ; production manuelle avec source, ou simulation/metric/unit/value/période/version/sources recopiées après lecture autorisée. Une météo QA reste synthétique même validée.
- `result_snapshot` : lignes annuelles, VAN, TRI avec statut/motif d'indisponibilité, retours simple/actualisé null avec motif, LCOE, avertissements, unités explicites (devise, %, années, devise/kWh). Sensibilité, si conservée : variables/bornes/entrées/sorties sans altérer la base.
- Projet et simulation sont en RESTRICT pour ne pas effacer l'historique lors d'une suppression. Cette conservation nécessite approbation. Pas de FK auteur vers auth.users ; UUID simple.

## 3. Texte exact du DDL envisagé — brouillon non exécutable comme fonctionnalité complète

Ce texte n'est ni un fichier de migration ni une migration appliquée. Il crée seulement le stockage verrouillé : **le service de sauvegarde et ses tests doivent être conçus avant soumission**. Les écritures utilisateur directes sont interdites, y compris pour éviter des résultats fabriqués. Aucun changement des tables héritées.

```sql
CREATE TABLE public.finance_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  created_by uuid NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.finance_analyses TO authenticated;
GRANT ALL ON public.finance_analyses TO service_role;
REVOKE ALL ON public.finance_analyses FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.finance_analyses FROM authenticated;
ALTER TABLE public.finance_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY finance_analyses_select ON public.finance_analyses
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL AND app_private.can_access(owner_id));

CREATE TABLE public.finance_analysis_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES public.finance_analyses(id) ON DELETE RESTRICT,
  revision integer NOT NULL CHECK (revision > 0),
  created_by uuid NOT NULL,
  production_simulation_id uuid REFERENCES public.simulations(id) ON DELETE RESTRICT,
  production_period_start date,
  production_period_end date,
  reference_year integer NOT NULL,
  currency text NOT NULL CHECK (length(btrim(currency)) > 0),
  model_version text NOT NULL CHECK (length(btrim(model_version)) > 0),
  conventions_version text NOT NULL CHECK (length(btrim(conventions_version)) > 0),
  input_snapshot jsonb NOT NULL CHECK (jsonb_typeof(input_snapshot) = 'object'),
  provenance_snapshot jsonb NOT NULL CHECK (jsonb_typeof(provenance_snapshot) = 'object'),
  result_snapshot jsonb NOT NULL CHECK (jsonb_typeof(result_snapshot) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (analysis_id, revision)
);
GRANT SELECT ON public.finance_analysis_revisions TO authenticated;
GRANT ALL ON public.finance_analysis_revisions TO service_role;
REVOKE ALL ON public.finance_analysis_revisions FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.finance_analysis_revisions FROM authenticated;
ALTER TABLE public.finance_analysis_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY finance_analysis_revisions_select ON public.finance_analysis_revisions
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.finance_analyses a
    WHERE a.id = analysis_id AND app_private.can_access(a.owner_id)
  ));
```

## 4. Contrôles indispensables avant approbation

Le DDL seul n'empêche pas un service privilégié incorrect d'écrire : ce n'est pas une validation de sécurité. Le futur service authentifié doit vérifier le rôle via les lignes de rôles accessibles à l'utilisateur, lire projet/simulation sous ses permissions, imposer la correspondance propriétaire/projet/site, exiger PV terminé + annual_ac_energy kWh et année complète, vérifier provenance et unicité du résultat, puis recalculer avec le moteur pur. Aucune sortie envoyée par le navigateur ne fait autorité.

Admin peut agir sur les données accessibles ; ingénieur uniquement sur les siennes ; analyste/lecteur sans sauvegarde selon les règles actuelles. Ne pas étendre implicitement leurs droits. Projet facultatif ne signifie pas simulation quelconque : une référence liée à un projet requiert ce projet accessible et compatible. Simulation sans site/provenance vérifiable : refuser, pas déduire.

Sauvegarde analyse/révision atomique, numéro de révision protégé contre concurrence, revalidation des références lors de la transaction et retour après lecture du résultat écrit. L'API de transaction ou RPC exact reste à spécifier ; il ne fait pas partie du DDL ci-dessus. Le service seul utilise le client privilégié après ces contrôles, jamais le navigateur. Les révisions ne sont pas mises à jour ; toute correction est une nouvelle révision. Aucune migration prête à appliquer n'est déclarée.

## 5. Tests définis avant implémentation

Automatisables : égalité profonde entrées/provenance/résultats sauvegardés puis relus ; montants et devise sans arrondi de stockage ; parts sans double comptage ; références PV/unité/période/version ; refus inter-projets/inter-sites et source inaccessible ; refus résultat forgé ; validation après modification concurrente de statut ; rollback d'un échec de transaction ; pas de faux succès ; révision 2 préservant intégralement révision 1 ; lectures historiques sans recalcul avec le nouveau modèle ; conflit de numéros de révision.

Intégration base et API authentifiées : SELECT/INSERT/UPDATE/DELETE directs anon, lecteur, analyste, ingénieur, admin ; deux comptes distincts explicitement autorisés pour lectures/écritures croisées ; projet inaccessible et simulation d'un autre compte ; copie fidèle du résultat relu. Ces contrôles doivent s'exécuter sur un environnement approprié avec les vraies politiques, pas seulement des mocks. Parcours publié nécessaire pour sauvegarde/relecture, erreurs et comportement du serveur hébergé. **Non exécutés : aucune persistance implémentée et second compte non autorisé.**

Tests existants réexécutés lors de cette revue : **40 réussis** (24 flux, 7 LCOE, 5 source de production, 4 comparaison PV/Batterie). Ils ne prouvent pas la sauvegarde ou l'isolation.

## 6. Déploiement et retour arrière proposés

1. Approuver données/conventions, droits et conservation ; finaliser transaction et contrat de provenance ; vérifier le schéma et sauvegarder avant changement.
2. Implémenter et tester en environnement isolé ; soumettre le DDL final par l'outil de migration, avec GRANT/RLS et tests négatifs.
3. Déployer le service de sauvegarde puis l'interface ; vérifier sous comptes autorisés le parcours publié et les erreurs avant ouverture aux utilisateurs.
4. En cas d'échec : désactiver l'action de sauvegarde/revenir à l'interface antérieure ; conserver les nouvelles tables et révisions en lecture seule. Ne pas DROP ni réécrire les historiques pour revenir en arrière. Les tables existantes n'étant pas modifiées, le flux LCOE ancien reste utilisable.

Risques : JSON incomplet sans contrat versionné, provenance manquante, FK RESTRICT bloquant des suppressions, droits hérités trop larges si réutilisés pour écrire des résultats, transaction partielle/concurrence, migration appliquée avant disponibilité du service. Aucune perte de données programmée ; aucune suppression ou conversion de ligne existante.

## 7. Demande de relance avec données réelles : état vérifié

La seule météo annuelle du site QA comporte 8 760 heures en 2026, `data_nature=assumption`, source générateur déterministe fictif. Le PV QA enregistré utilise encore 10 kWc, 15° et 14 % de pertes, tous `nature=assumption` ; aucun jeu solaire validé n'est présent. La pièce jointe est une demande de revue, pas une fiche de paramètres PV ni de coûts réels.

Le tableau existant a été lu sous le compte demandeur dans le navigateur local et le lien batterie rouvert : couverture 81,07 %, autoconsommation 87,16 %, ENS 3 025,72 kWh ; PV seul affiche « Non calculé » pour ces trois indicateurs. Aucun nouveau résultat ni valeur financière ajoutée, aucune simulation relancée.

Pour une relance fondée sur des données réelles : paramètres PV et sources à fournir, confirmer si l'année synthétique QA doit être utilisée ou transmettre une année réelle, puis documenter coûts/remplacements, devise/durée/taux réel/dégradation, parts vendues/substituées, tarifs, subvention/résiduel. La ligne LCOE ancienne ne prouve pas ces hypothèses détaillées. Comparaison financière persistée indisponible ; ne pas transformer les résultats QA en mesures.

## Recommandation et décisions Joël

**Éléments à corriger avant approbation**, pas « migration prête » : confirmer stockage par révisions et conservation RESTRICT, sources obligatoires, matrice des rôles, versions/conventions, transaction de sauvegarde et comparaison compatible. Fournir les vraies entrées pour la relance. Persistance, isolation deux comptes et déploiement non validés. Render et ses clés n'ont pas été modifiés.
