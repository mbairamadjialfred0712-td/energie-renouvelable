# Moteur scientifique — Énergie Renouvelable (API v1)

Service FastAPI indépendant. **Moteur implémenté : photovoltaïque horaire (PVWatts v8 via NREL PySAM).**
Tous les autres moteurs restent `not_implemented` (`POST /simulations` → `503 engine_unavailable`).
Dossier de validation scientifique : `docs/VALIDATION_PV.md`.

## Architecture
```text
Navigateur ──> Serveur Lovable (src/lib/engine.functions.ts, session vérifiée)
                 │  X-Engine-Key (secret serveur) + Authorization: Bearer <jeton utilisateur>
                 v
           FastAPI /api/v1  ──> validation Pydantic ──> app/engines/* (modules séparés)
                 │ vérifie le jeton via <SUPABASE_URL>/auth/v1/user
           PostgreSQL reste la référence (tables simulations, simulation_technologies, simulation_results)
```
- Le navigateur n'appelle jamais FastAPI directement ; aucune clé dans le frontend.
- `requested_by` est dérivé du jeton vérifié, jamais du corps JSON (champ refusé : `extra=forbid`).
- Persistance : réalisée par le serveur Lovable sous RLS, après un résultat `completed` (non branché tant qu'aucun moteur n'existe).

## Endpoints
| Méthode | Chemin | Auth | Rôle |
|---|---|---|---|
| GET | /api/v1/health | non | état du service |
| GET | /api/v1/capabilities | non | moteurs réellement disponibles |
| POST | /api/v1/simulations/validate | oui | structure, unités, valeurs manquantes |
| POST | /api/v1/simulations | oui | exécution (moteurs implémentés seulement) |
| GET | /api/v1/simulations/{id} | oui | consultation |
| GET | /api/v1/simulations/{id}/results | oui | résultats + provenance |

Documentation OpenAPI : `/api/v1/docs`. Erreurs uniformes : `{"error":{"code","message","details"}}` avec codes
`invalid_input, incompatible_units, missing_parameter, engine_unavailable, engine_version_incompatible,
simulation_not_found, unauthorized, forbidden, payload_too_large, timeout, internal_error`.

Natures de données : `measured, external, estimate, assumption, calculated` (cette dernière réservée aux sorties).
Une valeur absente n'est jamais remplacée par zéro ; une valeur numérique sans unité est rejetée ; aucune conversion implicite.

## Développement
```bash
cd python-engine
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # renseigner les valeurs
uvicorn app.main:app --reload --port 8000
pytest -q
```

## Déploiement sur Render (blueprint `render.yaml` à la racine du dépôt)
1. Connecter le dépôt GitHub du projet à Render → *New* → *Blueprint* → sélectionner `render.yaml`.
2. Render génère `ENGINE_SHARED_KEY`. Saisir `SUPABASE_URL` et `SUPABASE_PUBLISHABLE_KEY` (valeurs publiques du backend).
3. Attendre le build, puis ouvrir `https://<service>.onrender.com/api/v1/health` : `status: ok`, `auth_configured: true`.
4. Vérifier `/api/v1/capabilities` : `photovoltaic` = `available`.
5. Dans Lovable, saisir via le formulaire sécurisé les secrets serveur `SCIENTIFIC_ENGINE_URL` (URL https Render) et
   `SCIENTIFIC_ENGINE_KEY` (copie de `ENGINE_SHARED_KEY`). Ne jamais les coller dans la conversation.
6. Page Simulations : l'état passe à « connecté » ; lancer une simulation PV avec un CSV réel.

Plan gratuit : le service s'endort après ~15 min d'inactivité (premier appel ≈ 1 min, l'application attend 60 s),
disque éphémère (aucune donnée stockée côté moteur, tout est dans PostgreSQL). Non adapté à une production continue :
utiliser au minimum le plan *Starter*.

## Ajouter un moteur
Créer `app/engines/<nom>.py` (protocole `Engine` : `name`, `version`, `required_inputs` avec unités acceptées, `run`),
l'enregistrer dans `IMPLEMENTED`, ajouter ses tests de formules avec références, puis le valider par l'ingénieur.

## Restant avant production
- Implémenter et valider chaque moteur (PV, CSP, éolien, biomasse, batterie, hybride, optimisation, finance).
- Persistance des résultats dans `simulation_results` via le serveur Lovable, mode asynchrone pour calculs longs.
- Limitation de débit (proxy ou middleware), supervision, tests de bout en bout après déploiement.
