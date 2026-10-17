# VALIDATION BATTERY — PROMPT 13

## Diagnostic initial (17 octobre 2026)
Moteur réservoir v1.0.0 enregistré et testé (201 Python globaux, 248 TypeScript globaux avant intervention). Simulation horaire C existante, capacité A indicative dans les fiches ; B autonomie absente. L'onglet saisissait des valeurs libres sans liaison configuration/PV côté serveur ; réponse batterie sans contrôle spécifique. SOC initial silencieusement borné, sorties arrondies entraînant dérive de bilan affiché, cycles calculés côté AC, mode pointe identique à autoconsommation. Sauvegarde commune existante, service Python non configuré dans l'environnement observé.

## Modèle réellement conservé — v1.1.0, contrat API 1.0
Pas horaire fixe Δt = 1 h, horodatages ISO locaux standard sans suffixe, décalage UTC explicite ; aucune interpolation ni annualisation. Les PV existants peuvent omettre le 29 février : une série avec ce trou est refusée par la batterie, pas interpolée.

A : E_nominale Wh = V × Ah ; kWh = Wh/1000. L'énergie déclarée a priorité ; V×Ah est un calcul indicatif lorsqu'elle manque, jamais énergie certifiée. L'écart avec la valeur déclarée reste visible (alerte existante >5 %, seuil documentaire et non tolérance de certification). E_utilisable = E_nominale × DoD/100 uniquement sans capacité utilisable déclarée ; ni SOC ni rendement cumulés dans ce contrôle. Champs incohérents/non finis : indisponibles. Méthode d'obtention conservée dans la fiche.

B : **indisponible**, aucun endpoint ou résultat d'autonomie ajouté. Demande moyenne liée, énergie délivrable/rendement retenu et méthode temporelle non encore intégrés. Formules candidates E_délivrable/P_moyenne (h) ou E_délivrable/demande_journalière (jours) NON implémentées ; consommation annuelle jamais répartie implicitement. Développement et validation séparés nécessaires ; aucune autonomie garantie.

C : clé historique `usable_energy_kwh` conservée pour compatibilité mais désigne la capacité de référence AVANT réduction SOC. Application : modules × énergie nominale figée. S_min = E_ref × SOC_min/100 ; S_max = E_ref × SOC_max/100 ; S_0 = E_ref × SOC_initial/100. SOC initial hors limites REFUSÉ, aucune correction silencieuse. Fenêtre accessible = S_max−S_min ; aucun DoD supplémentaire. Une limite utilisable retenue inférieure à la fenêtre entraîne refus, jamais seconde réduction. Rendements retenus du projet requis, aucun remplacement automatique par la fiche ni racine du rendement aller-retour.

- Direct = min(PV, demande).
- Charge AC = min(surplus, P_charge × 1h, (S_max−S)/η_charge).
- Stock ajouté = charge AC × η_charge.
- Décharge AC servie = min(déficit, P_décharge × 1h, (S−S_min) × η_décharge).
- Stock retiré = décharge AC / η_décharge.
- ENS = déficit − décharge AC ; surplus non distribué = surplus − charge AC.
- Pertes charge = charge AC × (1−η_charge).
- Pertes décharge = stock retiré × (1−η_décharge).
- Cycles équivalents = stock retiré cumulé / fenêtre SOC (indicatif, sans vieillissement).
- Puissances maximales de demande/déficit = énergies horaires / 1h, moyennes horaires en kW, pas pointes instantanées.
- Taux autoconsommation = (direct + charge AC)/production PV ; inclut charge perdue/stock restant, PAS énergie utile finale. Couverture = (direct + décharge AC)/demande. Dénominateur nul : indisponible, pas zéro.

Bilans : direct + charge + surplus = PV ; direct + batterie + ENS = demande ; S_fin−S_initial = η_charge×charge−déchargeAC/η_décharge. Sorties non arrondies, affichage seul arrondi. Bilans incohérents refusés ; contrôle indépendant TypeScript avant sauvegarde, tolérance numérique relative 1e-9 (plancher 1), pas tolérance physique. Historique ancien non recalculé.

## Hypothèses et limites
Réservoir, rendements constants ; ni autodécharge, vieillissement, température dynamique, C-rate dynamique, dimensionnement, optimisation ou réseau réellement simulé. `grid_import/export` restent clés historiques : déficit et surplus résiduels, PAS preuve d'énergie fournie par le réseau. Le stock initial peut être externe : couverture n'est pas une part renouvelable certifiée. `peak_shaving` conservé par compatibilité mais explicitement alias de pilotage autoconsommation dans cette version ; heures déclarées ne modifient pas le dispatch, aucune priorité ni objectif de pointe garanti. Corriger le dispatch exige arbitrage ingénieur séparé, aucune stratégie inventée.

