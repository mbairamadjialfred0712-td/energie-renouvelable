# Feuille de route

## Terminé (17/10/2026)
- [x] Moteur batterie « réservoir + rendements » dans python-engine (39 tests, bilan énergétique contrôlé)
- [x] Raccordement batterie à Simulations (contrat TS, runBatterySimulation, formulaire avec PV simulé + demande CSV)
- [x] Fiche projet : hypothèses financières (CAPEX, OPEX, durée, taux, dégradation, remplacements) + LCOE affiché + historique
- [x] Page Analyse financière pré-remplie avec les hypothèses du projet (?project=...)
- [x] Liaison LCOE ↔ simulation existante (production année 1 = annual_ac_energy enregistrée, jamais recalculée)

## En attente (bloquant externe)
- Exécution E2E PV et batterie : le moteur Python n'est pas en ligne (Render + secrets SCIENTIFIC_ENGINE_URL/KEY). Tant qu'il n'est pas déployé, aucune simulation ne peut tourner et aucune simulation PV terminée n'existe pour tester la liaison production → LCOE.

## En cours
- [x] PROMPT A1 : module biomasse finalisé (garde de validation stricte, 20 tests vitest)
