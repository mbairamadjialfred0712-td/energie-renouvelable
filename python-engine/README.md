# Moteur scientifique — Énergie Renouvelable (API v1)

Service FastAPI indépendant. **Code implémenté : photovoltaïque horaire (PVWatts v8 via NREL PySAM) et batterie (réservoir + rendements, existant conservé).**
Les autres moteurs restent `not_implemented` (`POST /simulations` → `503 engine_unavailable`). Code implémenté ≠ service déployé ≠ validation scientifique.
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
- Persistance : réalisée par le serveur Lovable sous RLS. Identité de la simulation, moteur, schéma et sorties PV complètes sont vérifiés avant enregistrement. Aucun succès confirmé tant que l'écriture du statut final n'a pas réussi. Une simulation non terminée ne fournit pas de résultats à l'interface.
- Les routes GET de résultats Python utilisent actuellement `NoRepository` et retournent introuvable ; la consultation réelle passe par Lovable et ses résultats enregistrés, pas par ces routes Python.

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
pip install -r requirements-dev.txt
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
- Déployer et valider scientifiquement le PV existant ; ne pas déclarer les autres moteurs disponibles sans preuve.
- Mode asynchrone pour calculs longs et persistance transactionnelle à envisager : aujourd'hui écritures contrôlées et compensation, pas de transaction globale.
- Limitation de débit (proxy ou middleware), supervision, tests de bout en bout après déploiement.

## Checklist de mise en service PV (audit du 17/10/2026)
1. Obtenir la décision scientifique de Joël selon `docs/VALIDATION_PV.md` (sources, paramètres, référence et écarts admissibles).
2. Déployer le Blueprint Render existant (plan Starter payant prévu ; ne pas engager de coût sans accord). Vérifier le build sur Python 3.12.7 : les tests de cet audit sont exécutés sur Python 3.13, pas sur Render.
3. Vérifier les variables Render : `ENGINE_SHARED_KEY`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `ENGINE_ENV`, `MAX_BODY_BYTES`. Ne jamais copier clés ou jetons dans le dépôt, la conversation ou les journaux.
4. Saisir dans les paramètres sécurisés Lovable l'URL HTTPS réelle `SCIENTIFIC_ENGINE_URL` et la même clé `SCIENTIFIC_ENGINE_KEY`. Elles sont absentes lors de cet audit. Le serveur refuse les redirections HTTP pour ne pas transmettre les credentials à une autre destination.
5. Lire `/api/v1/health` (`auth_configured: true`) et `/api/v1/capabilities` (`photovoltaic: available`, version 1.0.1). Ces lectures prouvent la joignabilité, pas l'autorisation d'un calcul ni la validation scientifique.
6. Faire un calcul réel depuis Lovable avec un compte ingénieur autorisé et un CSV sourcé (année civile, W/m², °C, m/s, début d'heure locale standard ; convention bissextile explicite si nécessaire). Relire entrées/hypothèses, résultats horaires, jours, mois, année, version et date dans la base.
7. Vérifier clé absente/incorrecte, token expiré, rôle refusé côté Lovable, unités erronées, trous, timeout, JSON invalide et corps > 3 Mo (y compris chunked). Aucun résultat de succès ne doit survivre à un échec.
8. Activer supervision, alertes et limitation de débit. La clé partagée et l'identité authentifient le transport Python ; les rôles et l'accès projet sont vérifiés par Lovable. Ne pas considérer le service comme opérationnel avant ces preuves.

Reproductibilité : PySAM et pvlib sont épinglés ; les autres dépendances conservent les plages existantes. Archiver `pip freeze`, OS, Python, schéma et version SSC lors de chaque déploiement ; le blueprint seul ne garantit pas un environnement identique. Aucun fichier de verrouillage de versions transitoires n'est imposé par cet audit.
