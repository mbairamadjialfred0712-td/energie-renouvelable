# Feuille de route

## Terminé (17/10/2026)
- [x] Moteur batterie « réservoir + rendements » dans python-engine (39 tests, bilan énergétique contrôlé)
- [x] Raccordement batterie à Simulations (contrat TS, runBatterySimulation, formulaire avec PV simulé + demande CSV)
- [x] Fiche projet : hypothèses financières (CAPEX, OPEX, durée, taux, dégradation, remplacements) + LCOE affiché + historique
- [x] Page Analyse financière pré-remplie avec les hypothèses du projet (?project=...)
- [x] Liaison LCOE ↔ simulation existante (production année 1 = annual_ac_energy enregistrée, jamais recalculée)

## En attente (bloquant externe)
- Exécution E2E PV et batterie : Render est en ligne et SCIENTIFIC_ENGINE_URL/KEY sont enregistrés depuis le 22/10/2026, mais ENGINE_SHARED_KEY reste à configurer côté Render ; aucune simulation PV terminée n’existe pour tester la liaison production → LCOE.

## En cours
- [x] Demande de 08:44 UTC du 22/10/2026 : rôle administrateur de Joël confirmé sans changement de permissions ; SCIENTIFIC_ENGINE_URL et SCIENTIFIC_ENGINE_KEY enregistrés via stockage sécurisé ; identité publique et ENGINE_ENV=production configurés côté Render, déploiement relancé ; application connectée au service et trois formulaires consultés sous ce compte.
- [ ] Demande de 08:44 UTC du 22/10/2026 : finaliser la clé commune côté Render puis calcul → sauvegarde → relecture (bloqué : health production répond auth_configured=false après relance ; utilisateur doit enregistrer la même valeur dans ENGINE_SHARED_KEY via Render puis déployer ; aucun jeu météo validé, aucune fiche biomasse validée, aucune configuration batterie validée, aucun PV terminé ni demande compatible ; aucune réussite de calcul déclarée).
- [x] Demande du 22/10/2026 : Render relancé avec PYTHON_VERSION=3.12.7 et cache nettoyé ; commande générique gunicorn remplacée par uvicorn app.main:app et contrôle /api/v1/health ; déploiement live à 08:38:49 UTC, Python 3.12.7 confirmé par les journaux, health et capabilities HTTP 200, moteurs PV/éolien/biomasse/batterie chargés ; deux contrôles de cohérence runtime exécutés avec succès.
- [ ] Demande du 22/10/2026 : calcul → sauvegarde → consultation éolien, primaire biomasse et batterie (blocages actualisés dans la demande de 08:44 UTC ci-dessus). Connexion Render utilisable pour les actions ponctuelles, mais liaison au projet refusée car son propriétaire n’a pas accès ; ne pas contourner ce partage.
- [x] Correction installation Render du 21/10/2026 : Python 3.14 sans wheel PySAM ; version 3.12.7 fixée dans le dépôt et le moteur, téléchargement du wheel Linux CPython 3.12 vérifié, consignes de relance ajoutées ; déploiement hébergé à confirmer par son nouveau journal
- [x] PROMPT 14 HYBRIDE : audit, préparation A sauvegardée/relue avec historique, comparaison B des résultats individuels sans agrégation, permissions serveur/base, tests et VALIDATION_HYBRID.md ; C explicitement indisponible
- [ ] PROMPT 14 HYBRIDE : B alimenté par de vrais résultats, isolation entre deux comptes et C coordonné (bloqué : résultats individuels absents, comptes QA autorisés, service configuré, contrat de dispatch et validation scientifique Joël nécessaires)
- [x] PROMPT 14 : audit service/connexion/RLS/privilèges, documentation DEPLOYMENT_READINESS.md et README corrigé ; 220 Python + 280 TypeScript réussis, état non configuré vérifié avec session réelle ; aucun déploiement, secret, formule ou donnée modifié
- [ ] PROMPT 14 : pilote et validation hébergée, pannes/rollback et isolation A/B (bloqué : accord de déploiement/coût Render, service et secrets absents, comptes QA explicitement autorisés et données synthétiques compatibles à fournir ; cible Python 3.12.7 à vérifier avant promotion)
- [x] PROMPT 13.1 : limites et bilans batterie, JSON, service local authentifié, refus réel de configuration inexistante et accès anonyme 403 vérifiés ; 220 Python et 280 TypeScript réussis, aucune donnée créée ; rapport ajouté à VALIDATION_BATTERY.md
- [ ] PROMPT 13.1 : chaîne batterie hébergée et comparaison calcul/base/UI (bloqué : service absent, aucune fiche/configuration ni PV terminé, demande compatible manquante) ; isolation croisée réelle (bloqué : deux comptes de test explicitement autorisés et fixtures isolées manquants)
- [x] PROMPT 13 : audit et corrections sûres stockage A/C, contrats, sources serveur, snapshots conservés, interface SOC/ENS et VALIDATION_BATTERY.md ; 215 Python et 278 TypeScript réussis, service local authentifié et refus navigateur vérifiés
- [ ] PROMPT 13 : parcours batterie réel hébergé sauvegarde/consultation et échecs (bloqué : service configuré, configuration validée, PV terminé et demande documentée du même projet nécessaires) ; autonomie et politique de pointe restent à valider par Joël
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
