# PROMPT 19 — Cohérence Ressources / Technologies et retours

## Incohérences établies et corrections

- Les anciens indicateurs solaires du tableau de bord ne constituaient pas la même sélection que la liste dédiée. Les deux vues utilisent maintenant les services de listes existants et les mêmes sélecteurs d'inventaire.
- Les statuts des ressources, des configurations et des calculs étaient insuffisamment distingués. Les compteurs affichent séparément les fiches enregistrées, validées, localités et calculs terminés. La météo reste distincte des ressources ; un module raccordé ne prouve pas une connexion opérationnelle.
- Les filtres de liste n'étaient pas conservés par les liens vers une fiche. Les liens transportent les paramètres validés et le retour utilise une destination interne explicite, sans dépendance exclusive à l'historique.
- Une animation de carte pouvait continuer après le départ de Ressources et provoquer `_leaflet_pos`. Les transitions sont désactivées et arrêtées avant suppression ; les points sont stables et filtrés par les localités de l'inventaire.

## Services et fichiers

Nouveaux : `src/features/catalog/{inventory.ts,inventory.test.ts,use-inventory.ts,catalog-controls.tsx}`, `src/lib/catalog.functions.ts`, `src/components/app/{back-target.ts,back-target.test.ts,context-navigation.tsx}`.

Modifiés : `src/routes/__root.tsx`, `src/routes/_authenticated/{resources.index.tsx,technologies.index.tsx,resources.solar.index.tsx,resources.wind.index.tsx,resources.biomass.index.tsx}`, `src/components/app/{app-shell.tsx,page.tsx}`, `src/features/resources/resource-manager.tsx`, `src/features/geography/territory-map.tsx`, `AGENTS.md`, `roadmap.md`.

Les listes solaires, éoliennes, biomasse, déchets et météo existantes restent la référence. La lecture supplémentaire des configurations et métadonnées de simulations est authentifiée et utilise le client utilisateur soumis aux politiques existantes ; pagination par 500 lignes, aucun client privilégié. Les configurations renvoient au stockage du projet. Les calculs sont comptés à partir du moteur stocké dans `parameters.request.engine`.

## Navigation

Accès croisés Ressources / Technologies avec localité et statut ; accès aux formulaires PV, éolien, biomasse et CSP existants. Batterie conserve la bibliothèque et les configurations projet. Déchets indique l'absence de moteur. Retour contextuel visible dans l'espace connecté et destinations de repli par section ; filtres de recherche des fiches conservés. Aucun calcul nouveau ou résultat créé.

## Vérifications réalisées

- 434 tests TypeScript réussis dans 34 fichiers, dont huit nouveaux tests sur inventaires et destinations de retour.
- Dernier contrôle automatique : build OK, après correction des annotations de points de carte.
- Navigateur connecté avec le compte demandeur : Ressources et Technologies chargées, liens croisés, recherche QA conservée lors du retour d'une fiche éolienne, repli depuis une simulation ouverte directement, absence d'erreurs JavaScript après correction de carte.
- Contrôle des lectures sous le jeton utilisateur : 49 ressources génériques, une configuration stockage et deux jeux météo. Les listes dédiées affichent 24 fiches solaires et 25 éoliennes ; Technologies présente les mêmes valeurs et les mêmes statuts.
- Filtre localité QA : une fiche éolienne sur les deux vues et dans la liste ; lien de calcul ouvre l'onglet Éolien A/B/C.
- Mobile 390 × 844 : carte Batterie chargée, retour visible, aucun débordement horizontal ; vue ordinateur également inspectée.

## Limites et intégrité

Les parcours filtrés ont été exercés sur des données QA synthétiques : cela ne valide ni les données scientifiques ni les moteurs. Aucun calcul Render n'a été lancé pour cette tâche. Aucun secret, configuration Render, contrat scientifique, table, migration, permission ou donnée de production modifié.

L'isolation entre plusieurs comptes et les différents rôles n'a pas été testée de bout en bout ; les politiques existantes sont préservées, sans affirmer une validation multi-rôle. La version publiée n'a pas été vérifiée ni republiée. Les formulaires contrôlent leurs propres prérequis : le nombre de ressources ne garantit jamais la suffisance horaire ou physique. La carte se limite aux coordonnées présentes dans le service existant, sans inventer de position.

