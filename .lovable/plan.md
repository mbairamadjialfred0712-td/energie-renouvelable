# Module Ressources biomasse (Prompt 5)

Reprendre l'architecture des modules solaire et éolien (liste / création / fiche détaillée) pour la biomasse, en réutilisant `biomass_resources` et `energy_resources`, sans table concurrente et sans nouveau moteur de calcul.

## Ce qui sera construit

1. **Pages**
   - `/resources/biomass` : liste filtrable (localité, site, type, période, origine, statut, base du PCI), compteurs réels, graphiques d'évolution existants, référentiel des stocks forestiers conservé à part.
   - `/resources/biomass/new` : formulaire en 4 parties — A. Localisation (pays → région → département → localité → site), B. Ressource (type parmi la liste du prompt + précision libre, quantité + unité obligatoire, période et saisonnalité par mois, fraction exploitable, contraintes de collecte/transport/stockage/concurrence d'usage), C. Caractéristiques (humidité %, PCI MJ/kg avec base « telle que reçue » ou « matière sèche » obligatoire, méthode d'obtention, potentiel énergétique fourni par une source avec sa référence), D. Source et validation (source, référence, origine, période, méthode de collecte, qualité, statut, notes).
   - `/resources/biomass/:id` : fiche détaillée, valeurs fournies / estimées / externes séparées, modification selon rôle, changement de statut, pré-analyse IA existante, comparaison avec les autres jeux de la localité.
2. **Niveaux de disponibilité** distincts et optionnels : théorique, techniquement exploitable, durable, collectable, déjà utilisée ailleurs, livrable au site. Aucun n'est déduit d'un autre.
3. **Validation** : quantités ≥ 0, humidité 0–100 %, PCI ≥ 0, unité obligatoire si quantité, dates cohérentes, localité existante. Valeurs inhabituelles = avertissement non bloquant, jamais corrigées.
4. **Origines et statuts** : mesure locale, étude technique, inventaire agricole/forestier, PDF, CSV/Excel, API, estimation, hypothèse ; statuts non vérifiée, en vérification, validée, rejetée, archivée. Une donnée importée ou API n'est jamais validée automatiquement.
5. **Comparaison et non-double comptage** : tableau neutre (type, quantité, période, humidité, PCI, base, source, statut) ; aucun total si unités, bases, périodes ou catégories se chevauchent — message explicite à la place.
6. **Visualisations** : quantité par type et répartition par statut (seulement même unité), évolution temporelle partagée, saisonnalité si renseignée ; sinon état vide clair.
7. **Fiches localité et site** : section « Ressources biomasse » (nombre de jeux, ressources, dernier jeu validé, liens).
8. **Calcul** : aucun potentiel électrique calculé dans ce module. L'estimation biomasse projet déjà livrée exigera le statut « Validée » et un PCI « tel que reçu », sinon refus explicite.
9. **Import futur** : contrat typé documenté (fichier → extraction → normalisation → unités → aperçu → validation humaine), sans bouton factice.
10. **Hors périmètre** : moteur Python, combustion/gazéification, hybrides, optimisation, finance.

## Détails techniques

- Migration additive sur `biomass_resources` : `site_id` (FK `study_sites`), `biomass_type_detail`, `quantity_unit`, `availability_levels jsonb`, `seasonal_availability jsonb`, `constraints text`, `lhv_basis` (`as_received`/`dry`), `lhv_method`, `energy_potential_source`/`reference`, `data_nature` (nouvel enum), `biomass_status` (enum `solar_status`, défaut `unverified`), `acquisition_method`, `collected_on` ; contraintes CHECK simples ; les colonnes existantes (`annual_quantity_t`, `moisture_pct`, `calorific_value_mj_kg`, `energy_potential_mwh`, `exploitable_fraction_pct`, périodes) sont réutilisées, pas dupliquées. RLS existante conservée.
- RPC `estimate_project_energy` mis à jour pour la biomasse (statut validé, base « telle que reçue », unité tonne).
- `src/lib/biomass.functions.ts` (liste, détail, création atomique, mise à jour, statut, contrôle de rôle serveur), `biomass-model.ts` (schémas, avertissements, sélecteurs testés), `biomass-form.tsx`, `biomass-ui.tsx`.
- Routes `resources.biomass.tsx` (layout `<Outlet />`), `resources.biomass.index.tsx`, `.new.tsx`, `.$id.tsx` ; sections ajoutées aux fiches localité/site.
- Tests Playwright des 15 scénarios, y compris refus en lecture seule (compte Viewer) ; données temporaires supprimées ensuite.
