# Révision générale du moteur scientifique — audit initial

Date : 3 novembre 2026. Référentiel : demande « Audit général et finalisation du moteur ». Étape d’audit uniquement ; aucune formule, interface, API, donnée, permission, clé ou configuration Render modifiée.

## 1. Conclusion

Le projet dispose de cinq moteurs Python, mais pas de cinq modèles physiques complets et validés. Le PV et le stockage PV+batterie ont des résultats QA persistés ; le résultat éolien enregistré est de niveau A, pas une production électrique. Biomasse et CSP ont des périmètres volontairement limités. Le moteur hybride général, le dimensionnement optimisé et la comparaison économique persistée ne sont pas finalisés.

« Implémentée et testée » ci-dessous signifie code exécuté par les tests du périmètre décrit, **pas validation scientifique, aptitude à un site réel ou qualification de production**. Une capacité déclarée par l’API n’est jamais la preuve d’un calcul réussi.

## 2. Inventaire demandé A–H

| Fonction | Statut réel | Disponible et limites |
|---|---|---|
| PV horaire, journalier, mensuel, annuel | Implémentée et testée | PVWatts v8 via NREL PySAM ; 8 760 heures calendaires, convention explicite pour année bissextile. Agrégations issues des sorties horaires, pas un second modèle. |
| Paramètres PV, orientation, météo, pertes, onduleur | Partiellement implémentée | Puissance, catégories de module/montage, inclinaison, azimut, pertes, ratio DC/AC, rendement onduleur, GCR, météo. Pas de modèle panneau/onduleur spécifique fabricant, ni diagnostic détaillé de clipping. |
| Affichage PV de toutes les échelles temporelles | Partiellement implémentée | Indicateurs annuels et graphique mensuel présents ; séries horaires/journalières produites et conservées, mais pas de vue PV dédiée pour les explorer. |
| Éolien A/B/C | Implémentée et testée dans ses limites | A observations ; B flux cinétique, jamais électricité ; C interpolation linéaire d’une courbe documentée. Production annuelle seulement sur une année complète. |
| Éolienne : démarrage/nominale/arrêt | Partiellement implémentée | Seuils et cohérence de courbe contrôlés ; arrêt à la vitesse d’arrêt, zéro sous démarrage. Vitesse nominale validée, pas un modèle indépendant remplaçant la courbe. Pas de correction hauteur/densité ou pertes implicites. |
| Batterie SOC, rendements, puissance, pertes, ENS | Implémentée et testée | Réservoir horaire PV+batterie ; charge sur surplus PV, limites SOC/puissance ; capacité de référence avant fenêtre SOC. Bilans contrôlés ; cycles équivalents calculés. |
| Batterie vieillissement, charge réseau, véritable peak shaving | Non implémentée | Les cycles ne constituent pas un modèle de vieillissement. `peak_shaving` est un alias compatible, pas une commande de pointe validée. |
| Biomasse énergie primaire | Implémentée et testée | Une fiche, année complète, masse reçue t/an et PCI reçu MJ/kg ; MWh/an = masse × PCI / 3,6. Humidité et compatibilité documentées. |
| Biomasse humidité/correction, mobilisation, conversion chaleur/électricité | Non implémentée | Humidité conservée et contrôlée, sans correction numérique ; fractions non appliquées. Mobilisable, chaleur et électricité indisponibles, pas zéro fictif. |
| CSP bilan solaire/thermique prescrit | Implémentée et testée dans son périmètre | Cylindro-parabolique ; DNI horaire moyen W/m², surface, facteur optique et pertes constants documentés. Bilan signé. Ce n’est pas une centrale prédictive. |
| CSP conversion électrique | Partiellement implémentée | Le moteur peut calculer brut avec rendement de cycle explicite et net avec auxiliaires, seulement si chaque bilan thermique horaire est non négatif. Sans paramètres/prérequis : indisponible. Aucun résultat CSP hébergé enregistré. |
| CSP stockage thermique, dispatch, autres familles | Non implémentée | Stockage explicitement refusé ; pas de fluide/température dynamique, démarrage ni charge partielle. |
| Hybride PV+batterie | Implémentée et testée dans le moteur batterie | Dispatch chronologique du PV enregistré et demande alignée ; résultat QA existant consulté. Pas un orchestrateur multi-filières général. |
| Préparation hybride et comparaison individuelle | Implémentée et testée | Projets/sites, enveloppes versionnées, contrôle serveur des références et compatibilités, conservation des historiques ; aucune addition aveugle. |
| Éolien+batterie, PV+éolien+batterie, PV+éolien+biomasse et autres hybrides chronologiques | Présente dans l’interface mais absente du moteur général | Préparation/comparaison seulement ; le niveau C reste annoncé indisponible. Biomasse primaire ne peut pas alimenter un bus électrique sans procédé validé. |
| Optimisation des candidats batterie enregistrés | Implémentée et testée en TypeScript | Énumération exhaustive de 1 à 12 calculs compatibles ; minimise ENS, bornes capacité, même PV/demande, politiques initiale/terminale explicites. Optimum du domaine fini seulement ; aucune exécution hébergée d’optimisation démontrée ici. |
| Optimisation de dimensionnement / nouvelles capacités / mix / multicritère | Non implémentée | Pas de recherche physique qui lance les moteurs pour de nouvelles tailles ; moteur Python optimization absent. |
| Finance CAPEX/OPEX/remplacements/LCOE | Implémentée et testée en TypeScript | Hypothèses projet historisées ; production liée issue d’un calcul terminé. Python finance absent, sans que cela rende le calcul TypeScript inexistant. |
| Finance flux/VAN/TRI/retours/sensibilité | Implémentée et testée en TypeScript, intégration partielle | Convention réelle, flux annuels fin d’année, coûts sourcés, parts vendue/substituée sans double comptage, TRI à domaine borné ; analyse interactive non persistée dans son intégralité. |
| Comparaison économique multi-scénarios persistée | Non implémentée | Tableau actuel PV/batterie énergétique, pas financier ; données économiques réelles détaillées manquantes. |