La relance financière antérieure reste bloquée par les vraies valeurs PV et hypothèses économiques sourcées manquantes ; aucune valeur synthétique n'a été substituée à ces données.

## PROMPT 19.1 — Audit final (1–2 novembre 2026)

### Portée et preuves de sécurité

- Inspection des services de listes, fiches, inventaire et simulations : ils utilisent le contexte utilisateur authentifié et les politiques de lecture existantes, pas un client privilégié pour ces lectures. Les filtres d’interface ne constituent pas un contrôle d’accès.
- Lecture des politiques **actives** de Lovable Cloud : ressources générales, solaires, éoliennes et biomasse réservées au propriétaire ou à un administrateur ; batteries, configurations, météo, projets et simulations utilisent également `can_access(owner_id)`, défini comme propriétaire ou administrateur. RLS activée sur les onze tables inspectées. Les localités de référence sont volontairement partagées ; elles ne sont pas des ressources privées.
- Des migrations historiques contiennent des lectures plus larges. Ce texte ne décrit pas l’état actuel : les politiques actives ont été vérifiées séparément et sont restrictives. Aucun changement de politique nécessaire établi sur ces lectures.
- Lien direct vers un résultat PV existant : consultable avec le compte administrateur demandeur, retour vers Simulations réussi. Le même lien sans session redirige vers la connexion.
- **Non exécuté :** appels directs aux services sous un second compte, identifiants appartenant à un autre compte, compteurs privés croisés et remplacement d’identité dans le même navigateur. Le second compte n’a pas été désigné après la demande ; aucune session tierce n’a été choisie arbitrairement. Un administrateur est autorisé à voir les autres propriétaires : son seul parcours ne prouve pas l’isolation.

### Cohérence et navigation vérifiées localement

- Ressources et Technologies : solaire **24 fiches / 0 validée / 2 localités**, éolien **25 / 1 / 3**, biomasse et déchets **0**. Technologies sépare les **2 jeux météo validés**, la **configuration batterie validée** et les calculs terminés (**1 PV, 1 éolien, 1 batterie**). Une fiche météo n’est pas une fiche solaire.
- Retour solaire avec recherche `NASA` et retour éolien avec recherche `QA` : filtres conservés, y compris après ouverture directe de la fiche avec ses paramètres.
- **Défaut confirmé puis corrigé :** la bibliothèque batterie stockait ses filtres uniquement en mémoire locale et ne les transmettait pas à la fiche. Recherche, statut, chimie et application passent maintenant par les paramètres autorisés de navigation. Parcours bibliothèque → fiche → Retour vérifié avec `q=QA`, `status=validated`, `chem=lfp` ; filtre conservé et capture inspectée.
- Retour biomasse non exercé sur une fiche : aucune fiche disponible ; destination de repli couverte par le test unitaire existant, pas présentée comme un parcours réel réussi.
- Aucun résultat scientifique généré ou changé ; consultation des résultats QA historiques uniquement.

### Tests, environnement et limites

- **435 tests TypeScript réussis / 34 fichiers**, dont tests d’accès moteur, sources batterie, hybrides et inventaire ; ajout d’un cas sur la conservation des filtres batterie et l’exclusion des paramètres de cible externe/propriétaire. Ces tests unitaires ne remplacent pas une preuve RLS entre deux sessions.
- Dernier contrôle automatique disponible : **build OK** (2 novembre 2026). Aucun build manuel lancé.
- Navigateur local connecté : compteurs chargés, retours solaire/éolien/batterie et simulation, puis refus du lien simulation sans session ; **aucune erreur JavaScript** sur ce parcours.
- Les captures démontrent les compteurs et le retour batterie. La carte affiche les points mais son fond cartographique n’est pas chargé dans la capture : le rendu des tuiles n’est pas validé par cet audit.
- Métadonnées inspectées sur les 66 fichiers de routes : les pages de contenu ont les six champs attendus ; les fichiers sans titre sont des enveloppes de navigation, pas des pages de contenu.
- **Version publiée : non testée**, aucune session locale transférée vers une autre origine et aucune publication effectuée. La lecture des règles hébergées n’est pas une vérification de l’interface publiée.

