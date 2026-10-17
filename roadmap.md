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
- [ ] PROMPT 13 : auditer et finaliser stockage A/B/C, contrats, sécurité, interface, tests et VALIDATION_BATTERY.md sans reconstruire ni altérer les instantanés
- [x] PROMPT 12 : audit données/RPC/intégration et VALIDATION_BIOMASS.md ; 172 tests Python et 222 TypeScript existants réussis, aucune fiche biomasse en base, aucun moteur modifié
- [x] PROMPT 12 : V1 primaire approuvée et intégrée (moteur isolé, sélection serveur, instantanés, formulaire/résultats, aucune fraction/conversion supposée) ; 201 Python et 248 TypeScript réussis, service local authentifié et navigateur connecté vérifiés, build OK
- [ ] PROMPT 12 : premier bilan réel hébergé calcul → sauvegarde → consultation et échecs de persistance (bloqué : service configuré et vraie fiche biomasse documentée/validée à fournir ; validation physique Joël restante)
- [x] PROMPT 11.1 : audit ciblé et corrections durées/unités, géométrie, sources/limites, intégrité et lectures ; 172 Python + 222 TypeScript réussis, navigateur connecté et service local authentifié vérifiés ; PV/CSP et données inchangés
- [ ] PROMPT 11.1 : premier calcul réel hébergé et persistance/échecs de sauvegarde (bloqué : service configuré, météo validée et courbe compatible à fournir ; Render NON TESTÉ)
- [x] PROMPT 11 : audit réel et conception A/B/C consignés dans VALIDATION_WIND.md ; 116 tests Python et 175 TypeScript existants réexécutés ; catalogue 24 fiches, aucune validée et aucune série enregistrée
- [x] PROMPT 11 : conventions V1 validées ; moteur A/B/C, sélection météo serveur et snapshots, onglet/résultats intégrés ; 165 Python + 204 TypeScript réussis, service local avec identité réelle et formulaire connecté vérifiés ; pas de migration ni moteur PV/CSP modifié
- [ ] PROMPT 11 : parcours hébergé calcul → sauvegarde → consultation (bloqué : service non configuré, données météo validées et courbe documentée compatibles à fournir) ; validation physique finale à confirmer par Joël
- [x] PROMPT 10.1 : conformité CSP contrôlée, défauts de séries/réponses corrigés et limites affichées ; 116 tests Python + 175 TypeScript et service local/navigateur réexécutés, aucune donnée fictive en base ; Render/persistance hébergée restent bloqués comme PROMPT 10
- [x] PROMPT 10 : audit, choix Joël bilan thermique limité, moteur/contrat séparés, onglet CSP, provenance figée et tests exécutés ; dossier de validation complété
- [ ] PROMPT 10 : parcours CSP hébergé avec persistance réelle (bloqué : service Python non configuré, aucun jeu météo validé disponible ; paramètres et validation scientifique Joël à fournir)
- [x] PROMPT 9 : audit PV, corrections dates/payload/réponses/persistance et écritures directes ; 66 tests Python + 147 frontend, service local authentifié et aperçu en échec honnête vérifiés ; documentation de mise en service complétée
- [x] PROMPT A1 : module biomasse finalisé (garde de validation stricte, 20 tests vitest, écritures compensées, voie générique fermée, sélecteur projet aligné sur le RPC)
- [x] PROMPT A2 : module demande finalisé (33 tests vitest, validations serveur renforcées, cohérence site/localité, contrôle de rôle à la suppression, politique RLS équipements corrigée, parcours navigateur vérifié)
