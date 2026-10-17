# PROMPT 14 — Audit de préparation au déploiement

**Projet : Énergie Renouvelable — audit du 17 octobre 2026.**

## 1. Verdict et périmètre

**Prêt pour préparer un pilote contrôlé, pas déclaré opérationnel ni prêt pour la production.** Le service possède cinq moteurs implémentés et une connexion serveur prévue, mais aucun service hébergé n'est configuré dans l'application. Aucun déploiement, changement de secrets, migration, modification de permissions, création de données ou modification scientifique n'a été effectué pendant cet audit.

Le chemin le plus court est le service web Python natif prévu par `render.yaml`, puis un test intégré sur un espace synthétique explicitement autorisé. Ce chemin n'exige ni second moteur, ni accès privilégié à la base depuis Python, ni disque persistant. Le plan Starter prévu est payant : accord nécessaire avant création.

### État observé

| Élément | État et preuve |
|---|---|
| Point d'entrée | `python-engine/app/main.py`, application FastAPI `app` |
| API | `/api/v1`, schéma 1.0, version du service 0.1.0 |
| PV | PVWatts v8 via NREL PySAM, version 1.0.1 ; disponibilité conditionnée à l'import PySAM |
| Batterie | Réservoir + rendements, version 1.1.0 ; autonomie et priorité de pointe non garanties |
| CSP | Bilan thermique prescrit limité, version 1.0.0 |
| Éolien | Niveaux A/B/C documentés, version 1.0.0 |
| Biomasse | Énergie primaire recensée uniquement, version 1.0.0 ; aucune conversion électrique implicite |
| Hybrid / optimization / finance Python | `not_implemented` ; distincts du calcul LCOE existant côté application |
| Hébergement | Blueprint présent, déploiement non exécuté |
| Configuration application | `SCIENTIFIC_ENGINE_URL` et `SCIENTIFIC_ENGINE_KEY` absents de la liste des secrets |
| Données en base | 0 fiche batterie, 0 configuration stockage validée, 0 simulation terminée, 0 résultat, 0 jeu météo validé |
| Interface connectée | `/simulations/new` affiche « Moteur de calcul non configuré », aucun résultat de substitution ; 0 erreur JavaScript |

Ces comptages sont une photographie au moment de l'audit, pas une garantie permanente. Les tests locaux ne constituent ni une validation physique par Joël, ni une preuve d'intégration Render.

## 2. Architecture et autorisation observées

```text
Navigateur connecté
  → fonction serveur Lovable (session + rôle + accès aux données)
  → HTTPS : clé partagée serveur + jeton utilisateur
  → FastAPI : vérification de la clé et de l'identité
  → contrat Pydantic → moteur déterministe → réponse
  → serveur Lovable : vérification identité/complétude/bilans
  → persistance contrôlée dans Lovable Cloud
  → lecture utilisateur sous RLS → interface
```

- `src/start.ts` attache le jeton utilisateur et conserve la protection CSRF. Les fonctions de calcul utilisent `requireSupabaseAuth`.
- `assertCanRun` lit les rôles via le client utilisateur : seuls `admin` et `engineer` calculent. Les rôles ne proviennent pas du formulaire ou du profil modifiable.
- Projet et localité sont lus sous les permissions de l'utilisateur avant tout accès privilégié. Batterie : configuration validée, snapshot et PV terminé du même projet. CSP/éolien : météo validée et liens site/localité contrôlés. Biomasse : source validée et compatibilité territoriale contrôlée.
- Le navigateur ne contacte pas FastAPI et ne reçoit pas la clé partagée. Le transport Python est importé dynamiquement dans les traitements serveur. Les variables sont lues à l'intérieur des appels serveur.
- `engine-http.server.ts` impose HTTPS (exception locale de développement), refuse les URL avec identifiants/requête/fragment et les redirections ; ce dernier refus évite de retransmettre les credentials à une autre destination.
- Python vérifie le jeton via `/auth/v1/user` avec la clé publishable et un délai de 5 s. Il ne lit pas les tables de projets et ne persiste aucun résultat : `NoRepository` retourne toujours absent. Ses routes GET simulation/résultats ne doivent donc pas servir à la consultation de l'application.
- Python authentifie le transport et l'identité ; **les droits métier sont contrôlés par Lovable**. Un client possédant la clé partagée et un jeton valide peut envoyer des entrées directement à Python sans contrôle de rôle/projet par Python ; il ne peut pas par cette voie enregistrer un résultat dans l'application. Garder la clé strictement serveur.
- `requested_by` est dérivé de l'identité vérifiée ; un champ supplémentaire de ce nom dans la requête est refusé. Ne pas confondre les identifiants déclarés dans un corps Python avec une autorisation de projet.

