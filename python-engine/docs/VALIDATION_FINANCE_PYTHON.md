# Analyse économique Python — transfert du 20/11/2026

## Périmètre livré
Moteur finance v1.0.0 : LCOE, flux annuels, VAN, TRI conditionnel, retours simple/actualisé et sensibilité bornée. Conventions conservées : monnaie constante, CAPEX/subvention an 0, flux fin d’année, dégradation géométrique ; sans fiscalité ni dette. Les anciens moteurs TypeScript servent seulement de références de régression, aucun écran ne les exécute.

## Entrées et sécurité
Coûts vierges à remplir ; montants explicites (zéro également), sources des postes, références/documentation datées et confirmation obligatoire. Tarifs requis pour les parts positives, parts cumulées au plus 100 %, remplacements dans la durée. Les documents sont déclarés par l’utilisateur, non authentifiés automatiquement. Aucune garantie que les valeurs saisies soient des coûts réels.

Les appels passent par le serveur authentifié, avec rôle ingénieur/admin. Une production annuelle liée est relue sous les droits de l’utilisateur, même projet et kWh, année complète. Le navigateur ne peut remplacer sa valeur. Aucun secours local si Python est indisponible.

## Persistance
Une insertion unique dans simulations conserve requête, coûts, production/provenance, réponse Python et rapport complet. La réponse est contrôlée (identité, version, unités, entrées, longueur et bilans) et le résultat relu après sauvegarde. Résultats consultables dans Simulations, avec sources et entrées figées. Pas de nouvelle table ou changement de permissions.

## Vérifications effectuées
- 74 tests TypeScript ciblés réussis : anciens calculs de référence, nouveaux contrats, refus de coûts manquants, sources, production liée et transport.
- 32 tests Python ciblés réussis ; après actualisation de l’ancien test de catalogue, suite complète : 245 tests réussis, 2 avertissements de dépréciation. Environnement local Python 3.13 temporaire, pas reproduction exacte du Python 3.12.7 hébergé.
- Render annonce finance disponible v1.0.0 ; aucun déploiement manuel ni secret modifié.
- Parcours connecté sous le compte demandeur : refus d’entrée vide, LCOE via Render, sauvegarde, ouverture du résultat ; flux et trois variantes, sauvegarde, puis relecture dans une session neuve.
- Cas QA explicitement fictifs : CAPEX 1000 XOF, OPEX 50 XOF/an, production 1000 kWh/an, 10 ans, taux/dégradation 0 ; LCOE 0,15 XOF/kWh, VAN 1000 XOF avec tarif fictif 0,25 ; retour 5 ans. Ces valeurs ne sont pas des prix ni des mesures réels. Deux analyses QA conservées avec les justificatifs signalant leur nature.
- Aperçu vérifié ; recette publiée et isolation réelle multi-comptes non effectuées. Validation scientifique et devis réels à fournir avant décision d’investissement.

## Fichiers principaux
Python app/engines/finance/engine.py et registre ; contrats et écrans src/features/finance/python-finance-* ; src/lib/finance-source.server.ts, finance-run.server.ts et engine.functions.ts ; projet/route finance et lecture des résultats.