### Risques ouverts et suites nécessaires

1. **Isolation multi-comptes non validée** : désigner et autoriser un second compte QA, puis tester listes, compteurs, fiches et services directement, dans les deux sens. Les données actuelles ressources/batteries/simulations appartiennent au demandeur ; aucun jeu privé appartenant au second compte n’a été créé.
2. **Cache lors de changements d’identité externes** : le bouton de déconnexion annule les requêtes et vide le cache. L’abonnement global, lui, ne vide pas le cache lors d’un `SIGNED_OUT` externe et invalide seulement lors d’un `SIGNED_IN` d’une identité différente ; les clés de requêtes ne contiennent pas l’identité. Risque de données précédentes transitoirement conservées, **pas une fuite reproduite**. Reproduction avec deux comptes nécessaire ; correction proposée : effacement/annulation sur changement réel d’identité avant réutilisation des vues. Aucun changement de politique ou de base requis pour cette correction côté interface.
3. **Linter hébergé : neuf avertissements, trois catégories** : un chemin de recherche mutable (`touch_project_finance_assumptions`), deux fonctions déclencheurs `SECURITY DEFINER` exécutables par le rôle anonyme (`log_project_finance_assumptions`, `record_energy_production_history`) et six accessibles au rôle connecté, dont les RPC de calcul/administration qui ont leurs gardes internes. Cela ne prouve pas un contournement ; les fonctions de déclencheur ne sont pas des RPC ordinaires. Durcissement potentiel des droits EXECUTE et du chemin de recherche à revoir séparément avant migration, avec tests des déclencheurs et conséquences expliquées.

### Fichiers modifiés dans cet audit

`src/features/catalog/inventory.ts`, `src/features/catalog/inventory.test.ts`, `src/routes/_authenticated/technologies.storage.index.tsx`, `VALIDATION_INTERFACES.md`, `roadmap.md` ; contrainte d’audit mémorisée. Aucun moteur, formule, secret, configuration Render, table, permission, migration ou donnée modifié.

## PROMPT 19.2 — Préparation multi-comptes et production (5 novembre 2026, UTC)

### 1. Portée et état des preuves

Préparation documentaire et inspections en lecture seule uniquement. Aucune session tierce ouverte, aucun compte créé, aucune donnée créée/modifiée, aucune migration, modification de rôle/politique, configuration du moteur ou publication. Les **435 tests** restent la preuve historique des étapes précédentes : ils n’ont pas été relancés pour cette mise à jour documentaire et ne prouvent pas une isolation réelle.

### 2. Comptes existants et autorisation

Les comptes suivants existent, avec adresse confirmée et rôles lus dans la table protégée ; aucun email, jeton ou mot de passe n’est consigné ici.

| Compte | Rôles actuels | Preuve et usage possible |
|---|---|---|
| N’guessan Joël Dje | admin + viewer | Compte demandeur déjà utilisé ; contrôle administratif seulement, pas preuve d’isolation propriétaire. |
| MBAIRAMADJI ALFRED | engineer + viewer | Attribution engineer par Joël auditée le 15/10/2026 ; candidat non administrateur, utilisation de sa session pour ce protocole à autoriser explicitement. |
| Testeur Démo | viewer | Attribution puis révocation engineer auditée le 13/10/2026 ; compte test existant, reste lecteur. Ne pas réattribuer un rôle dans cette étape. |
| Alfred Mbaïramadji | viewer | Compte distinct de MBAIRAMADJI ALFRED ; ne pas les confondre ni supposer une autorisation QA. |
| ZOTTO Télesphore | viewer | Existant, aucune désignation QA établie dans l’historique inspecté. |

Il existe donc des seconds comptes, mais pas de paire A/B désignée et autorisée pour ce parcours. La confirmation d’adresse et l’historique d’attribution de rôle ne constituent pas l’autorisation d’ouvrir une session tierce. A/B doivent être **deux comptes non administrateurs** pour un test symétrique ; le compte de Joël reste observateur/admin. Un viewer suffit aux contrôles de lecture/refus, mais pas à créer ou valider des ressources ni à lancer un moteur réservé aux ingénieurs.

