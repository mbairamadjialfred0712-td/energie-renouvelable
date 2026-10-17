# Moteur éolien — audit et conception PROMPT 11

Date : 17 octobre 2026. Audit TERMINÉ ; conventions V1 approuvées par Joël dans cette conversation ; moteur wind 1.0.0 enregistré et implémenté. Validation physique À VALIDER PAR L’INGÉNIEUR ; intégration hébergée BLOQUÉE. Les sections d’audit ci-dessous décrivent l’état avant développement ; le bilan final figure en section 7.

## 1. Existant inspecté et réutilisable

- `app/engines/registry.py` : PV conditionnel à PySAM, batterie et CSP implémentés ; wind `not_implemented`. Disponibilité du code n’est ni déploiement ni validation scientifique.
- `app/api/schemas/contract.py`, `app/api/routes/v1.py`, `app/core/security.py`, `app/repositories/simulations.py`, `app/services/validation.py` : enveloppe v1 commune, validation et calcul authentifiés par clé serveur + jeton utilisateur vérifié. `NoRepository` ne fournit pas de consultation persistante Python.
- `src/features/engine/engine-contract.ts`, `src/lib/engine.functions.ts` et transport serveur : capacités, contrôles de rôle admin/engineer et accès aux entités via le client utilisateur, persistance privilégiée seulement après ces contrôles ; vérification des sorties avant insertion, échec explicite et compensation si finalisation impossible. La consultation réelle appartient à Lovable, pas aux routes GET Python.
- `src/lib/wind.functions.ts`, `src/features/resources/wind/wind-model.ts`, `wind-form.tsx`, routes ressources éoliennes et migration `0009_wind_dataset_traceability.sql` : catalogue descriptif conservé.
- `src/features/weather/weather-model.ts` et météo par site : observations horaires UTC, hauteur du vent, statut et provenance. Utilisables sans inventer d’axe horaire.
- Formulaire Simulations : PV, batterie, CSP existants ; aucun onglet de calcul éolien.

## 2. Schéma réel, champs présents et absents

Lecture réelle de `information_schema.columns` effectuée. `wind_resources` contient identifiants/propriétaire/ressource/site, moyenne et maximum m/s, hauteur m, direction degrés, densité kg/m³, facteur de capacité et méthode, dates de période, nature, statut, méthode d’acquisition, collecte, séries et distribution JSONB. Source, référence et qualité appartiennent à `energy_resources`, lié à la localité ; site dans `study_sites`. Projet lié à la localité, pas de liaison dédiée projet–courbe.

Série catalogue : `{date, speed_ms, direction_deg}` ; classes : `{min_ms, max_ms, frequency_pct}`. Le parseur accepte un préfixe date mais ne garantit pas fuseau, cadence, durée représentée, ordre ou complétude. Ne pas transformer ces observations en heures ni fabriquer des valeurs intermédiaires.

Absents : courbe de turbine documentée, référence/version de turbine, rotor, moyeu, densité de référence de courbe, exposant d’extrapolation et justification, convention de moyenne temporelle et incertitude spécifiques au vent. La vitesse catalogue a une unité fixée m/s : aucun champ d’unité libre à convertir silencieusement. La densité est facultative, sans méthode de calcul dédiée. La météo horaire ne contient pas de direction ni pression pour un calcul thermodynamique documenté de densité.

## 3. Niveaux et conventions V1 désormais implémentés

**A — Ressource** : statistiques arithmétiques des observations réelles, minimum/maximum, classes de vitesses et directions seulement lorsqu’elles existent ; effectif, période, pas et couverture explicités. Un nombre limité de mesures n’établit pas une représentativité annuelle. Aucune Weibull ajustée par défaut.

**B — Flux cinétique** : `P = 0.5 × rho × A × v³` en W ; rho en kg/m³, A en m², v en m/s. Densité et surface positives, sourcées ou hypothèses déclarées. Retourner la moyenne des puissances calculées, non le cube de la vitesse moyenne. Ce flux n’est pas une puissance électrique.