## 3. Vérification de la base et risques de sécurité

Les politiques **et les privilèges effectifs** ont été lus dans la base actuelle, pas seulement dans les migrations.

- RLS est activée sur les sept tables inspectées : `projects`, `simulations`, `simulation_results`, `project_storage_configs`, `battery_datasheets`, `site_weather_datasets`, `user_roles`.
- Projets, simulations et résultats : lecture propriétaire ou administrateur via `app_private.can_access`. Les ressources énergétiques utilisent aussi propriétaire/admin. Les fiches, configurations et météo imposent une identité non nulle pour la lecture.
- `app_private.can_access` teste propriétaire ou rôle admin ; `can_write_resource` teste admin ou propriétaire ingénieur. `user_roles` a une politique SELECT sur le propre utilisateur, aucune politique d'écriture utilisateur.
- Les privilèges INSERT/UPDATE/DELETE sur `simulations` et `simulation_results` sont effectivement refusés à `anon` et `authenticated`. Le client privilégié les possède ; il n'est chargé qu'après les contrôles utilisateur.
- Plusieurs autres tables inspectées ont des privilèges SQL larges pour `anon`/`authenticated`, mais leurs politiques RLS restreignent effectivement les opérations. **Ce n'est pas une fuite démontrée.** Réduire les privilèges inutiles après analyse d'impact améliorerait la défense en profondeur ; aucune permission n'a été changée ici.
- La lecture des résultats dans l'application utilise le client utilisateur, pas le client privilégié. Les sorties sont montrées comme résultats seulement pour une simulation terminée ; la lecture des séries exige aussi ce statut.
- Aucune preuve de contournement inter-comptes n'a été trouvée dans les chemins inspectés ; **l'isolation réelle entre deux comptes reste NON TESTÉE**. Les comptes de test et leurs données isolées doivent être explicitement désignés et autorisés.

### Risques restant à traiter

| Risque | Conséquence et action avant production |
|---|---|
| Calcul CPU synchrone dans une route `async` | Peut retarder autres appels et santé. Mesurer le pire cas/concurrence sur le pilote ; isoler l'exécution ou utiliser une file de tâches si nécessaire, sans changer les formules. |
| Persistance en plusieurs requêtes | Simulation `running`, résultats puis statut final ; compensation, pas transaction globale. Une interruption ou panne d'enregistrement du statut peut laisser `running` ou des lignes résiduelles. Prévoir finalisation transactionnelle/idempotente et reprise contrôlée. |
| Nettoyage compensatoire non contrôlé | L'erreur du DELETE après échec du statut final n'est pas vérifiée. L'interface masque les résultats non terminés, mais cela ne prouve pas leur absence en base ; tester explicitement cette panne. |
| Délai réseau ≠ annulation du calcul | 10 s par défaut, 60 s pour validation puis calcul. Deux appels de 60 s ne garantissent pas que l'hôte Lovable accepte toute cette durée. L'abandon côté appelant n'arrête pas nécessairement Python. Mesurer l'ensemble et éviter les relances automatiques non idempotentes. |
| Santé superficielle | `/health` renvoie HTTP 200 même sans auth configurée ; `auth_configured` teste seulement la présence des variables, pas leur validité ni la disponibilité de l'identité. Compléter les contrôles manuels authentifiés avant acceptation. |
| Débit et supervision absents | Pas de limitation de débit, métriques, corrélation ou alertes applicatives identifiées. À mettre en place avant ouverture générale. |
| Journalisation des exceptions | Le handler ne journalise explicitement ni corps ni en-têtes, mais `log.exception` inclut la trace et le message de l'exception. Auditer leur contenu et leur rétention ; ne pas garantir l'absence de données sensibles sans test. |
| Versions partiellement épinglées | PySAM est épinglé ; dépendances web utilisent des plages. Rejouer les tests sur Python 3.12.7 et archiver/rendre reproductible l'environnement exact avant promotion. |