**Permissions actives inspectées :** `app_private.can_access` autorise le propriétaire ou admin ; `can_write_resource` autorise admin ou propriétaire engineer. Les ressources énergétiques/solaires/éoliennes/biomasse appliquent également propriétaire ou admin à la lecture. RLS active sur les 12 tables contrôlées (ressources, batteries, configurations, projets, météo, simulations/résultats, catalogue et rôles). Les technologies sont partagées entre sujets authentifiés ; les rôles sont lisibles seulement pour son propre utilisateur. Les droits SQL SELECT seuls ne garantissent pas la visibilité : la politique RLS reste nécessaire. Pour simulations et résultats, les droits INSERT/UPDATE/DELETE du rôle utilisateur sont absents, même si leur politique contient une clause ALL. Les lectures privées passent par les services utilisateur, pas par une lecture privilégiée.

**Données disponibles :** les 49 ressources, 1 projet, 1 fiche batterie, 1 configuration, 3 simulations et 2 jeux météo inspectés appartiennent tous à Joël. Aucun jeu de ces catégories appartenant aux autres comptes ; aucune biomasse disponible. Il est possible, après autorisation de session, de tester que les comptes ordinaires ne voient pas les éléments privés de Joël. Cela ne couvre ni les contrôles positifs sur leurs propres éléments ni l’isolation A↔B symétrique.

**Procédure si un nouveau compte QA devient nécessaire (non exécutée) :** Joël désigne l’identité et autorise sa création ; utiliser More → Users → Add user → Send invitation, puis le testeur accepte l’invitation. Vérifier ensuite confirmation, profil et rôles effectifs. Ne pas activer les inscriptions publiques, l’auto-confirmation ou un fournisseur pour faciliter l’audit. Les paramètres hébergés actuels d’inscription/connexion n’ont pas été lus : à contrôler dans More → Users → Auth settings avant l’invitation. Si un droit engineer est réellement requis dans une phase ultérieure autorisée, utiliser uniquement l’action existante « Accès des testeurs » et son attribution auditée ; **aucun rôle admin/SuperAdmin**. Création de comptes, droits et jeux QA restent hors de cette étape.

### 3. Protocole d’isolation prêt à exécuter

Préparer un manifeste privé de références existantes : compte propriétaire, UUID, type, statut et valeurs attendues. Ne pas créer de fixtures dans cette étape. Utiliser deux contextes de navigateur séparés, puis un troisième contexte sans connexion. Vérifier l’identité réelle côté service avant chaque série. Rejouer chaque ligne A→B et B→A : contrôle positif du propriétaire puis contrôle négatif de l’autre compte. Un refus doit être une absence/null ou une erreur contrôlée sans contenu privé ; **HTTP 200 n’est pas une preuve d’accès**, il faut lire le résultat et les données affichées.

