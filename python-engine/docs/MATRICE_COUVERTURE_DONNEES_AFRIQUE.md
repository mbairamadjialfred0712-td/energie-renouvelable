# Matrice de couverture des données — Afrique de l’Ouest

Couverture = disponibilité documentée chez le fournisseur ; elle ne garantit ni précision locale ni validation sur site. « Base » = état actuel du logiciel au 24/11/2026.

## 1. État de la base par pays
| Pays | Régions | Localités | Population nationale |
|---|---|---|---|
| Côte d’Ivoire | 14 | 81 | ANStat, projection 2026 |
| Togo | 5 | 1 | Banque mondiale 2025 |
| Bénin, Burkina Faso, Ghana, Mali, Niger, Sénégal | 0 | 0 | Banque mondiale 2025 |

## 2. Matrice par variable (identique pour les 8 pays sauf mention)
| Variable | Fournisseur | Couverture | Résolution | Période | Accès | Qualité connue / limites |
|---|---|---|---|---|---|---|
| Géographie admin. | GeoNames (base), geoBoundaries | Mondiale | Points / polygones | Variable | Fichiers | Base vide pour 6 pays ; limites à importer |
| Géocodage | Nominatim | Mondiale (OSM) | Point | Courante | ≤1 req/s | Précision variable en zone rurale |
| Altitude | PVGIS (SRTM 90 m) | Mondiale terres | 90 m | Statique | API | Altitude du modèle, non relevé |
| Solaire horaire | PVGIS SARAH-3 | Afrique couverte | ~5 km | 2005–2023 | API | Satellite ; testé sur Lomé |
| Solaire horaire | NASA POWER | Mondiale | 1°×1° | 2001→ | API | Résolution grossière |
| Solaire long terme | Global Solar Atlas | Mondiale | ~250 m–1 km | Moyennes | Rasters | Pas de série horaire |
| Climat (T, HR) | PVGIS ERA5 / NASA MERRA-2 | Mondiale | ~9–50 km | 2001/2005→ | API | Réanalyse |
| Vent | Global Wind Atlas 4 | Mondiale | ~250 m | 2008–2017 | Rasters | Préliminaire ; validation DTU sans pays ouest-africain listé dans le rapport consulté |
| Vent horaire | NASA (10 m), PVGIS ERA5 (10 m) | Mondiale | ≥9 km | 2001/2005→ | API | Pas à hauteur de moyeu |
| Population nationale | Banque mondiale, ANStat (CIV) | Nationale | Pays | Annuelle | API / manuel | Estimations, projections |
| Population locale | WorldPop | Mondiale | ~100 m | 2015–2030 | API | Modélisée, pas recensement |
| Biomasse | FAOSTAT | Nationale | Pays | Annuelle | API authentifiée | Production ≠ mobilisable |
| Déchets | Statistiques nationales | Variable | — | — | Non vérifié | Non intégrable sans source |
| Réseau électrique | energydata.info (WAPP/ECREEE) | Transport : CEDEAO ; distribution : Bénin, Burkina Faso, Ghana (+ Mali, Niger, Sénégal en jeux séparés) | Vecteurs | 2007–2017 | Fichiers | Anciens, partiels ; Côte d’Ivoire distribution non vérifiée |

## 3. Limites
Non vérifiés pour chaque pays : exactitude des fournisseurs localement, couverture du réseau de distribution en Côte d’Ivoire et au Togo, données déchets, recensements infranationaux (RGPH). Aucune donnée n’a été importée.