Les appels de validation et de calcul sont bien **dans** le `try` de `runEngine` : un timeout intercepté déclenche normalement l'enregistrement `failed`. Le risque de `running` persistant concerne une interruption du processus ou l'échec de cette écriture, pas systématiquement tout timeout.

## 4. Configuration de déploiement proposée, non appliquée

### Fichiers nécessaires déjà présents

- `render.yaml` à la racine : service web natif Python, `rootDir: python-engine`, plan Starter, Python 3.12.7, santé `/api/v1/health`.
- `python-engine/requirements.txt` et `requirements-dev.txt`.
- `python-engine/.env.example` : noms uniquement, jamais un fichier de production à commettre.
- Aucun Dockerfile ou fichier de verrouillage complet : **pas nécessaire au chemin natif proposé**, mais un déploiement Docker ne peut pas être déclaré préparé.

Commandes exactes du blueprint (répertoire `python-engine`) :

```bash
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port $PORT --proxy-headers --timeout-keep-alive 30
```

`--timeout-keep-alive 30` règle les connexions inactives ; **ce n'est pas un délai maximal de simulation**. Ne pas ajouter plusieurs workers au hasard : mémoire et concurrence doivent être mesurées.

### Variables, sans valeurs sensibles

| Emplacement | Nom | Rôle |
|---|---|---|
| Render | `PYTHON_VERSION` | Version 3.12.7 actuellement prévue ; compatibilité cible à vérifier |
| Render | `PORT` | Fourni par Render, pas à inventer |
| Render | `ENGINE_ENV` | Environnement production |
| Render | `ENGINE_SHARED_KEY` | Secret partagé avec Lovable ; aucune valeur dans le dépôt ou le rapport |
| Render | `SUPABASE_URL` | URL du même service d'identité que l'application ; valeur de configuration publique |
| Render | `SUPABASE_PUBLISHABLE_KEY` | Clé publique de ce même service ; pas de clé privilégiée |
| Render | `CORS_ORIGINS` | Le blueprint autorise actuellement l'origine publiée de l'application |
| Render | `MAX_BODY_BYTES` | Limite de requête existante : 3 000 000 octets |
| Secrets serveur Lovable | `SCIENTIFIC_ENGINE_URL` | URL HTTPS racine réelle du service, **sans** suffixe `/api/v1` |
| Secrets serveur Lovable | `SCIENTIFIC_ENGINE_KEY` | Même secret que `ENGINE_SHARED_KEY` |

Les noms techniques `SUPABASE_*` sont ceux du service existant ; aucune console externe de base n'est nécessaire. Python n'a besoin ni d'un mot de passe SQL ni d'une clé service-role.

CORS ne protège pas les appels serveur-à-serveur et ne remplace jamais les contrôles de clé/session. L'origine de l'aperçu n'a pas besoin d'être ajoutée : le navigateur appelle Lovable, pas Render. Ne pas ouvrir `*` pour résoudre un problème de liaison serveur.

### Séquence proposée

1. Autoriser explicitement le pilote Render et son coût ; choisir un commit de référence, les comptes de test et un espace synthétique séparé.
2. Rejouer tests et installation sur Python 3.12.7 ; vérifier la roue PySAM compatible et archiver versions, OS, Python, commit et versions moteur.
3. Connecter le dépôt au Blueprint Render existant, examiner les paramètres avant création. Pas d'auto-promotion non contrôlée pour le pilote.
4. Fournir les deux paramètres publics d'identité dans Render. Le blueprint prévoit une génération Render de `ENGINE_SHARED_KEY` ; transférer cette valeur uniquement entre champs sécurisés. Si la saisie partagée est accompagnée par Lovable, utiliser un formulaire sécurisé avec génération/copie et destination Render, jamais une clé générée dans la conversation.
5. Après démarrage, contrôler santé et capacités sur l'URL réelle. Vérifier l'auth réellement, pas seulement `auth_configured`.
6. Enregistrer l'URL racine et la même clé via les secrets serveur Lovable ; vérifier l'égalité sans les afficher ou les journaliser.
7. Exécuter le parcours de validation ci-dessous. Le statut « connecté » est uniquement une preuve de joignabilité/configuration déclarée, pas un certificat de calcul ou d'autorisation.
8. Promouvoir seulement après les preuves techniques, la mesure des limites et la validation scientifique applicable par Joël.

Cette séquence n'a pas été exécutée pendant l'audit. Aucun secret n'est demandé ou modifié ici.

