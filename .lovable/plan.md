# Module Ressources éoliennes (Prompt 4)

Reprendre l'architecture du module solaire (liste / création / fiche détaillée) pour le vent, en réutilisant `wind_resources` et `energy_resources`, sans nouvelle table concurrente et sans moteur de production supplémentaire.

## Ce qui sera construit

1. **Pages**
   - `/resources/wind` : liste filtrable (localité, site, période, hauteur, source, nature, statut, qualité), compteurs réels, graphiques existants d'évolution.
   - `/resources/wind/new` : formulaire en 4 sections — A. Localisation (pays → région → département → localité → site), B. Mesures (vitesse moyenne m/s, hauteur m, direction °, période, série temporelle ou distribution optionnelle), C. Compléments (vitesse max, densité kg/m³, facteur de capacité avec unité % ou fraction, méthode et origine), D. Source et validation (source, référence, nature, date de collecte, qualité, statut, notes).
   - `/resources/wind/:id` : fiche détaillée, modification, changement de statut, pré-analyse IA existante, comparaison avec les autres jeux de la même localité.
2. **Validation** : nombres non négatifs pour vitesse/hauteur, direction 0 à moins de 360°, facteur de capacité borné selon l'unité choisie, période cohérente. Valeurs inhabituelles = avertissement non bloquant, jamais corrigées.
3. **Nature et statuts** : mesure locale, étude technique, fichier importé, API, estimation, hypothèse ; statuts non vérifiée, en vérification, validée, rejetée, archivée. Badge « estimation » visible : jamais présentée comme mesure.
4. **Plusieurs jeux** par localité, jamais écrasés ; tableau de comparaison neutre (vitesse, hauteur, période, source, qualité, méthode) signalant les écarts sans désigner de source préférée.
5. **Visualisation** : évolution temporelle et comparaison des périodes (vue partagée existante) ; histogramme de distribution et rose des vents seulement si une série/distribution a été saisie ; sinon état vide explicatif.
6. **Fiches localité et site** : section « Ressources éoliennes » listant les jeux associés.
7. **Sécurité** : saisie Admin/Ingénieur, lecture propriétaire/admin (règles actuelles), contrôles en base et côté serveur.
8. **Hors périmètre** : moteur Python, simulation, dimensionnement, hybrides, finance. L'estimation par facteur de capacité déjà livrée reste inchangée.

## Détails techniques

- Migration additive sur `wind_resources` : `site_id` (FK `study_sites`), `data_nature` (réutilise l'enum `solar_data_nature` étendu de `technical_study`, ou nouvel enum `wind_data_nature`), `wind_status` (enum `solar_status` réutilisé, défaut `unverified`), `acquisition_method`, `collected_on`, `capacity_factor_unit` (`%`/`fraction`), `capacity_factor_method`, `timeseries jsonb` et `speed_distribution jsonb` nullable ; contraintes de plage simples ; RPC éolien mis à jour pour exiger `wind_status = 'validated'` et normaliser le facteur selon son unité déclarée.
- Les 24 jeux NASA importés reçoivent `data_nature = api`, statut `unverified`.
- Server functions dans `resources.functions.ts` (création atomique ressource + détail, mise à jour, statut), schémas Zod partagés, sélecteurs purs pour distribution/rose avec tests unitaires.
- Routes `resources.wind.index.tsx`, `resources.wind.new.tsx`, `resources.wind.$id.tsx` ; `resources.wind.tsx` devient layout avec `<Outlet />`.
- Tests Playwright des 12 scénarios du prompt avec données temporaires supprimées ensuite.
