# Module Ressources solaires (Prompt 3)

Étend l'existant (tables `energy_resources` + `solar_resources`, page `/resources/solar`, pré-analyse IA). Aucune table dupliquée, aucun calcul PV.

## Ce que l'utilisateur obtient
- **/resources/solar** : liste avec recherche et filtres (localité, statut, nature de la donnée, source), lien vers la fiche et vers la localité/site.
- **/resources/solar/new** : formulaire en 4 blocs — Localisation (pays → région → département → localité → site en cascade), Ressource solaire, Source, Qualité.
- **/resources/solar/:id** : fiche détaillée (coordonnées, valeurs avec unités, origine, période, référence, qualité, notes, pré-analyse IA), boutons Modifier / Valider / Archiver.
- **Plusieurs jeux par localité** : chaque ajout crée un nouveau jeu, jamais d'écrasement. Tableau de comparaison côte à côte (GHI, DNI, DHI, températures, période, source, qualité) sans désigner de « bonne » source.
- **Graphiques** : barres comparant les jeux d'une même localité, affichés seulement s'il y a au moins 2 jeux ; aucune série fictive.
- **Aide** : info-bulle explicative pour GHI, DNI, DHI, températures, ensoleillement (non équivalent à l'irradiation).
- **Fiche localité /geography/localities/:id** (nouvelle) : section « Ressources solaires » — nombre de jeux, dernier jeu validé, source, période, lien.
- **Tableau de bord** : compteurs réels — localités avec données solaires, jeux validés, en attente, nombre de sources distinctes.

## Unités et validation
- Unité choisie explicitement pour GHI/DNI/DHI (kWh/m²/jour ou kWh/m²/an) et ensoleillement (h/jour ou h/an), stockée avec la valeur ; aucune conversion silencieuse.
- Bloquant : valeur non numérique, irradiations/ensoleillement < 0, min > max, ensoleillement > 24 h/jour ou > 8 784 h/an, période fin < début.
- Avertissement non bloquant (valeur conservée) : ex. GHI > 9 kWh/m²/jour, DNI+DHI très différent de GHI, température hors −60/+60 °C.

## Traçabilité et statuts
- Nature de la donnée : mesurée, importée, API, estimation, hypothèse (badge distinct ; une hypothèse n'apparaît jamais comme mesure).
- Méthode d'obtention, date de collecte, période début/fin, référence.
- Statuts : non vérifiée, en vérification, validée, rejetée, archivée. Les données non validées restent visibles avec un badge clair.

## Permissions (appliquées en base)
- Admin : tout. Engineer : créer/modifier ses données. Analyst et Viewer : lecture seule.
- Valider / rejeter : admin et engineer.
- Les nouveaux inscrits restent Viewer : vous (admin) devrez attribuer le rôle Engineer aux testeurs qui doivent saisir — je peux ajouter un écran simple de gestion des rôles si vous le souhaitez.

## Préparation du futur moteur
- Type `SolarResourceInput` (latitude, longitude, GHI/DNI/DHI + unités, températures, période, source, qualité, statut) et fonction de lecture qui ne renvoie par défaut que les jeux validés. Aucun calcul.
- Import CSV/Excel/PDF/API : contrat typé du parcours (source → extraction → normalisation → contrôle des unités → aperçu → confirmation), les données extraites arrivant toujours « non vérifiées ». Pas d'API externe branchée.

## Détails techniques
- Migration : sur `solar_resources` ajouter `ghi_unit`, `dni_unit`, `dhi_unit`, `sunshine_unit`, `site_id` (FK `study_sites`), `data_nature` enum, `acquisition_method`, `collected_on`, `period_start`, `period_end`, `solar_status` enum (unverified, in_review, validated, rejected, archived). Lever l'unicité `resource_id` n'est pas nécessaire : un jeu = une ligne `energy_resources` (+1 détail), donc plusieurs jeux par localité déjà possibles.
- RLS : lecture pour tout utilisateur connecté sur les ressources ; écriture si `has_role admin` ou (`engineer` et propriétaire). Mise à jour de `energy_resources` et `solar_resources`.
- Nouveau `src/lib/solar.functions.ts` (list/get/save/setStatus/compare/summary), `src/features/resources/solar/*` (formulaire, fiche, comparaison, graphiques via recharts), routes `resources.solar.index/new/$id.tsx`, `geography.localities.$id.tsx`, mise à jour de `getDashboardSummary`.
- Tests Playwright des 18 points du prompt, y compris erreurs de saisie et refus d'écriture pour un Viewer.
