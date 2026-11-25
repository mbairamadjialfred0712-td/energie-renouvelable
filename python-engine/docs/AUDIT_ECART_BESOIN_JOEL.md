# Audit de l’écart fonctionnel — besoin de M. Joël (PROMPT 24)

Date : 24/11/2026. Audit en lecture seule : aucun code applicatif, moteur, migration, import, permission ou configuration Render modifié.

## 1. Besoin exprimé
Saisir un pays ou une localité, sélectionner le lieu, obtenir automatiquement coordonnées et données environnementales fiables, puis ne renseigner que le besoin, les technologies, les équipements et les coûts avant simulation, comparaison, finance et rapport.

## 2. Constats vérifiés
- Base : 247 pays, 19 régions, 63 départements, 357 localités, 1 site d’étude, 49 fiches ressources, 2 fiches météo, 2 demandes, 1 projet, 5 simulations terminées, 0 rapport.
- Les 2 fiches météo enregistrées sont **synthétiques QA** (8 760 h et 168 h) ; aucune fiche météo réelle n’est enregistrée.
- Afrique de l’Ouest : Côte d’Ivoire 14 régions / 81 localités ; Togo 5 régions / 1 localité ; Bénin, Burkina Faso, Ghana, Mali, Niger, Sénégal : 0 région et 0 localité. Population nationale présente pour les 8 pays (ANStat pour la Côte d’Ivoire, Banque mondiale pour les autres).
- GeoNames = référentiel administratif statique importé ; il ne fournit aucune ressource énergétique.
- NASA POWER horaire est déjà raccordé côté serveur (`src/lib/weather.functions.ts`) : aperçu, enregistrement `unverified`, puis validation humaine. Pas de PVGIS, Global Solar Atlas, Global Wind Atlas, FAO ni infrastructures raccordés.
- Pas de cache fournisseur, de déduplication, de quotas ni de traitement 429 ; timeout seulement.
- Moteur Render (sondage du 24/11/2026) : santé 200, authentification configurée ; PV 1.0.1, CSP 1.0.0, éolien 1.0.0, biomasse 1.0.0, batterie 1.1.0, finance 1.0.0 disponibles ; hybride et optimisation non implémentés en Python.
- Tâche planifiée active : import population hebdomadaire (lundi 03:00 UTC).
- RLS activée sur les 45 tables publiques ; ressources et météo lisibles par propriétaire/admin.
- Rapports : page descriptive sans génération réelle.
- Recherche projets/localités : pas de recherche centrale par lieu ; index de recherche texte absents.

## 3. Tableau des écarts par module
| Module | Fonction actuelle | Saisie manuelle | Disponible | Absent | Automatisation possible | Risques |
|---|---|---|---|---|---|---|
| Tableau de bord | Compteurs réels, carte | — | Inventaires | Recherche de lieu, nouvelle étude, qualité/fraîcheur | Recherche centrale, alertes de données manquantes | Afficher couverture comme qualité |
| Territoires | Hiérarchie, GeoNames, population nationale | Sites, coordonnées de sites | 357 localités, 247 pays | Limites, altitude systématique, 6 pays prioritaires sans localités | Géocodage serveur, geoBoundaries, altitude PVGIS/SRTM | Homonymes, précision de point |
| Ressources | Fiches solaire/vent/biomasse/déchets | Totale | Validation, sources | Préremplissage par fournisseur | GSA/PVGIS/NASA (solaire), GWA (vent) | Confondre modélisé et mesuré |
| Météo par site | Import CSV/Excel, NASA POWER | Choix période | Contrôles UTC, unités natives | PVGIS TMY, cache | PVGIS TMY 8 760 h, NASA | 8 760/8 784, unités |
| Demande | Inventaire, mesures, profils | Totale | Distinction mesuré/estimé | Profils types sourcés | Assistant d’estimation explicite | Présenter estimation comme mesure |
| Technologies / batterie | Fiches constructeur, réglages versionnés | Totale | Historique | Catalogue fournisseurs | Bibliothèque constructeur sourcée | Valeurs par défaut cachées |
| Simulations | 5 moteurs Python + finance | Sélection des jeux | Contrôles serveur | Préparation automatique des entrées | Dossier de site → entrées moteurs | Adaptations temporelles implicites |
| Hybride / scénarios | Comparaison de résultats fiables | Sélection | Compatibilité contrôlée | Dispatch chronologique | Après validation scientifique | Additions aveugles |
| Optimisation | Sélection exhaustive batterie stockée | Candidats | Bornes explicites | Dimensionnement, coût | Ultérieure | Optimum mal interprété |
| Finance | Python, coûts datés | Coûts, tarifs | Production liée relue | Coûts de référence | Bibliothèque de devis sourcés | Coûts génériques présentés comme réels |
| Projets | Fiche, hypothèses, historique | Totale | Liens | Parcours guidé | Assistant 10 étapes | — |
| Importations | PDF/XLSX/CSV/DOCX, validation humaine | Corrections | Historique | Liaison automatique aux ressources | Proposition de champs à valider | Extraction non vérifiée |
| Rapports | Description | — | — | Génération | Rapport depuis instantanés | Résultats non tracés |
| Moteur Render | 6 moteurs disponibles | — | Contrats stricts | Adaptateurs données | Adaptateurs côté serveur | Charge, quotas |

## 4. Écarts principaux
1. Absence de recherche centrale « Où souhaitez-vous réaliser votre étude ? ».
2. Absence de dossier automatique de ressources par site.
3. Fournisseurs limités à NASA POWER (météo) et Banque mondiale (population).
4. Couverture territoriale quasi nulle hors Côte d’Ivoire.
5. Passage météo → PV : PV exige 8 760 h ; NASA d’une année bissextile = 8 784 h ; la batterie refuse le saut du 29 février retiré.
6. Pas de rapport généré.

## 5. Limites de cet audit
Isolation multi-comptes et version publiée non retestées ; sondages fournisseurs ponctuels sur un point public de Lomé (6,13 N ; 1,22 E), non importés.