## 5. Santé, limites et retour arrière

Contrôles publics, sans credential :

```bash
curl --fail --silent --show-error "$ENGINE_BASE_URL/api/v1/health"
curl --fail --silent --show-error "$ENGINE_BASE_URL/api/v1/capabilities"
```

`ENGINE_BASE_URL` représente l'URL HTTPS réelle à fournir après création. Attendre service 0.1.0, schéma 1.0, `auth_configured: true`, et capacités aux versions indiquées plus haut. Cette lecture ne prouve pas la validité de la clé ou du jeton. OpenAPI est accessible à `/api/v1/docs` et `/api/v1/openapi.json` ; ne mettre aucun secret dans ses exemples.

Les calculs sont synchrones, aucune file ni reprise de tâche n'est implémentée. Le corps est limité à 3 Mo (Content-Length **et** corps reçu). Les séries sont bornées par le contrat ; le PV complet doit respecter sa convention annuelle. Aucun résultat n'est stocké sur le disque Render, qui peut rester éphémère. Le plan gratuit endormi est impropre à ce pilote à délai limité ; Starter évite ce facteur sans garantir les performances.

### Retour arrière proposé

1. Suspendre les nouveaux calculs et noter les identifiants des simulations en cours ; ne pas supprimer les historiques ni snapshots.
2. Depuis Render, revenir à un déploiement réussi retenu avant promotion (dans la fenêtre de conservation des artefacts). Garder le même domaine et les secrets inchangés si leur compatibilité est confirmée.
3. Refaire santé, capacités et un test authentifié synthétique ; si incompatibilité de schéma/version, garder les calculs indisponibles, sans fabriquer de résultats.
4. Si l'artefact n'est plus conservé, redéployer le commit de référence avec son environnement archivé. Un rollback de code n'est pas un rollback de secrets ni de données.
5. Examiner les `running`/`failed` et résidus avec une procédure autorisée ; ne jamais marquer `completed` sans résultat vérifié. Toute future migration exige un plan distinct de retour arrière.