| ID | Parcours / appel existant | Observation attendue et preuve à conserver | État |
|---|---|---|---|
| ISO-01 | Sans session : `/resources`, `/technologies`, liens de fiches/projets/résultats ; mêmes fonctions GET sans bearer | Redirection connexion côté page et refus côté service ; aucun nom, snapshot, historique ou série privée. | Prêt, non exécuté ici |
| ISO-02 | `/resources/solar/<id>`, `/resources/wind/<id>`, `/resources/biomass/<id>` ; `getSolar`, `getWind`, `getBiomass` avec `{id}` | Propriétaire : sa fiche ; autre : aucune fiche ni provenance privée. Répéter avec URL connue, sans passer par la liste. | Bloqué pour A/B ; biomasse absente |
| ISO-03 | `/projects/<id>` et `/projects/<id>/storage` ; `getProjectRecord({projectId})`, `getProjectStorage({projectId})` | Aucun projet, champ, configuration, fiche jointe ou historique du propriétaire tiers. | Bloqué : références A/B absentes |
| ISO-04 | `/technologies/storage/<id>` ; `getDatasheet({id})` ; `/technologies/storage/compare?ids=<idA>,<idB>` | La comparaison ne révèle pas une fiche étrangère ; détails/historique également inaccessibles. Contrôle positif avec une fiche accessible. | Bloqué : références A/B absentes |
| ISO-05 | `/simulations/<id>/results` ; `getSimulation({id})`, `getSimulationSeries` avec son contrat courant | Aucune métrique, série horaire, source ou snapshot privé de l’autre compte. Tester aussi référence PV utilisée par batterie. | Bloqué : simulations A/B absentes |
| ISO-06 | `listSolar`, `listWind`, `listBiomass`, `listResources`, `listWeather`, `listDatasheets`, `listProjects`, `listSimulations`, `getCatalogRecords`, `getPvBatteryComparison` | Les UUID étrangers n’apparaissent ni dans les lignes ni dans les réponses ; comparatif PV/Batterie et inventaire ne révèlent aucun résultat tiers. | Prêt après autorisation des sessions |
| ISO-07 | Ressources et Technologies, sans filtre puis localité/statut ; comparer avec les mêmes réponses de listes | Compteurs fondés seulement sur les lignes accessibles : ressources, météo, configurations et calculs terminés distincts. Catalogue partagé permis, statistiques privées étrangères exclues. État vide acceptable mais pas preuve symétrique suffisante. | Prêt après autorisation des sessions |
| ISO-08 | Requêtes GET directes côté serveur avec identifiants tiers, bearer A/B/sans bearer ; lectures de tables sous les mêmes identités | Refus/absence sous les politiques actives, y compris tables liées ; ne pas tester en rôle privilégié. Conserver méthode, statut et réponse expurgée, jamais les en-têtes secrets. | Non exécuté |
| ISO-09 | Même navigateur : A charge listes/fiches, déconnexion via bouton, connexion B ; répéter avec déconnexion/changement de session depuis un second onglet | Aucune donnée de A, même transitoire, dans B ni après déconnexion. Capture chronologique expurgée et réponse serveur sous B. | Non exécuté ; risque cache connu |
| ISO-10 | Viewer : contrôles d’édition/calcul absents ou désactivés ; tentative serveur seulement en environnement QA autorisé | Refus serveur, pas seulement contrôle visuel. Ne jamais soumettre une écriture contre une donnée existante pour « voir si elle échoue ». | Visuel prêt ; écritures hors périmètre |

Les appels directs doivent utiliser les fonctions TanStack réellement livrées et leurs validateurs ; récupérer la requête de lecture de la version testée ou son client de test. Ne pas inventer une URL de fonction HTTP stable : les identifiants de transport peuvent changer entre versions. Tester la réponse serveur indépendamment d’un simple clic UI. Aucune tentative de calcul n’est incluse ici, car `runEngineSimulation` crée d’abord un enregistrement et sortirait de l’interdiction de modification des données.

**Cache à traiter comme risque ouvert :** `src/components/app/app-shell.tsx` annule/efface les requêtes au bouton de déconnexion. `src/components/auth/oauth-return-handler.tsx` invalide le routeur sur SIGNED_OUT mais ne vide pas le cache ; SIGNED_IN invalide les requêtes sans effacement préalable. `src/features/catalog/use-inventory.ts` et les vues batterie utilisent des clés sans identité. Aucun défaut reproduit sous deux sessions ici et aucune correction apportée ; ISO-09 doit explicitement couvrir ce cas avant de déclarer la validation finale.

### 4. Validation de la version publiée préparée

**Sondages publics effectués à cette étape :** racine `https://energie-renouvelable.lovable.app/` HTTP **200** ; `https://energie-renouvelable.onrender.com/api/v1/health` HTTP **200**, `status=ok`, `service_version=0.1.0`, `schema_version=1.0`, `environment=production`, `auth_configured=true`. Ces sondages sans session ni calcul ne vérifient ni le JavaScript rendu, ni l’intégration application→moteur, ni les permissions ou les pages protégées de la version publiée. Aucun `/docs` ou `/openapi.json` supposé disponible.

Avant exécution :