**C — Turbine** : série électrique estimée exclusivement issue d’une courbe fournie et documentée. Référence, source/version, puissance nominale, moyeu/rotor, hauteur des observations, densité de référence et conditions de courbe obligatoires. Sans courbe valide : énergie électrique indisponible avec motif ; A/B restent distincts.

Conventions V1 proposées puis validées par Joël :

1. Énergie sur séries horaires UTC continues uniquement, confirmées comme moyennes représentatives d’une heure. `E_kWh = somme(P_W × 1 h / 1000)`. Cette approximation ne reconstitue pas la variabilité sous-horaire ni la moyenne exacte de P(v).
2. Interpolation linéaire entre points documentés, vitesses strictement croissantes, puissances finies et bornées par la puissance nominale. Exiger une définition explicite de la zone de fonctionnement et de l’arrêt ; ne pas imposer une monotonie globale incompatible avec une chute à l’arrêt. Aucune extrapolation hors domaine documenté ; refus de C si domaine insuffisant.
3. Pas d’extrapolation en hauteur ni correction de densité dans la première version. Refuser C si hauteur moyeu et mesure différentes, ou conditions de densité non compatibles avec celles documentées de la courbe. Aucun alpha ni rho standard par défaut.
4. Aucune perte ni disponibilité supposée. Si proposées ultérieurement, hypothèses séparées, sourcées, formule/version à approuver. Pas de modèle de sillage.
5. Agrégats uniquement sur jours/mois/années entièrement couverts ; pas d’annualisation. 8 760 heures ou 8 784 pour une année bissextile entière ne prouvent pas à elles seules la représentativité climatologique. Celle-ci reste une appréciation documentée de l’ingénieur.

La loi `v(h)=v(h_ref)×(h/h_ref)^alpha` donnée par Joël reste une extension possible, non implémentée et sans exposant choisi. Incertitude et justification nécessaires avant activation.

## 4. Intégration proposée sans doublons

Réutiliser `/api/v1/health`, `/capabilities`, `/simulations/validate` et `/simulations`. Aucun endpoint supplémentaire. Nouvelle branche wind indépendante dans registre et contrôles de contrat ; garder l’enveloppe v1 et les moteurs PV/CSP inchangés. Courbe et paramètres dans le snapshot de requête existant plutôt qu’une nouvelle table non nécessaire.

Ajouter le choix éolien à Simulations après accord des conventions. Sélection site/jeu horaire validé avec préparation serveur depuis les données autorisées et provenance figée, sans confiance accordée à une série forgée dans le navigateur. Conserver les statistiques descriptives du catalogue séparées des résultats du moteur. Contrôles stricts des sorties et de leur intégration avant persistance existante. Production annuelle par facteur de capacité existante dans les projets conservée comme estimation distincte, jamais utilisée à la place de A/B/C.

## 5. Tests et disponibilité réellement établis

- Avant implémentation : `/tmp/pv-audit-venv/bin/python -m pytest tests -q` depuis `python-engine` : **116 réussis, 1 avertissement de dépréciation Starlette/httpx**.
- `bunx vitest run` : **175 réussis, 14 fichiers**.
- **0 nouveau test de moteur éolien**, moteur non implémenté. Une première tentative avec Python système a échoué faute de pytest ; utilisation ensuite de l’environnement existant, sans modifier les dépendances.
- Lecture réelle du catalogue : **24 fiches éoliennes, 0 validée, 0 avec série enregistrée**. Aucun enregistrement n’a été modifié. Ce compte global ne constitue pas une liste de jeux accessibles au compte testé.
- Navigateur connecté dans Simulations : service explicitement non configuré, lancement CSP désactivé, 0 erreur navigateur, 0 jeu météo validé proposé au compte testé. Vérification du service commun existant, pas d’un formulaire éolien encore absent. Vérification automatique : build OK.
- Configuration URL/clé absente de l’environnement observé et service signalé non configuré dans l’interface ; cela ne suffit pas à certifier l’état de Render. Aucun calcul éolien hébergé, aucune persistance réelle de résultat éolien, aucun test de nouveaux rôles éoliens : NON TESTÉ.

