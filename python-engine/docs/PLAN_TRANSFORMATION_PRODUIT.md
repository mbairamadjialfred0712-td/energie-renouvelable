# Plan de transformation produit

## 1. Diagnostic
Le logiciel dispose d’un moteur scientifique solide (6 moteurs Python disponibles, contrôles de provenance, RLS) mais reste orienté saisie. La géographie couvre surtout la Côte d’Ivoire, la météo réelle n’est pas encore enregistrée et les rapports ne sont pas générés.

## 2. Architecture cible
Recherche de lieu → adaptateurs serveur avec cache → observations sourcées → dossier de site validé → parcours d’étude → moteurs Python → comparaison → finance → rapport.

## 3. Fonctionnalités à modifier
Tableau de bord (recherche, « Nouvelle étude énergétique », qualité/fraîcheur, alertes ; indicateurs actuels en section secondaire), Territoires (géocodage, limites, altitude), Météo (PVGIS, cache), Ressources (préremplissage sourcé), Projets (assistant d’étude), Rapports (génération réelle).

## 4. Ordre d’implémentation et complexité
| Phase | Contenu | Complexité |
|---|---|---|
| 1 | Socle adaptateurs, cache, journal, tables observations (migration) | Moyenne |
| 2 | Recherche de lieu + géocodage + précision ; dossier de site minimal | Moyenne |
| 3 | PVGIS TMY + NASA dans le dossier ; raccord PV/batterie après décision temporelle | Moyenne à élevée |
| 4 | Assistant d’étude 10 étapes et nouveau tableau de bord | Moyenne |
| 5 | Rapport généré depuis instantanés | Moyenne |
| 6 | GWA/GSA via Python (rasters), WorldPop, geoBoundaries | Élevée |
| 7 | Réseaux électriques, biomasse statistique, extension pays | Élevée, dépend des sources |

## 5. Décisions nécessitant validation de M. Joël
1. Source solaire de référence : PVGIS TMY, NASA année réelle, ou les deux comparées.
2. Politique 8 760/8 784 h.
3. Validation automatique ou humaine obligatoire des données fournisseurs avant simulation.
4. Usage de GWA (préliminaire) pour l’éolien en l’absence de mesures.
5. Géocodeur : Nominatim (ODbL, 1 req/s) ou import préalable des localités.
6. Ordre des pays à peupler.
7. Méthodes d’estimation de demande par type de projet (sources des profils).
8. Acceptation des licences CC BY / ODbL et des mentions dans les rapports.

## 6. Limites
Aucune implémentation avant validation de ce plan. Coûts d’hébergement et volumétrie rasters non chiffrés.
