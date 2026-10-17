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
- [ ] PROMPT 10 : auditer le CSP et présenter le choix scientifique, puis implémenter uniquement le modèle retenu avec contrat, tests et validation documentée (attente du choix scientifique avant calcul)
- [x] PROMPT 9 : audit PV, corrections dates/payload/réponses/persistance et écritures directes ; 66 tests Python + 147 frontend, service local authentifié et aperçu en échec honnête vérifiés ; documentation de mise en service complétée
- [x] PROMPT A1 : module biomasse finalisé (garde de validation stricte, 20 tests vitest, écritures compensées, voie générique fermée, sélecteur projet aligné sur le RPC)
- [x] PROMPT A2 : module demande finalisé (33 tests vitest, validations serveur renforcées, cohérence site/localité, contrôle de rôle à la suppression, politique RLS équipements corrigée, parcours navigateur vérifié)