Tests à ajouter après accord : conversions explicites m/s, km/h, nœuds si retenus ; valeurs négatives/manquantes/non finies/booléennes et unités invalides ; hauteur/densité/surface ; refus d’extrapolation non justifiée ; courbe manquante/dupliquée/domaine/monotonie par segment ; timestamps UTC/ordre/doublons/pas ; couverture incomplète ; résultats et intégrales cohérents ; auth, autorisations, panne de service/sauvegarde sans faux succès. Cas purement arithmétiques identifiés comme tels, aucun résultat de référence de turbine réelle inventé.

## 6. Validation et prochaines preuves

À VALIDER PAR L’INGÉNIEUR : conventions horaires, interpolation/domaine, compatibilité hauteur/densité, politique de pertes, classes de distribution, critères de représentativité et références techniques/tolérances. Tolérance flottante d’intégrité distincte d’un critère d’acceptation physique.

BLOQUÉ : service hébergé et données réelles validées restent à fournir/vérifier ; ne pas annoncer d’intégration opérationnelle. Les conventions sont approuvées, pas les performances physiques d’une turbine réelle.

Prochaine action : fournir une série horaire réelle validée et une courbe documentée compatible avec la hauteur/densité ; déployer le service puis vérifier le parcours Lovable → calcul → sauvegarde → consultation. Pas d’optimisation, stockage, économie ou dimensionnement automatique.

## 7. Bilan de construction après accord de Joël

### Code et interface — TERMINÉ

Créés : `app/engines/wind/__init__.py`, `app/engines/wind/engine.py`, `tests/test_wind_engine.py` ; `src/features/engine/wind-contract.ts`, `wind-contract.test.ts`, `wind-simulation-form.tsx`, `wind-results.tsx` ; `src/lib/wind-source.server.ts`, `wind-source.test.ts` ; ce dossier de validation.

Modifiés : registre et contrat Python (garde wind seule avant coercition), tests communs et uniquement attente de capacités dans le test PV ; contrat de réponse/ fonctions serveur communs ; routes nouvelle simulation/résultats et lien depuis fiche vent ; `AGENTS.md`, feuille de route. Aucune table, migration, nouvelle route HTTP, politique RLS, donnée ou moteur PV/CSP modifié.

- A : moyenne arithmétique/minimum/maximum, distribution empirique des valeurs effectivement observées (pas Weibull), directions par secteurs 45° si série directionnelle fournie à l’API, hauteur, période, couverture. L’interface utilise la météo existante sans directions ; celles-ci restent indisponibles, pas inventées.
- B : flux et énergie cinétiques distincts de l’électricité, moyenne des puissances et non cube de la vitesse moyenne.
- C : interpolation linéaire de points fournis, domaine strict ; arrêt/démarrage appliqués uniquement s’ils sont explicitement renseignés et cohérents avec la courbe. Monotonie uniquement sur la branche de montée lorsqu’une vitesse nominale est documentée. Production brute, aucune perte supposée ni production nette annoncée.
- Courbe, référence, conditions, paramètres, natures et sources dans le snapshot existant ; observations/hauteur/période reconstruits serveur depuis météo validée, accès site/projet/localité contrôlé. Série navigateur interdite pour le lancement éolien.
- Jour/mois uniquement complets ; année complète 8 760/8 784 h sans annualisation, représentativité climatologique toujours non établie.
- Conversion Python explicite m/s, km/h, kn (nœud = 1 852 m/h) ; interface sélection météo native m/s. Refus d’alpha, correction densité, pertes ou champs libres non implémentés.
- Réponses : identité/version/statut communs, niveau/unités/heures et observations retournées vérifiés, intégrales puissance/énergie et facteur de capacité vérifiés ; raisons d’indisponibilité obligatoires, aucun flux assimilé à l’électricité. Tolérance 1e-9 d’intégrité flottante, pas tolérance d’acceptation scientifique.