**Retour arrière NON EXÉCUTÉ.** Références plateforme : [service Python natif](https://render.com/docs/deploy-fastapi), [santé](https://render.com/docs/health-checks), [retour arrière](https://render.com/docs/rollbacks), [services gratuits](https://render.com/docs/free). Ces fonctionnalités plateforme ne prouvent pas la compatibilité de ce projet.

## 6. Parcours de validation de bout en bout à exécuter

Nommer chaque projet et fichier « SYNTHÉTIQUE — QA PROMPT 14 — NON PRODUCTION », déclarer la nature `assumption` et une référence de fixture. Aucune fixture n'a été insérée pendant l'audit.

Le premier parcours utile est **PV**, puis batterie sur ce PV effectivement calculé : ne jamais écrire directement un faux PV terminé. Fournir les paramètres PV explicitement et un CSV annuel complet conforme au contrat. Pour la batterie : fiche documentée, configuration validée avec snapshot, PV du même projet et demande horaire documentée avec les mêmes horodatages ; aucun default de SOC/rendement/puissance.

| Étape | Action / preuve attendue | État actuel |
|---|---|---|
| 1 | Compte de test A ingénieur, non-admin, explicitement autorisé ; session réelle | Session du demandeur utilisée pour lire l'état ; ce n'est pas la désignation de A/B |
| 2 | Projet QA appartenant à A accessible ; B non-admin ne le voit pas | Comptes et projet QA isolé à fournir |
| 3 | Charger les entrées compatibles ; relire source, période, unités et statut | Jeu météo validé/configuration/PV terminé absents |
| 4 | Validation puis calcul depuis l'application, sur service réel | Bloqué : service non configuré |
| 5 | Vérifier identité simulation, moteur, version, unités, séries, agrégats et bilans avant écriture | Contrats testés localement ; exécution hébergée non réalisée |
| 6 | Sauvegarder tous les résultats et confirmer seulement après statut final | Non réalisée |
| 7 | Recharger après nouvelle navigation/session ; lire base et interface | Non réalisée |
| 8 | Comparer valeurs non arrondies calcul/base ; interface selon son arrondi ; conserver écarts réellement mesurés | Non mesurable actuellement, **pas écart zéro** |
| 9 | Sans session, mauvaise clé, jeton expiré, analyst/viewer : aucun calcul/succès ; saisie invalide refusée | Couverture locale partielle, hébergé non réalisé |
| 10 | B ne peut lire/modifier/statuer sur projet/configuration/résultats A, via application et client de données ; puis inversement | Bloqué : deux comptes autorisés et fixtures isolées |

Tester aussi interruption réseau, réponse JSON invalide, réponse du mauvais moteur/ID, corps trop grand, échec INSERT résultats, échec statut final, échec nettoyage et interruption du processus. Pannes de persistance uniquement dans un environnement de test autorisé, jamais en production. Attendre des états honnêtes `failed`/indisponible, pas un succès synthétique. Vérifier le maintien des résultats historiques et l'absence de doublons lors d'une relance.

## 7. Tests et inspections réellement réalisés

### Tests exécutés le 17/10/2026

```bash
python3 -m pytest python-engine/tests -q
bunx vitest run
```

- **Python : 220 réussis, 0 échoué**, un avertissement Starlette sur l'adaptateur httpx TestClient.
- **TypeScript : 280 réussis, 0 échoué, 22 fichiers.** Total : **500 tests réussis**.
- Environnement Python local : **3.13.12**, FastAPI 0.143.3, Pydantic 2.14.1, pydantic-settings 2.16.0, httpx 0.28.1, uvicorn 0.54.0, nrel-pysam 7.1.1.post1. **Pas le Python 3.12.7 Render.**
- Tests locaux incluent absence/mauvais jeton avec vérificateur simulé dans certains tests, clé absente, schéma, unité/paramètres, moteur non implémenté, corps chunked excessif, contrats/bilans et transport sécurisé. Un mock d'identité ne constitue pas un test d'auth hébergée.
- Navigateur avec session réelle du demandeur : état non configuré observé, aucun résultat substitué, 0 erreur JavaScript. Capture vérifiée : `/tmp/browser/prompt14/readiness.png` (preuve de contrôle, pas donnée énergétique).
- Liste des secrets lue sans valeur ; politiques, privilèges, fonctions d'accès et comptages lus sans modification de base.
- Métadonnées des routes de contenu inspectées, y compris index : titres/description propres présents ; les routes sans contenu sont des layouts, aucune modification de page dans cet audit.

### Fichiers inspectés

- Service : `app/main.py`, `core/config.py`, `core/security.py`, `core/errors.py`, `api/routes/v1.py`, `api/schemas/contract.py`, `engines/registry.py`, `engines/base.py`, moteurs PV/batterie/CSP/éolien/biomasse, `services/validation.py`, `repositories/simulations.py` (sous `python-engine/`).
- Déploiement : `render.yaml`, `python-engine/.env.example`, `requirements.txt`, `requirements-dev.txt`, `README.md`, dossiers de validation scientifique.
- Application : `src/start.ts`, `src/lib/engine.functions.ts`, `engine-http.server.ts`, `engine-access.server.ts`, sources serveur batterie/CSP/éolien/biomasse, contrats/réponses, routes de simulations et metadata des routes.
- Sécurité : migrations de création et `0022_trusted_simulation_results.sql`, puis état actuel via `pg_policies`, `pg_class`, privilèges et définitions `app_private`.
- Tests : six fichiers Python et vingt-deux fichiers TypeScript exécutés ; focus transport, accès et préparations des sources.

### Corrections réalisées

Documentation seulement : ce rapport et le README (liste des moteurs, lieu réel de persistance, dépendances, lien vers la procédure). Feuille de route mise à jour. Aucun changement de formule, transport, configuration Render, secrets ou permissions. Les risques opérationnels ont été documentés plutôt que corrigés silencieusement pendant un audit.

## 8. Prochaine action la plus utile

**Autoriser un pilote Render et désigner deux comptes non-admin de test avec leur espace synthétique.** Avant sa création, valider l'installation/tests sur Python 3.12.7 et préparer une fixture PV complète documentée. Ensuite seulement configurer les secrets et vérifier la chaîne réelle calcul → sauvegarde → lecture → comparaison → refus inter-comptes.

Le service reste **NON DÉPLOYÉ PAR CET AUDIT, INTÉGRATION HÉBERGÉE NON VÉRIFIÉE**. La validation scientifique finale reste à Joël. Autonomie batterie, priorité de pointe, orchestration hybride et optimisation ne sont pas rendues disponibles par ce rapport.