# PROMPT 12 — audit biomasse et V1 primaire à valider

## Rapport d’audit en dix points

1. **Existant réutilisable — TERMINÉ :** fiches, sites/localités, validation, sources, registre Python, authentification et sauvegarde commune inspectés.
2. **Fichiers — TERMINÉ :** `python-engine/docs/VALIDATION_BIOMASS.md` créé ; feuille de route et règles actualisées. Aucun moteur modifié.
3. **Niveaux — PARTIEL :** ancien estimateur électrique existant ; aucun moteur Python biomasse ni nouveau bilan primaire.
4. **Équations — À VALIDER PAR L’INGÉNIEUR :** primaire proposé `M(t/an) × PCI(MJ/kg) / 3,6 = MWh/an`, distinct du calcul électrique actuel avec fraction et deux rendements.
5. **Données — BLOQUÉ :** aucune fiche biomasse en base. Convention d’humidité absente ; méthode de combinaison des disponibilités non définie.
6. **Service — PARTIEL / NON TESTÉ :** opérations communes suffisantes ; configuration absente de l’environnement inspecté, aucun parcours hébergé vérifié.
7. **Tests — TERMINÉ pour l’existant :** 172 Python réussis (un avertissement), 222 TypeScript dans 17 fichiers, dont 21 biomasse. Aucun nouveau test primaire.
8. **Interface et persistance — NON TESTÉ pour le nouveau moteur :** pages conservées, aucun nouveau résultat enregistré.
9. **Limites — À VALIDER PAR L’INGÉNIEUR :** recensé ≠ mobilisable ; base d’humidité non structurée ; aucune conversion sèche/humide approuvée ; catégories distinctes ≠ lots distincts.
10. **Régressions et suite — PARTIEL :** tests existants réussis, PV/CSP/éolien inchangés. Valider les choix ci-dessous avant intégration.

## V1 proposée

- Calculer uniquement **l’énergie primaire de la quantité recensée**, sur une fiche validée : tonnes annuelles reçues et PCI reçu, sources et méthode documentées.
- Confirmer la base de masse et la convention d’humidité dans les hypothèses traçables du calcul ; aucune correction d’humidité automatique.
- Exiger douze mois complets datés ; refuser quantités mensuelles, volumes et matière sèche dans cette V1.
- Présenter séparément les quantités technique, durable, collectable et livrable enregistrées ; **ne pas appliquer la fraction exploitable**, ni calculer une mobilisation sans méthode approuvée.
- Chaleur utile et électricité **indisponibles avec motif**, jusqu’à validation de procédés et paramètres.
- Un bilan par fiche, aucun cumul de ressources ou de simulations, aucune donnée fictive enregistrée.
- Conserver l’ancien estimateur électrique distinct du nouveau moteur primaire.

## Réalisation après approbation

1. Ajouter un moteur Python primaire versionné et des tests numériques/refus.
2. Réutiliser validation/calcul communs, sans nouvel endpoint, table ou migration sauf nécessité démontrée.
3. Lire et vérifier la fiche côté serveur, figer données/hypothèses/sources/période et contrôler la réponse avant sauvegarde.
4. Ajouter la sélection biomasse à Simulations et le lien depuis sa fiche ; distinguer données mesurées/importées/estimées/hypothèses et résultat primaire.
5. En cas de service absent ou d’échec, aucun faux succès ni calcul de remplacement.
6. Réexécuter les tests, vérifier l’interface connectée et distinguer vérification locale et parcours hébergé avec données réelles.

## Détails techniques

Réutiliser `engine.functions`, contrôles de rôle et tables simulations/results. La consultation persistée reste dans l’application, pas dans le dépôt Python non persistant. Ne jamais relier automatiquement l’énergie primaire au LCOE. L’approbation du périmètre n’est pas une validation scientifique de procédé.