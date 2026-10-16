# Module Demande énergétique (prompt 6)

## Ce qui sera livré
- Pages : liste et tableau de bord de la demande, création, fiche détaillée, modification (remplacent l'écran Demande actuel, qui n'enregistre rien).
- Recherche (nom, localité, site, catégorie) et filtres (période, type de consommateur, statut). Indicateurs calculés uniquement sur les fiches enregistrées ; états vides explicites.
- Formulaire en 5 étapes : identification et localisation (Pays → Région → Département → Localité → Site filtrés en cascade), équipements (lignes ajoutables/supprimables), profil de consommation, alimentation existante et contraintes, sources et validation.
- 12 catégories de consommateurs, avec précision obligatoire pour « Autre ».
- Fiche détaillée : identité, localisation, équipements, résumé de consommation, profil de charge, source et période, hypothèses, statut, historique des modifications, boutons selon les droits.
- Section « Demandes énergétiques » sur la fiche de chaque localité.

## Calculs (uniquement ceux-ci)
- Par équipement : énergie journalière (kWh/j) = quantité × puissance unitaire (W) × durée (h/j) ÷ 1 000 ; si saisie en kW, sans division.
- Jours d'utilisation : convention unique « jours par semaine (0–7) » ; moyenne journalière = énergie d'un jour d'usage × jours/7, affichée avec cette hypothèse.
- Mensuel : moyenne journalière × 30 jours, hypothèse affichée à côté.
- Facteur d'utilisation appliqué seulement s'il est saisi avec sa définition et sa source.
- Total calculé seulement si toutes les lignes sont complètes ; sinon message explicatif.
- Consommation mesurée stockée et affichée séparément, jamais remplacée par l'estimation ; mention « l'inventaire ne remplace pas une campagne de mesure ».
- Aucun dimensionnement, facteur de simultanéité ni appel à un moteur Python.

## Graphiques (seulement avec des données réelles)
Répartition par catégorie, consommation estimée par équipement, profil journalier (si créneaux saisis), évolution temporelle (si plusieurs mesures datées), mesure vs estimation (si les deux existent). Chaque graphique indique l'unité, la période et la nature (mesurée / estimée / calculée).

## Droits
- Admin et Ingénieur : création, modification, validation.
- Analyste : création et modification de ses propres fiches, sans validation.
- Lecteur : consultation uniquement.
- Appliqué dans l'interface, les fonctions serveur et les règles de la base. Confidentialité alignée sur les ressources : lecture par le propriétaire et les administrateurs.

## Tests
Exécution des 12 tests du prompt avec une fiche temporaire supprimée ensuite ; le test Lecteur sera signalé s'il ne peut pas être réalisé réellement.

## Détails techniques
- Réutilisation de `energy_demands` (migration additive : site, catégorie et précision, consommateur, usagers, période début/fin, mesures séparées en JSON, profil horaire JSON par créneaux, saisonnalité, alimentation/contraintes, méthode d'acquisition, auteur de collecte, statut à 5 valeurs réutilisant l'enum `solar_status`).
- Nouvelle table `energy_demand_equipment` liée à la demande (quantité > 0, puissance ≥ 0, unité W/kW, heures 0–24, jours/semaine 0–7, priorité).
- Historique immuable `energy_demand_history` par déclencheur.
- Moteur pur `demand-engine.ts` testé unitairement ; contrat d'export prêt pour le futur moteur Python.
- Routes `demand.tsx` (layout), `demand.index.tsx`, `demand.new.tsx`, `demand.$id.tsx`, `demand_.$id.edit.tsx`.