## Intégration et sécurité
Même registre/endpoints `/api/v1/health`, `/capabilities`, `/simulations/validate`, `/simulations`. A et B n'ajoutent pas de moteur/endpoint. C passe par fonction serveur authentifiée, rôle admin/engineer existant, lecture RLS de configuration validée avec snapshot, production PV terminée du même projet. Paramètres et production client remplacés par valeurs enregistrées ; source/nature et rattachement du CSV au projet confirmés par utilisateur et figés. Ce rattachement est une déclaration humaine, pas une mesure indépendante. Seuls SOC initial/stratégie/demande sont déclarés pour l'exécution, validés des deux côtés. Aucun secret navigateur.

Sauvegarde commune simulations/results après identité, unités, longueurs, bornes et bilans ; instantané configuration/PV/demande dans paramètres. Consultation scalaires/SOC/ENS et provenance ajoutée. Modification ordinaire de configuration conservant la même fiche garde snapshot/date (NULL historiques inclus) ; changement de fiche ou actualisation explicite reste tracé, aucune reconstitution de valeurs passées. Historique existant conserve événements/différences, pas les anciennes fiches complètes : récupération intégrale des anciennes versions NON disponible et non inventée.

## Vérifications et état réel
- Avant : 201 Python, 248 TypeScript réussis.
- Après : **215 Python réussis, 0 échoué (201 existants + 14 nouveaux)** ; **278 TypeScript réussis, 0 échoué, 22 fichiers (248 existants + 30 nouveaux)** ; un avertissement Starlette/httpx. Tests nouveaux strict numbers/peak, initial SOC, microsecondes, précision/DC cycles, capacités et états invalides, sources/PV/projet, snapshot immuable et intégrité de réponse.
- Service local réellement lancé avec identité Cloud authentifiée : health → validation → calcul v1.1.0 réussis ; appel anonyme 401 sans résultat. Jeu arithmétique synthétique utilisé uniquement en mémoire, aucun enregistrement de données météo/batterie de démonstration.
- Navigateur authentifié, onglet batterie ordinateur/petit écran : calcul désactivé, zéro configuration validée/PV terminé accessible, absence d'erreur et débordement. Ce test d'indisponibilité NE vérifie PAS le succès de simulation.
- Rôles admin/engineer vs analyst/viewer : tests communs existants réexécutés avec doublures, pas de nouveaux essais multi-comptes en base pour ce parcours. Aucune permission/migration modifiée.
- Hébergé Render : NON TESTÉ ; URL/clé du service absentes ici. Calcul → sauvegarde → consultation batterie réelle BLOQUÉ ; pannes réelles de persistance NON TESTÉES. GET Python utilise NoRepository, pas récupération persistante ; l'application possède les données.

## À valider par M. Joël
Compatibilité énergie nominale/SOC/limite utilisable, rendements et frontières AC/DC, qualité/alignement du CSV avec le projet, références physiques et incertitudes/tolérances, provenance de l'état initial, portée des cycles, méthode d'autonomie et réelle politique de pointe. Approbation antérieure réservoir ≠ validation physique des résultats ou dimensionnement. Prochaine étape : service configuré, configuration réelle validée, PV terminé du même projet et demande horaire documentée ; test sauvegarde/consultation/échecs réels avant déclaration d'intégration hébergée.

## PROMPT 13.1 — vérifications réellement exécutées le 17 octobre 2026

### Préconditions et arrêt des parcours indisponibles
Comptages Cloud en lecture seule : 0 fiche batterie, 0 configuration projet (donc 0 validée), 0 PV terminé compatible ; après les essais, 0 simulation batterie également. Aucun cas complet enregistré ne peut être choisi. Aucune ligne synthétique n'a été insérée dans les données de production, aucune donnée supprimée, aucun compte/role modifié. Demande horaire compatible non disponible. URL et clé du service absentes dans l'environnement contrôlé ; appel réel de `getEngineStatus` renvoie `not_configured`. Cela n'établit pas la configuration d'un éventuel service Render externe : Render NON TESTÉ.