### Cas de vérification arithmétiques, pas de turbine réelle

Vent 5 et 10 m/s : moyenne 7,5 ; avec rho=1,2 et A=100, flux 7 500 et 60 000 W, énergie sur 2 h 67,5 kWh, moyenne puissance 33 750 W. Courbe manufacturée exclusivement pour test : (0,0),(5,500),(10,1000) en m/s/W ; 2,5 et 7,5 m/s → 250 et 750 W → 1 kWh sur 2 h, facteur de capacité 50 % avec nominal 1 000 W. Aucun de ces chiffres n’est une recommandation ou une référence constructeur.

### Vérifications et limites

Tests finaux : **165 Python réussis** (116 existants + 49 nouveaux cas éoliens), 1 avertissement Starlette/httpx ; **204 TypeScript réussis, 16 fichiers** (175 existants + 29 nouveaux : 21 contrat/réponse/sélection, 8 préparation serveur). Commandes : `/tmp/pv-audit-venv/bin/python -m pytest tests -q` depuis `python-engine`, `bunx vitest run` depuis la racine. Tests de capacités existants mis à jour pour wind désormais disponible ; aucune assertion scientifique PV/CSP relâchée. Vérification automatique : build OK.

Service local Uvicorn réellement démarré : health → validation → calcul C avec identité utilisateur vérifiée par Lovable Cloud réussi ; sans authentification, refus et aucune sortie de succès. Cas arithmétique uniquement, aucune sauvegarde en base ; ce n’est pas Render ni l’intégration hébergée Lovable–Python.

Interface connectée : A/B/C visibles, vérification d’entrées incomplètes affiche un refus, calcul désactivé sans service et sans jeu validé, 0 erreur navigateur. Aucun résultat ou jeu météo fictif sauvegardé.

Persistance réussie hébergée, injection réelle d’échecs de sauvegarde/finalisation, rôles différents en base sur un lancement éolien : NON TESTÉ. La préparation serveur est testée avec doublures d’accès, pas présentée comme un test réel RLS. Transport existant et contrôles communs conservés.

Questions restant à Joël : référence constructeur et conditions exactes de courbe, représentativité de la période, critères de qualité, mesures de hauteur/densité compatibles, variabilité sous-horaire et cas physiques avec tolérances. L’approbation de V1 ne constitue pas validation de ces données.

## 8. Audit final de cohérence — PROMPT 11.1

### Défauts démontrés et corrections — TERMINÉ

- Diamètre facultatif reçu en B précédemment ignoré : A = pi × (D/2)² utilisé si fourni ; surface explicite toujours obligatoire, incohérence refusée (tolérance arithmétique relative 1e-9). Pas de dimensionnement ajouté.
- Démarrage documenté égal à 0 m/s précédemment refusé : accepté sans inventer de seuil ; autres paramètres physiques strictement positifs.
- Somme de grandes valeurs finies pouvait lever OverflowError non traité : erreur contrôlée sans résultat ; interpolation pondérée évitant un produit intermédiaire inutilement élevé.
- Réponses auto-cohérentes mais étrangères aux observations/paramètres pouvaient passer : statistiques, flux B, interpolation C, moyenne cinétique, domaine, durées et ensemble des séries contrôlés avant sauvegarde ; énergie annuelle égale à celle de la période complète.
- Courbe et turbine pouvaient citer des documents différents : source commune exigée pour référence turbine/conditions/points. Authenticité du document toujours à vérifier humainement, explicitement affichée ; aucune table documentaire créée.
- Lectures simulation/paramètres pouvaient ignorer une erreur et retourner une série sans horodatages : erreurs explicites, longueurs et fuseau requis ; logique extraite dans `src/lib/engine-access.server.ts`, importée dans les handlers authentifiés, testée avec doublures.
- Résultats turbine explicitement « estimés », jamais présentés comme mesures ; observations avec nature/source, flux B non électrique.

