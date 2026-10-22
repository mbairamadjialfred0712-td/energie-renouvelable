# Déploiement Render du moteur scientifique — audit et procédure 1.0

Date : 22 octobre 2026. Référentiel : PROMPT 16 « Audit de déploiement Render et validation de l'intégration hébergée ».

## Architecture et chemins de communication

Navigateur → fonctions serveur TanStack (`src/lib/engine.functions.ts`, authentification utilisateur obligatoire) → transport serveur `src/lib/engine-http.server.ts` (en-tête `X-Engine-Key` + jeton utilisateur relayé, jamais côté navigateur) → service FastAPI sur Render (`python-engine/`, préfixe `/api/v1`). Le moteur vérifie la clé partagée (comparaison `hmac`) puis l'identité de l'utilisateur auprès du service d'authentification du backend. La persistance des simulations et résultats reste dans la base applicative, pas dans le moteur.

## Paramètres Render selon le dépôt (`render.yaml`)

| Paramètre | Valeur déclarée |
|---|---|
| Type | `web`, runtime `python` |
| rootDir | `python-engine` |
| Build | `pip install -r requirements.txt` |
| Démarrage | `uvicorn app.main:app --host 0.0.0.0 --port $PORT --proxy-headers --timeout-keep-alive 30` |
| Santé | `GET /api/v1/health` |
| PYTHON_VERSION | `3.12.7` (wheel PySAM Linux CPython 3.12 vérifié) |
| ENGINE_ENV | `production` |
| CORS_ORIGINS | `https://energie-renouvelable.lovable.app` |
| MAX_BODY_BYTES | `3000000` |

Cohérence vérifiée : le `rootDir`, la commande de démarrage, le module `app.main:app`, les routes `/api/v1/health` et `/api/v1/capabilities` et la version Python correspondent au code réel.

## Variables d'environnement (noms uniquement)

| Variable | Où | Rôle |
|---|---|---|
| `ENGINE_SHARED_KEY` | Render | Clé partagée serveur-à-serveur ; absente → échec fermé 503, jamais d'authentification désactivée |
| `SUPABASE_URL` | Render (`sync:false`) | Vérification des jetons utilisateurs |
| `SUPABASE_PUBLISHABLE_KEY` | Render (`sync:false`) | Clé publique du backend d'authentification |
| `SCIENTIFIC_ENGINE_URL` | Secrets de l'application | Adresse du service Render |
| `SCIENTIFIC_ENGINE_KEY` | Secrets de l'application | Même valeur que `ENGINE_SHARED_KEY` |

`render.yaml` déclare `ENGINE_SHARED_KEY` avec `generateValue: true` : la valeur générée par Render à la création n'est pas connue de l'application ; les deux côtés doivent partager la même valeur.

## Preuves obtenues le 22/10/2026 (service hébergé réel)

- `GET /api/v1/health` → HTTP 200 : `status ok`, `environment production`, **`auth_configured: false`**.
- `GET /api/v1/capabilities` → HTTP 200 : moteurs photovoltaic 1.0.1, csp 1.0.0, wind, biomass, battery listés comme disponibles.
- `POST /api/v1/simulations/validate` sans clé → HTTP 503 `engine_unavailable`.
- Même requête avec clé invalide → HTTP 503 `engine_unavailable`.
- Même requête avec la clé de l'application → HTTP 503 `engine_unavailable` (la clé n'est pas configurée côté service : échec fermé correct).

Conclusion : le service est joignable et déployé, mais le moteur n'est pas opérationnel tant que ses variables ne sont pas renseignées. Aucun secret n'apparaît dans les réponses.

## Procédure manuelle restante (non exécutée par l'agent)

### A. Configuration Render
1. Ouvrir le service `energie-renouvelable-engine` dans Render.
2. Vérifier dépôt, branche, `rootDir: python-engine`, commandes de build et de démarrage (ci-dessus).
3. Environment → ajouter `ENGINE_SHARED_KEY` avec exactement la valeur du secret applicatif (formulaire sécurisé proposé dans le chat : générer, copier, coller dans Render).
4. Ajouter `SUPABASE_URL` et `SUPABASE_PUBLISHABLE_KEY` (valeurs publiques du backend, visibles dans les paramètres du projet).
5. Save Changes → le service redéploie.

