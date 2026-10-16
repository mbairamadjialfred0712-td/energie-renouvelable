# Moteur scientifique — Énergie Renouvelable (API v1)

Service FastAPI indépendant. **Aucun moteur scientifique n'est implémenté à cette étape** : `/capabilities`
déclare tous les moteurs `not_implemented` et `POST /simulations` répond `503 engine_unavailable`.

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

## Déploiement (hébergement externe requis : Render, Fly.io, Railway, Cloud Run…)
1. Déployer ce dossier en HTTPS (`uvicorn app.main:app --host 0.0.0.0 --port $PORT`).
2. Variables : `ENGINE_SHARED_KEY`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `CORS_ORIGINS`, `ENGINE_ENV=production`.
3. Dans Lovable, ajouter les secrets serveur `SCIENTIFIC_ENGINE_URL` et `SCIENTIFIC_ENGINE_KEY` (= `ENGINE_SHARED_KEY`).
4. Vérifier la page Simulations : l'état passe de « non configuré » à « connecté ».

## Ajouter un moteur
Créer `app/engines/<nom>.py` (protocole `Engine` : `name`, `version`, `required_inputs` avec unités acceptées, `run`),
l'enregistrer dans `IMPLEMENTED`, ajouter ses tests de formules avec références, puis le valider par l'ingénieur.

## Restant avant production
- Implémenter et valider chaque moteur (PV, CSP, éolien, biomasse, batterie, hybride, optimisation, finance).
- Persistance des résultats dans `simulation_results` via le serveur Lovable, mode asynchrone pour calculs longs.
- Limitation de débit (proxy ou middleware), supervision, tests de bout en bout après déploiement.
