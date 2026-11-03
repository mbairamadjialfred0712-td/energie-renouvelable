# Finalisation progressive du moteur scientifique

## Résultats de l’audit initial

**Tests : 225 Python + 435 applicatifs réussis.** Render répond HTTP 200 avec authentification configurée ; Simulations affiche la connexion et la batterie QA enregistrée a été ouverte. Aucun nouveau calcul hébergé lancé, aucune donnée réelle inventée, aucune clé modifiée.

| Domaine | État vérifié |
|---|---|
| PV | Horaires/jours/mois/année calculés par PVWatts ; vue horaire/journalière et équipements fabricant partiels. |
| Éolien | A/B/C testés ; production par courbe documentée, pas extrapolation d’une semaine. Seul A a un résultat hébergé enregistré. |
| Batterie | SOC, rendements, puissances, cycles équivalents, pertes et ENS testés ; PV+batterie QA enregistré. Vieillissement et peak shaving réel absents. |
| Biomasse | Primaire testé ; humidité tracée sans correction, chaleur/électricité non implémentées. |
| CSP | Bilan thermique prescrit testé, conversion électrique conditionnelle ; modèle de centrale/stockage absents. |
| Hybride | PV+batterie réel dans le stockage ; préparation/comparaison générale existante, dispatch multi-filières absent. |
| Optimisation | Sélection exhaustive réelle de 1–12 candidats enregistrés en TypeScript ; pas de dimensionnement de nouvelles tailles. |
| Finance | LCOE/flux/VAN/TRI/retours testés en TypeScript ; persistance complète et comparaison économique incomplètes. |

Ces tests ne constituent pas une validation scientifique. Rapport détaillé : `AUDIT_MOTEUR_SCIENTIFIQUE.md`.

## Étape 1 — Statuts et accès fidèles à la réalité

- Harmoniser Simulations et Technologies : calculs réellement implémentés, données requises et limites distinctes de la connexion Render et de la validation scientifique.
- Corriger les descriptions biomasse/CSP ; indiquer que finance et optimisation bornée existent dans l’application, même si les moteurs Python correspondants sont absents.
- Réutiliser les formulaires et résultats existants ; ne pas créer de calculs pour remplir une page.
- Vérifier navigation et consultation sous le compte demandeur, tests concernés et contrôle automatique.

**Cette approbation lance uniquement l’étape 1.** Chaque étape scientifique suivante sera préparée séparément, avec modèles et prérequis explicites avant codage.

## Étapes suivantes proposées

2. **Intégrité et lecture :** erreurs finance, références anciennes, rattachement production/projet ; vue PV horaire/journalière à partir des séries conservées. Toute politique à modifier sera expliquée avant migration.
3. **Qualification des moteurs existants :** PV, éolien C, batterie sur QA documentée, puis vraies données ; calcul/sauvegarde/relecture et accès refusés. Aucun remplacement des paramètres réels manquants par des hypothèses silencieuses.
4. **Hybride électrique :** définir et faire valider dispatch, bus, SOC, priorité et bilans ; réutiliser batterie pour éolien+batterie puis PV+éolien+batterie. Biomasse primaire exclue du bus électrique sans procédé validé.
5. **Optimisation/finance :** recherche bornée de nouvelles configurations après qualification du dispatch, comparaison économique et persistance des hypothèses/résultats.
6. **Extensions procédés :** biomasse chaleur/électricité et CSP stockage/dynamique seulement avec modèles, coefficients et sources validés par Joël.

## Pré-requis et limites

- Désigner un second compte QA autorisé avant test multi-comptes ; aucun compte tiers choisi arbitrairement.
- Fournir paramètres PV réels et sources économiques avant résultats professionnels.
- Validation des nouveaux modèles réservée à Joël ; aucune disponibilité déduite de la seule liste capabilities.
- Aucun déploiement ni changement de clé inclus. Comportement publié non vérifié dans cet audit.

## Détails techniques

- Conserver TanStack, fonctions serveur authentifiées, transport Render serveur uniquement et contrat v1.0 ; POST existants `/api/v1/simulations/validate` et `/api/v1/simulations`.
- Conserver stockage Lovable Cloud, instantanés et historiques ; pas de second dépôt Python ou second moteur batterie.
- Tests par étape : unités, intégration, bilans/identité/réponses et refus ; rapport des fichiers et limites à chaque livraison.