## 3. Code concerné et routes réelles

- `python-engine/app/api/routes/v1.py:16–69` : `GET /api/v1/health`, `GET /api/v1/capabilities`, `POST /api/v1/simulations/validate`, `POST /api/v1/simulations`. Le calcul utilise le même POST pour les cinq moteurs ; `engine` sélectionne la filière.
- `python-engine/app/api/schemas/contract.py:17–62` : JSON v1.0 avec `simulation_id`, `project_id`, `engine`, version, `input_data` (valeur/unité/nature/source), hypothèses, références et séries horodatées. PV/batterie utilisent heures standards locales et décalage UTC explicite ; éolien/CSP exigent leurs conventions UTC. Aucun réalignement implicite.
- `src/lib/engine-http.server.ts:9–53` : URL cible base Render + `/api/v1` + chemin ; HTTPS, timeout, refus des redirections, classification sûre réseau/401/403/404/422/5xx. Clé `X-Engine-Key` et bearer uniquement entre serveurs, secrets masqués dans erreurs.
- `python-engine/app/core/security.py:18–47` : comparaison de clé et vérification du token auprès du service d’identité ; identité jamais prise du JSON.
- `src/lib/engine.functions.ts` : contrôle rôle et accès sous utilisateur, sélection sources, validation requête/réponse et persistance privilégiée après contrôle. Instantanés conservés ; échec non enregistré comme calcul réussi.
- Les routes Python `GET /simulations/{id}` et `/results` existent mais `NoRepository` retourne toujours absent (`python-engine/app/repositories/simulations.py`). Elles ne servent pas la relecture durable actuelle : l’application lit Lovable Cloud. Aucun second dépôt à créer pour résoudre cela.
- PV : `python-engine/app/engines/pv/engine.py:151–232` ; éolien `wind/engine.py:120–209` ; batterie `battery/engine.py:148–255` ; biomasse `biomass/engine.py:65–90` ; CSP `csp/engine.py:105–164`.
- Interfaces : `src/routes/_authenticated/simulations.{index,new,$id.results}.tsx`, `src/routes/_authenticated/technologies.index.tsx`, `src/features/engine/*`, `src/features/hybrid/*`, `src/features/finance/*`.
- Comparaison/optimisation : `src/lib/{hybrid,optimization}.functions.ts`, `src/lib/{hybrid-data,optimization-data}.server.ts`, `src/services/optimization/stored-battery-*`.

## 4. Tests et vérifications exécutés aujourd’hui

1. `bunx vitest run` : **435 tests réussis, 34 fichiers**. Contrats, intégrité réponses, transport, sources/accès, bilans, finance, hybride et optimisation inclus. Aucun nouveau test ajouté à l’étape d’audit sans changement de règle.
2. `PYTHONDONTWRITEBYTECODE=1 … python -m pytest -q -p no:cacheprovider` depuis `python-engine` : **225 tests réussis**, dont API/auth via client de test, calculs et bilans. Deux avertissements de dépendances (Starlette/httpx et propriété Pandas de pvlib), aucun échec.
3. Python/pytest initialement absents : environnement isolé installé dans `/tmp`, Python **3.12.13**, PySAM **7.1.1.post1**, pvlib **0.11.2**. La version déploiement fixée **3.12.7 n’a pas été modifiée** ; le test local n’est pas une certification du runtime Render exact.
4. GET réel `https://energie-renouvelable.onrender.com/api/v1/health` : **HTTP 200**, service 0.1.0, schéma 1.0, environnement production, `auth_configured=true`. Santé ≠ réussite de calcul.
5. Navigateur local sous compte demandeur : **« Moteur de calcul connecté »**, consultation du tableau comparatif puis ouverture effective du résultat **Batterie QA synthétique 2026**, titre et valeurs contrôlés, capture inspectée, aucune erreur JavaScript. Couverture **81,065 %**, autoconsommation **87,16 %**, ENS **3 025,722 kWh** : chiffres historiques QA, pas recalculs ni données terrain.
6. Base lue : **3 simulations terminées** (PV, batterie, éolien), **54 lignes de résultats**, **1 météo 8 760 h**, **0 fiche biomasse**. Les anciens blocages « aucun PV terminé » ou « Render auth absent » de la feuille de route sont historiques, plus l’état actuel.
7. Dernier signal automatique disponible : **build OK**. Aucun build manuel, aucune publication.