1. Identifier la révision effectivement publiée (date/référence de publication ou équivalent vérifié), notamment la présence de la correction du retour batterie ; ne pas supposer que le code local est déjà en ligne.
2. Autoriser les comptes A/B et leurs connexions **sur cette origine** ; utiliser leur connexion normale ou une session autorisée spécifique à cette origine. Ne pas transférer un jeton local par script global ni le stocker sur d’autres domaines. Ne demander ni afficher mot de passe/clé.
3. Disposer d’éléments privés existants accessibles à chaque compte et d’un manifeste attendu. Si cela exige une création, la reporter à une phase QA séparément autorisée ; ne pas toucher la production pour faciliter les tests.
4. Vérifier les réglages hébergés de connexion, la destination des invitations/retours de connexion et les accès aux comptes sans modifier ces réglages. Ils restent non vérifiés par cet audit.

| ID | Contrôle publié prévu | Critère |
|---|---|---|
| PROD-01 | Ressources/Technologies, ordinateur 1280×1800 puis mobile 390×844 | Pas de débordement/écran blanc ; données cohérentes entre listes et compteurs, chargement/erreur/vide distingués ; fond cartographique réellement chargé ou limite relevée. |
| PROD-02 | Liste solaire `q=NASA`, éolienne `q=QA` et filtres localité/statut ; fiche puis Retour, ouverture directe puis Retour | Paramètres autorisés conservés, destination interne correcte, aucun historique navigateur obligatoire. Utiliser les valeurs réellement présentes dans le jeu du compte. |
| PROD-03 | Batterie `q=QA&status=validated&chem=lfp` et application choisie disponible ; fiche puis Retour | Recherche/statut/chimie/application conservés ; comparaison et retour projet cohérents. |
| PROD-04 | ISO-01 à ISO-09 sur le domaine publié | Refus/accès réels et compteurs propres aux identités ; pas de confusion avec les vérifications locales antérieures. |
| PROD-05 | Console et réseau sur chaque navigation/retour | Absence d’erreur JavaScript, imports de modules en erreur, erreurs Leaflet, requêtes silencieusement refusées ; capturer statut/chemin sans token, cookie ni clé. |
| PROD-06 | Simulations : consultation QA historique et « Revérifier la connexion » | Appels de santé/capacités via serveur ; aucun appel Python direct depuis le navigateur, aucune clé partagée exposée. Santé n’est pas validation scientifique. |
| PROD-07 | Calcul PV/batterie ultérieur, uniquement si explicitement autorisé avec jeux QA complets | Contrats réels : POST `/api/v1/simulations/validate` puis `/api/v1/simulations`, serveur→Render avec authentification ; PV annuel et batterie liée au PV/demande du même projet ; sauvegarde puis relecture requises. **Hors de cette étape sans écritures.** |

Pour chaque test, enregistrer date UTC, environnement/révision, compte désigné (sans secret), rôle, références privées dans le manifeste sécurisé, action, attendu, observé, statut, capture et éventuel blocage. Les réponses de listes, fiches et séries doivent être vérifiées, pas seulement les captures. Ne pas provoquer de pannes ni modifier Render pour tester les diagnostics ; classer les échecs réellement observés (réseau/délai, 401/403, 404, 422, 5xx).

### 5. Blocages et résultat de préparation

- Paire A/B non administratrice non désignée et autorisation de sessions tierces manquante ; aucun rôle changé.
- Jeux privés A/B absents : isolation symétrique et contrôles positifs non exécutables sans jeux existants ou phase de création séparée autorisée ; biomasse absente.
- Révision publiée, connexion publiée et réglages hébergés non vérifiés ; santé publique seulement contrôlée.
- Risque cache inter-identités et avertissements 19.1 restent ouverts ; aucune migration ou modification d’interface proposée comme déjà appliquée.
- **Isolation multi-comptes : NON VALIDÉE. Version publiée complète : NON VALIDÉE.** Le protocole est préparé, pas exécuté ; pas de nouveau calcul ou résultat scientifique.

Fichiers de cette étape : `VALIDATION_INTERFACES.md`, `roadmap.md` et contrainte de préparation mémorisée. Aucun fichier applicatif/Python, clé, donnée, politique ou fonctionnalité modifié ; aucune nouvelle architecture introduite.