### B. Disponibilité
1. `GET /api/v1/health` → attendre `auth_configured: true`.
2. `GET /api/v1/capabilities` → moteurs listés, sans donnée sensible.

### C. Authentification (sans divulguer la clé)
1. Sans en-tête → rejet. 2. Clé invalide → rejet. 3. Clé valide sans jeton → rejet. 4. Clé valide + jeton utilisateur valide → validation atteinte. 5. Résultat d'un autre compte → rejet (nécessite deux comptes QA autorisés).

### D. Bout en bout
Site QA → météo validée → calcul éolien → sauvegarde → relecture ; puis PV terminé → batterie (configuration QA validée + demande QA validée, horodatages alignés) ; biomasse bloquée tant qu'aucune fiche validée n'existe. Ne rien fabriquer pour débloquer.

### E. Isolation entre comptes
Deux comptes QA autorisés, deux jeux de données ; vérifier qu'aucun ne lit ni ne modifie les simulations, configurations, résultats ou fichiers de l'autre. Non exécuté : un seul compte disponible.

## Symptômes courants et diagnostic

| Symptôme | Cause probable | Action |
|---|---|---|
| `auth_configured: false` | Variable Render manquante | Étape A.3/A.4 puis redéploiement |
| 503 `engine_unavailable` sur calcul | Clé absente ou différente entre app et Render | Aligner les deux valeurs |
| 401 `unauthorized` | Jeton utilisateur expiré | Reconnexion utilisateur |
| Build Render échoue sur PySAM | Python ≠ 3.12.x | Vérifier `PYTHON_VERSION=3.12.7` |
| Démarrage long après inactivité | Plan free | Plan starter déjà déclaré |

## Tableau de statut

| Contrôle | Résultat | Preuve | Blocage ou action requise |
|---|---|---|---|
| Cohérence render.yaml ↔ code | RÉUSSI | Lecture des fichiers, 22/10/2026 | — |
| Version Python 3.12.7 épinglée | RÉUSSI | `.python-version` ×2 + render.yaml + test de cohérence | — |
| Service hébergé joignable | RÉUSSI | health 200, environment production | — |
| Moteurs chargés côté service | RÉUSSI | capabilities 200, 5 moteurs listés | — |
| Authentification du service configurée | ÉCHEC | `auth_configured: false` | Renseigner `ENGINE_SHARED_KEY`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` dans Render |
| Rejet sans clé / clé invalide / sans jeton | RÉUSSI | 3 × 503 `engine_unavailable` (échec fermé) | — |
| Clé absente du navigateur et du dépôt | RÉUSSI | Audit statique des imports, transport serveur uniquement | — |
| Tests Python | RÉUSSI | 225 réussis, 0 échoué (`pytest`) | — |
| Tests TypeScript | RÉUSSI | 317 réussis, 0 échoué (`vitest run`) | — |
| Contrôle des types | RÉUSSI | `tsgo --noEmit` propre | — |
| Build de production | RÉUSSI | build OK (journal 09:40 UTC) | — |
| Lint | ÉCHEC | 6 720 erreurs de formatage Prettier préexistantes, 129 `no-explicit-any`, 3 fausses alertes hooks TanStack | Nettoyage de formatage à planifier ; aucun impact déploiement démontré |
| Calcul autorisé de bout en bout hébergé | BLOQUÉ | — | Authentification du service non configurée |
| Persistance réelle calcul → base → relecture | BLOQUÉ | — | Idem + aucun PV terminé |
| Isolation réelle entre deux comptes | BLOQUÉ | — | Deux comptes QA autorisés requis |
| Bilan primaire biomasse hébergé | BLOQUÉ | — | Aucune fiche biomasse validée |

## Risques avant mise en production

Authentification du service non configurée ; aucun calcul hébergé vérifié ; isolation entre comptes non démontrée ; formatage lint à assainir ; plan Render et mise en veille à surveiller.