### Résultats des tests
- Suite complète Python : **220 réussis, 0 échoué**, dont 5 nouveaux cas ; un avertissement Starlette/httpx. Batterie initialement pleine à 90 % : stock 9 kWh, charge 0, surplus 10 kWh. Initialement vide au minimum autorisé 10 % : stock 1 kWh, batterie servie 0, déficit 3 kWh. Charge plafonnée à 5 kW malgré 10 kWh de PV : charge 5 kWh, surplus 5, stock 5,75. Décharge plafonnée à 5 kW malgré demande 10 kWh et énergie restante : servie 5, déficit 5. Sérialisation/récupération JSON conserve résultats et bilans ; ce n'est PAS une sauvegarde en base. Tests existants de données manquantes/dupliquées, épuisement et limites SOC réexécutés.
- Suite complète TypeScript : **280 réussis, 0 échoué**, 22 fichiers ; 2 nouveaux cas de conservation JSON et rejet d'une corruption SOC après sérialisation. Contrôles communs timeout, service inaccessible, erreurs et rôles réexécutés avec doublures, pas pannes hébergées provoquées.
- Les deux premiers essais du nouveau test Python ont échoué à cause d'une mauvaise utilisation du format interne `EngineOutput` par le test, corrigée en construisant la véritable enveloppe `SimulationResponse` et en utilisant `metadata`. Aucune formule modifiée pour satisfaire un test.
- Service FastAPI **local** réellement lancé, santé puis validation/calcul batterie avec identité authentifiée réussis ; fixture arithmétique 2 h uniquement en mémoire, charge attendue 3 kWh. Appel anonyme réellement refusé 401 sans résultat. Aucun appel à un service hébergé.
- Navigateur connecté : appels des vraies fonctions de l'application `listBatteryConfigurations` (liste vide), `getEngineStatus` (non configuré) et tentative `runBatterySimulation` avec identifiants fictifs inexistants explicitement QA. Refus « configuration inaccessible ou non validée » avant création de simulation/appel moteur. Formulaire bloqué, aucune erreur navigateur, capture vérifiée. Le refus ne prouve pas le parcours de réussite.
- Appel HTTP brut sans session ni cookies à la vraie fonction `listBatteryConfigurations` : **403**. Un contexte navigateur neuf n'était pas une preuve d'anonymat, l'aperçu réinjectant une session ; l'essai a été remplacé par le client HTTP sans session.
- Compilation observée : **build OK**. Aucun code moteur, formule, permission ou autre technologie modifié durant PROMPT 13.1 ; seuls tests/documentation ajoutés.

### Parcours calcul → sauvegarde → affichage
Lecture d'une configuration réelle : arrêt (aucune). Validation/appel local : réalisés uniquement sur fixture non enregistrée. SOC/bilans/déficits : tests déterministes réussis. Sauvegarde/récupération en base et comparaison avec affichage : **NON EXÉCUTÉES**, faute de configuration/PV/demande/service. Écart calcul↔JSON : nul sur les valeurs testées ; écart calcul↔base↔UI : **non mesurable**, pas zéro. Aucune déclaration de chaîne complète ou de préparation production.

### Isolation entre comptes
Quatre comptes existent, mais aucun n'est identifié comme compte de test autorisé ; aucune donnée privée d'un autre compte lue ni aucune session tierce créée. **Tests croisés réels entre deux comptes NON EXÉCUTÉS** ; l'absence de configurations n'est pas une preuve RLS. Lecture des migrations owner/admin et tests communs admin/engineer vs analyst/viewer exécutés ne remplacent pas deux sessions réelles. L'accès admin attendu peut inclure des lignes tierces selon les règles existantes : ne pas le traiter comme contournement. Pour le test critique : deux comptes de test explicitement autorisés, dont au moins un non-admin, et données synthétiques isolées ; vérifier lecture, résultats, modifications et statut via l'application ET accès données sous chaque session. Aucun accès réel croisé aux utilisateurs existants entrepris.

### Paramètres et actions nécessaires
1. Déployer le service Python existant, renseigner `SCIENTIFIC_ENGINE_URL` (HTTPS) et `SCIENTIFIC_ENGINE_KEY` uniquement dans les secrets serveur de l'application ; côté service, `ENGINE_SHARED_KEY` correspondant et configuration Cloud/JWT attendue (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`). Ne jamais afficher leur contenu ni les placer dans le code/rapport. Vérifier `/health` et `/capabilities`, version batterie 1.1.0 et authentification configurée.
2. Fournir un projet de test et fiche/configuration batterie enregistrée et validée avec snapshot, modules, nominal, SOC min/max, rendements séparés et puissances ; produire un PV terminé authentique du même projet et un CSV demande documenté à horodatages identiques. Ne pas fabriquer une production PV terminée par écriture directe.
3. Autoriser explicitement deux comptes de test et un espace de données synthétiques séparé ; sinon arrêter l'isolation croisée.
4. Exécuter la chaîne complète, relire les scalaires/séries enregistrés, comparer UI/base/calcul, vérifier accès négatifs et pannes de sauvegarde dans cet environnement autorisé. La validation scientifique des frontières, rendements, demande et incertitudes reste à Joël ; autonomie et priorité horaire restent hors périmètre, non implémentées.