### Temps et limites — TERMINÉ pour le code

Chaque timestamp est le début d’une heure UTC moyenne confirmée ; fin exclusive = dernier timestamp + 1 h. Pas irréguliers/incomplets, doublons, trous, désordre ou vent manquant refusés. W × h / 1000 = kWh ; aucune conversion kW/Wh implicite. Année civile complète uniquement, sinon énergie annuelle indisponible. Une année complète ne prouve pas sa représentativité climatologique.

Seuils démarrage/nominal/arrêt facultatifs lorsqu’ils ne sont pas documentés, conformément au périmètre approuvé : aucune invention, interpolation uniquement dans le domaine fourni, refus hors domaine même après arrêt. Si arrêt documenté : cohérence des points et test de frontière ; pas de pertes appliquées, production brute uniquement.

### Intégration — PARTIEL

Authentification conservée, rôle admin/engineer contrôlé avant écritures privilégiées, site/projet/localité via client utilisateur. Refus analyst/viewer et échec de lecture des rôles testés avec doublures, pas preuve RLS hébergée. Transport : panne, délai, authentification/contrat invalides refusés, sans faux succès. Erreur d’insertion : statut failed ; erreur de finalisation : compensation puis failed ; erreur de sauvegarde du statut : exception, jamais succès. Injection réelle de panne de sauvegarde/compensation : NON TESTÉ ; lecture des résultats uniquement pour completed.

Navigateur connecté : A/B/C, refus d’entrées incomplètes, lancement désactivé, 0 jeu météo validé accessible, 0 erreur navigateur ; aucune donnée fictive en base. URL/clé serveur absentes de l’environnement observé : blocage dans l’aperçu, pas preuve de l’état réel de Render (NON TESTÉ). Parcours hébergé calcul/sauvegarde/consultation BLOQUÉ.

### Premier calcul réel et validation humaine

Jeu météo importé/validé : heures UTC continues, vent en m/s non manquant, hauteur/source/nature/qualité/période explicites, moyennes horaires confirmées ; site et projet accessibles avec localité cohérente. B : densité kg/m³ et surface m² justifiées. C : turbine, rotor/moyeu, puissance nominale W, courbe source/version/conditions et domaine couvrant toutes les observations, hauteur et densité compatibles sans correction. Service déployé/configuré et authentifié. Joël : authenticité/compatibilité de courbe, qualité/représentativité et cas physiques avec tolérances À VALIDER PAR L’INGÉNIEUR ; conventions V1 déjà approuvées.

### Tests réellement exécutés — TERMINÉ

- Python : `/tmp/pv-audit-venv/bin/python -m pytest tests -q` depuis python-engine : **172 réussis**, 1 avertissement Starlette/httpx ; 165 précédents réexécutés + 7 nouveaux (géométrie, incohérence surface, sources, seuil zéro, overflow, demi-heure, arrêt).
- TypeScript : `bunx vitest run` : **222 réussis / 17 fichiers** ; 204 précédents réexécutés + 18 nouveaux (12 contrat/réponse, 6 accès/lectures). Aucun test de copie/styling, aucun modèle PV/CSP modifié.
- Service local réellement lancé : identité réelle authentifiée, health → validation → calcul C réussis ; appel anonyme refusé. Cas arithmétique fabriqué exclusivement pour test, jamais sauvegardé ; pas Render ni parcours Lovable hébergé.
- Formulaire connecté vérifié dans le navigateur et capture examinée : état indisponible, erreurs et courbe déclarée explicites, lancement désactivé. Vérification automatique build OK.
- Sauvegarde éolienne réelle hébergée, panne de finalisation/compensation et différents rôles en base : NON TESTÉ ; données réelles et service requis, aucune preuve opérationnelle inventée.