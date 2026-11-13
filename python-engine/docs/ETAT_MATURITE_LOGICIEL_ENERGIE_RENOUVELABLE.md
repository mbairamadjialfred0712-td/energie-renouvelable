# État de maturité du logiciel ENERGIE RENOUVELABLE

Date : 13/11/2026. Sources : code et base de données consultés ce jour, `RAPPORT_RECETTE_GENERALE.md` (08/11/2026), rapports `VALIDATION_*.md`, `STRATEGIE_REFERENTIEL_DEMOGRAPHIQUE.md` (12/11/2026).

## Légende des niveaux
| Code | Niveau |
|---|---|
| N1 | Implémenté (code présent et accessible dans l'application) |
| N2 | Testé localement (tests automatisés réussis) |
| N3 | Testé sur le service hébergé Render (calcul réel exécuté et sauvegardé) |
| N4 | Vérifié dans l'application publiée |
| N5 | Validé scientifiquement par l'ingénieur (M. Joël) |
| DEV | En développement / non disponible |

## Tableau des fonctionnalités
| Fonctionnalité | N1 | N2 | N3 | N4 | N5 | Réserve principale |
|---|---|---|---|---|---|---|
| Territoires (pays, régions, départements, localités, sites) | Oui | Oui | n/a | Non vérifié | Non | Pas de niveau « commune » distinct ; localités GeoNames estimées |
| Population nationale + suivi Banque mondiale | Oui | Oui | n/a | Non vérifié | Non | Import automatique écrit directement (211 pays) sans validation humaine préalable — décision D1 |
| Météo horaire par site | Oui | Oui | n/a | Non vérifié | Non | Jeux réels non encore importés ; jeu 8 760 h actuel synthétique |
| Ressources solaires (GHI, DNI, DHI, irradiation, température) | Oui | Oui | n/a | Non vérifié | Non | Aucune ressource réelle validée sur le site QA |
| Ressources éoliennes | Oui | Oui | n/a | Non vérifié | Non | Mesures réelles absentes |
| Biomasse / déchets | Oui | Oui | n/a | Non vérifié | Non | Fiche biomasse validée absente |
| Demande énergétique | Oui | Oui | n/a | Non vérifié | Non | Demande horaire actuelle fictive (QA) |
| Moteur PV (PVWatts v8, NREL PySAM) | Oui | Oui | Oui (QA synthétique) | Non vérifié | Non | Paramètres d'installation = hypothèses |
| Moteur éolien (niveaux A/B/C) | Oui | Oui | Oui, niveau A (QA) | Non vérifié | Non | Niveau A ne calcule pas de production électrique |
| Moteur biomasse (énergie primaire) | Oui | Oui | Non | Non vérifié | Non | Pas de conversion électrique ; aucune fiche validée |
| Moteur CSP (bilan thermique prescrit) | Oui | Oui | Non | Non vérifié | Non | Pas de modèle de centrale, stockage ni dispatch |
| Moteur batterie (bilan horaire, SOC) | Oui | Oui | Oui (QA synthétique) | Non vérifié | Non | Dépend d'un PV terminé du même projet |
| Systèmes hybrides | Partiel | Oui | Non | Non vérifié | Non | Pas de simulation chronologique multi-sources |
| Comparaison de scénarios | Oui | Oui | n/a | Non vérifié | Non | Lit les résultats enregistrés, ne recalcule pas |
| Optimisation V1 (choix parmi 1–12 batteries enregistrées) | Oui | Oui | Non | Non vérifié | Non | Pas de dimensionnement PV/éolien ni objectif de coût |
| Analyse financière (CAPEX, OPEX, flux, VAN, TRI, retour, LCOE, sensibilité) | Oui (application) | Oui | n/a (pas dans Python) | Non vérifié | Non | Résultats financiers non encore enregistrés |
| Importation de documents (PDF, XLSX, CSV, DOCX) | Oui | Oui | n/a | Non vérifié | Non | Pas d'OCR ; validation humaine obligatoire |
| Rapports | Structure | Partiel | n/a | Non vérifié | Non | Génération à éprouver ; pas d'export PDF fiable |

« Non vérifié » en N4 : l'application publiée répond (HTTP 200 le 13/11/2026) mais aucun parcours connecté n'y a été testé.

## Indicateurs techniques vérifiés le 13/11/2026
- Tests TypeScript : 466 réussis sur 38 fichiers (exécution du jour). La recette du 08/11 en comptait 447, puis 456 après l'évolution démographique.
- Tests Python : 225 réussis selon la recette du 08/11 ; **non réexécutés ce jour** (outil de test absent de l'environnement d'audit).
- Moteur Render : en ligne, `auth_configured: true`.
- Base : 45 tables publiques, toutes avec règles d'accès (44 lors de la recette, + 2 tables d'import démographique, voir contradictions).
- Comptes : 1 administrateur, 1 ingénieur, 7 lecteurs (la recette indiquait 5 lecteurs).
- Stockage : 1 espace privé (`project-imports`).

## Risques et réserves
| Domaine | Réserve | Priorité |
|---|---|---|
| Scientifique | Aucun moteur validé par l'ingénieur ; aucun cas de référence réel | 1 |
| Sécurité | Isolation entre deux comptes autorisés non testée | 2 |
| Données | Données de démonstration synthétiques ; populations Banque mondiale importées sans relecture | 3 |
| Technique | Hybride chronologique et optimisation étendue absents ; finance hors moteur Python | 4 |
| Production | Version publiée non recettée ; domaine personnalisé non configuré | 5 |
