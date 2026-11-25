# Architecture du référentiel énergétique automatisé

Statut : proposition, non implémentée. Validation de M. Joël requise.

## 1. Principe
```text
Navigateur → fonctions serveur authentifiées → registre d’adaptateurs → cache/observations → validation humaine → moteurs Python
```
Aucun appel externe dans React ; aucune clé côté navigateur. Une réponse HTTP valide ne vaut pas validation scientifique.

## 2. Contrat d’adaptateur
Chaque adaptateur (module serveur dédié) déclare : nom, endpoint, méthode, authentification, limites de débit, couverture, résolution spatiale, période, unités natives, licence/attribution, version, statut. Il retourne des observations normalisées sans conversion silencieuse :
`variable, valeur, unité native, période, résolution, nature (modélisé/mesuré/statistique/projection), source, URL de requête, date de récupération, limites`.

## 3. Fournisseurs vérifiés (24/11/2026)
| Fournisseur | Usage | Accès / limites | Licence | Vérification |
|---|---|---|---|---|
| NASA POWER horaire | GHI/DNI/DHI Wh/m², T2M °C, vent 10 m | Sans clé, UTC, 2001→quasi temps réel ; solaire 1°×1°, météo 0,5°×0,625° | Données publiques NASA | Déjà raccordé ; sondage 200, 24 h, unités conformes |
| PVGIS 5.3 (JRC) | TMY 8 760 h, séries horaires, PV | GET seul, 30 appels/s/IP, pas d’AJAX ; SARAH-3 + ERA5 2005–2023 | Réutilisation avec mention de source | Sondage 200 : 8 760 h, SARAH3/ERA5, altitude 8 m |
| Global Solar Atlas | Moyennes long terme GHI/DNI/DIF/PVOUT | Rasters à télécharger, pas d’API documentée | CC BY 4.0 | Documentation consultée |
| Global Wind Atlas 4 | Vent moyen, Weibull, densité, ~250 m | Rasters (363 Go) ; ERA5 2008–2017 | CC BY 4.0 (métadonnées Figshare) | Usage préliminaire selon DTU |
| Banque mondiale WDI | Population nationale | API sans clé | CC BY 4.0 | Déjà raccordé, hebdomadaire |
| WorldPop | Population ~100 m 2015–2030 | API | CC BY 4.0 | Estimations modélisées |
| geoBoundaries | Limites administratives | Fichiers | CC BY 4.0 | Documentation |
| Nominatim (OSM) | Géocodage | ≤ 1 req/s, cache obligatoire, User-Agent | ODbL | Politique d’usage lue |
| GeoNames | Référentiel administratif | Crédits par appel | CC BY | Déjà importé statiquement |
| FAOSTAT | Production agricole, forestière, bioénergie | API avec authentification | CC BY 4.0 | Statistiques nationales seulement |
| energydata.info / ECREEE | Réseaux transport/distribution | Fichiers GeoJSON/SHP, 2015–2017 | CC BY / CC BY-SA 4.0 | Couverture partielle, ancienne |

Références : PVGIS API https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/using-pvgis-5/api-non-interactive-service_en ; NASA POWER https://power.larc.nasa.gov/docs/services/api/temporal/hourly/ ; GSA https://globalsolaratlas.info/support/terms-of-use ; GWA4 https://data.dtu.dk/articles/dataset/Global_Wind_Atlas_4/28955267 ; Nominatim https://operations.osmfoundation.org/policies/nominatim/ ; WorldPop https://api.worldpop.org/v3/about ; geoBoundaries https://www.geoboundaries.org/ ; FAO https://www.fao.org/contact-us/terms/db-terms-of-use/en/ ; Banque mondiale https://data.worldbank.org/summary-terms-of-use ; ECREEE https://energydata.info/en/dataset/distribution-grid-ecowas-region-west-africa.

## 4. Stockage proposé (migration future)
- `data_providers` : catalogue et statut.
- `provider_requests` : clé de cache (fournisseur, version, point arrondi à la résolution, période, paramètres), statut, durée, erreur, empreinte de réponse.
- `site_data_observations` : observations immuables liées au site, avec provenance complète et statut de validation.
- `site_data_dossiers` : instantané versionné des observations retenues pour une étude.
RLS : lecture propriétaire/admin ; écritures par fonctions serveur après contrôle de rôle.

## 5. Robustesse
Cache par clé arrondie, déduplication des requêtes en vol, délais d’attente, 2 nouvelles tentatives maximum avec attente progressive (hors 4xx), respect de 429, mode dégradé (« donnée indisponible »), journal par requête, quotas par utilisateur. Fetch compatibles Workers (`redirect: "manual"`). Les grands rasters (GSA, GWA) sont traités côté Python ou en préextraction, jamais dans le navigateur.

## 6. Risques
Changement d’API, quotas partagés, résolution grossière (NASA 1°), licence ODbL à attribution/partage, rasters très volumineux, confusion données de grille/mesures.
