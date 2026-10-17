# Moteur éolien — audit et conception PROMPT 11

Date : 17 octobre 2026. Statut : audit TERMINÉ ; moteur NON IMPLÉMENTÉ ; conventions proposées À VALIDER PAR L’INGÉNIEUR. Version envisagée : wind 1.0.0, non enregistrée au registre.

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

## 3. Proposition de niveaux (pas encore implémentés)

**A — Ressource** : statistiques arithmétiques des observations réelles, minimum/maximum, classes de vitesses et directions seulement lorsqu’elles existent ; effectif, période, pas et couverture explicités. Un nombre limité de mesures n’établit pas une représentativité annuelle. Aucune Weibull ajustée par défaut.

**B — Flux cinétique** : `P = 0.5 × rho × A × v³` en W ; rho en kg/m³, A en m², v en m/s. Densité et surface positives, sourcées ou hypothèses déclarées. Retourner la moyenne des puissances calculées, non le cube de la vitesse moyenne. Ce flux n’est pas une puissance électrique.

**C — Turbine** : série électrique estimée exclusivement issue d’une courbe fournie et documentée. Référence, source/version, puissance nominale, moyeu/rotor, hauteur des observations, densité de référence et conditions de courbe obligatoires. Sans courbe valide : énergie électrique indisponible avec motif ; A/B restent distincts.

Conventions V1 proposées à Joël :

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

BLOQUÉ : validation de ces conventions avant développement du modèle C. Service hébergé et données réelles restent à vérifier ; ne pas annoncer d’intégration opérationnelle.

Prochaine action : accord de Joël sur la V1 conservatrice, puis implémentation séparée A/B/C avec tests de non-régression, contrôles d’interface et dossier de validation mis à jour. Pas d’optimisation, stockage, économie ou dimensionnement automatique.