**Non exécuté :** nouveaux POST de calcul Render, sauvegarde de nouvelles simulations, éolien C hébergé, CSP/biomasse hébergés, optimization hébergée, isolation deux comptes, validation scientifique sur données réelles et interface publiée. Les graphiques complets ne sont pas qualifiés par la seule lecture des indicateurs ; la capture batterie confirme les chiffres mais pas la visibilité des courbes.

## 5. Défauts et écarts à traiter, sans réécriture globale

- **Descriptions trompeuses établies :** la liste des capacités dit « conversion énergétique biomasse » alors que le moteur ne fait que le primaire ; Technologies annonce CSP « sans production électrique » alors qu’une branche conditionnelle prescrite existe. Les badges « Module raccordé » et versions de capabilities ne suffisent pas à qualifier une fonction opérationnelle. Harmoniser périmètre logiciel, connexion, preuve de calcul et validation scientifique séparément.
- **PV :** agrégations journalières/horaires présentes au moteur et contrôlées, non exposées dans une vue dédiée de résultats. Réutiliser les séries existantes au lieu de recalculer dans le navigateur.
- **Finance :** `getProjectFinance` ignore certaines erreurs de listes/historique et recherche la simulation liée dans les 50 dernières. Une référence ancienne peut disparaître de l’affichage malgré son existence. À couvrir avec tests ciblés et relecture par identifiant.
- **Finance rattachement projet :** `saveProjectFinance` autorise une production de simulation sans projet et ne vérifie pas explicitement l’accès au projet avant l’insertion. Les politiques actives vérifiées limitent le propriétaire/role, mais l’INSERT ne lie pas son contrôle au propriétaire du projet parent. Risque de rattachement incohérent à instruire, **pas un exploit multi-comptes reproduit**. Une correction de politique éventuelle doit être expliquée avant migration ; aucune migration pendant cet audit.
- **Hybridation générale :** absente ; avant extension, définir stratégie de dispatch, bus AC/DC, priorité, SOC initial/final, rendement/puissance et compatibilité temporelle. Réutiliser le stockage existant, ne jamais convertir le primaire biomasse implicitement.
- **Optimisation :** V1 finie réelle mais ne dimensionne pas de nouvelles capacités. Extension dépend d’un dispatch validé et d’un budget de calcul explicite.
- **CSP :** pertes et auxiliaires constants à toutes les heures, même nuit ; utiles seulement sous conditions strictes. Stockage, arrêt/démarrage et procédé complet nécessitent décisions scientifiques, pas un écrêtage arbitraire.
- **Biomasse :** correction humide/sec et conversion thermique/électrique nécessitent procédé, PCI compatible, disponibilité et sources ; aucun rendement à supposer.
- **Sécurité client :** risque de cache résiduel lors d’identité externe et avertissements linter déjà documentés dans `VALIDATION_INTERFACES.md` ; restent ouverts, pas validés par les seuls tests unitaires.

## 6. Ordre de réalisation proposé

1. Statuts exacts Simulations/Technologies et accès vers formulaires/résultats existants ; aucun calcul scientifique modifié.
2. Rattachement/intégrité/relecture finance et séries PV horaires/journalières ; tests de régression, contrôles d’accès, aucun second moteur.
3. Qualification progressive PV, éolien C et batterie sur données QA existantes, puis données réelles sourcées ; calcul → sauvegarde → relecture et refus. Second compte QA autorisé nécessaire pour l’isolation.
4. Modèle hybride électrique validé : d’abord éolien+batterie puis PV+éolien+batterie, avec stockage réutilisé et bilans explicites.
5. Optimisation bornée de nouvelles configurations basée sur les moteurs qualifiés, puis comparaison financière reproductible/persistée.
6. Biomasse conversion et CSP détaillé/stockage seulement après choix scientifiques et sources validés par Joël. Ces extensions ne sont pas promises opérationnelles au terme de l’audit.

## 7. Fichiers modifiés à cette étape

`AUDIT_MOTEUR_SCIENTIFIQUE.md`, `roadmap.md` et le plan de réalisation ; exigences mémorisées. Aucun code applicatif/Python, formule, contrat, configuration, secret, donnée, rôle ou politique modifié. La base de connaissance énergie-renouvelable a guidé la séparation données/hypothèses/résultats et la validation réservée à l’ingénieur.