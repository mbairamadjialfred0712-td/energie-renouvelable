# Guide professionnel de simulation — Énergie Renouvelable

Version 1.0 • 17 novembre 2026 • N’guessan Joël Dje

## 1. Votre première simulation : où cliquer

Commencez par un photovoltaïque seul, puis ajoutez une batterie après le PV terminé. Pour débuter, utilisez une année non bissextile complète dont vous possédez les données.

1. Connectez-vous : https://energie-renouvelable.lovable.app
2. Ouvrez Projets : choisissez votre projet ou créez sa fiche (Créer la fiche).
3. Préparez 8 760 heures météo et les paramètres de l’installation.
4. Ouvrez Simulations → Nouvelle simulation.
5. Choisissez Photovoltaïque (PVWatts v8).
6. Remplissez le formulaire détaillé aux chapitres 3–4.
7. Cliquez Lancer la simulation PV ; attendez sans multiplier les clics.
8. Relisez le statut, les entrées et les avertissements.

Attendez la fin de Vérification… et le chargement des listes. Moteur de calcul connecté indique une connexion, pas la validation scientifique du résultat. Votre compte doit avoir les droits sur le projet et sur les actions demandées.

Pour vous entraîner, Télécharger le modèle CSV fournit des données fictives : nommez l’essai FORMATION — données fictives, déclarez la nature Hypothèse et sa source. Il ne représente pas votre site réel.

Aucune donnée réelle de site n’a été fournie dans cette demande : le classeur joint est vierge, sans mesure ni paramètre technique inventé.

## 2. Réunir un dossier de site fiable

Pour chaque donnée, conservez valeur + unité + période + source + nature + justification. Une donnée inconnue reste à fournir : jamais zéro de remplacement.

À demander :
• Projet, localité, site : fiche d’étude et visite terrain.
• Latitude/longitude en degrés décimaux, altitude en mètres : GPS ou référence géographique.
• Météo horaire : station ou service documenté, unités, fuseau, période, définition des intervalles.
• Demande : compteur ou campagne de mesure, énergie kWh sur chaque heure.
• Matériel : fiches fabricant PV/onduleur/batterie, datées.
• Coûts : devis et contrats, devise, date, périmètre.
• Vent/biomasse : hauteur, période, courbe turbine ou analyses PCI/humidité.

Territoires → Météo conserve des séries de site pour éolien/CSP. Le PV détaillé utilise son propre CSV ; l’enregistrement d’une fiche météo ne remplit pas automatiquement son formulaire.

Demande énergétique documente équipements, inventaires et mesures. Son export CSV d’inventaire n’est pas une courbe timestamp;demand_kwh. Une consommation annuelle ne devient pas automatiquement un profil horaire.

Importations permet le dépôt et la correction humaine des documents. Déposer un PDF/Excel ne lance pas une simulation et ne valide pas scientifiquement ses données.

Lancer la pré-analyse dans un projet n’est pas Lancer la simulation PV. L’IA examine le dossier ; elle ne remplace pas le moteur de production.

## 3. PV : tous les paramètres nécessaires

Le formulaire demande tous les paramètres suivants ; aucune valeur par défaut n’est fournie. Choisissez aussi leur nature : Mesurée, API / document externe, Estimée ou Hypothèse.

• Latitude et longitude : degrés décimaux, GPS du site.
• Altitude : m, relevé ou référence.
• Puissance DC installée : kWc, nominal total des modules (1 000 Wc = 1 kWc).
• Ratio DC/AC : puissance DC / puissance AC nominale onduleur ; indication écran 0,5–3.
• Rendement nominal onduleur : %, fiche fabricant ; indication 90–99,5.
• Pertes système totales : %, budget justifié, sans double comptage.
• Inclinaison : degrés ; 0 horizontal.
• Azimut : 0 nord, 90 est, 180 sud, 270 ouest.
• Type de module : 0 standard, 1 premium, 2 couche mince.
• Montage/suivi : 0 fixe ouvert, 1 toiture, 2 suivi 1 axe, 3 avec rétro-suivi, 4 deux axes.
• GCR : fraction d’occupation géométrique documentée ; indication 0,01–0,99.
• Albédo : fraction 0–1, colonne du CSV ou hypothèse constante.

Le formulaire ne choisit pas automatiquement un module ou un onduleur dans une bibliothèque. Prenez les valeurs dans les documents du matériel ou dans des choix de conception justifiés ; ne renseignez pas une valeur de convenance.

Les plages affichées sont indicatives ; le moteur applique ses contrôles. kW/kWc = puissance, kWh = énergie. Une fraction 0,75 = 75 %, mais ne se saisit pas 75 dans un champ de fraction.

## 4. PV : fichier et lancement pas à pas

En-tête exact : timestamp;ghi;dni;dhi;temp_air;wind_speed
Seule colonne supplémentaire permise : albedo. GHI global horizontal, DNI direct normal, DHI diffus horizontal : W/m². temp_air : °C ; wind_speed à 10 m : m/s.

Horodatage au début de l’heure locale standard, sans Z : 2025-01-01T00:00:00. Exemple de format, pas une année imposée. Fournissez 8 760 lignes d’une année complète, sans trou, doublon ou cellule vide. Zéro nocturne réel ≠ donnée manquante.

1. Simulations → Nouvelle simulation → Photovoltaïque (PVWatts v8).
2. Nom de la simulation : au moins 3 caractères, site/année/variante.
3. Projet rattaché : choisir celui du stockage ultérieur ; éviter Aucun projet.
4. Série météorologique horaire : charger le CSV et vérifier lignes/colonnes/erreurs.
5. Décalage UTC de l’heure standard : renseigner ; Côte d’Ivoire UTC standard = 0 si le site y est bien situé.
6. Nature et Source des séries : fournisseur/station/période/référence, même si la source n’est pas bloquante.
7. Sans colonne albedo, renseigner Albédo constant.
8. Installation : tous les champs du chapitre 3, leurs natures.
9. Lancer la simulation PV ; attendre Calcul en cours… puis relire le statut.

Export Excel : une seule feuille en CSV UTF-8, en-tête en ligne 1, sans titre ni unités ajoutées. Point-virgule conseillé ; virgule décimale acceptée avec ce séparateur. Évitez colonnes étrangères et cellules entre guillemets.

Année bissextile : le PV exige le retrait explicite du 29 février et une confirmation, sans suppression automatique. La batterie exige la continuité horaire : cet enchaînement peut être refusé. Pour commencer PV → batterie, préférez une année non bissextile.

## 5. Trouver et préparer la météo

Station : demandez les cinq grandeurs horaires, la période, les unités et la convention de temps. Une moyenne annuelle ne suffit pas. NASA POWER est disponible dans Territoires → Météo → Nouvelle fiche météo → NASA POWER : site, dates, Récupérer les données. Ce sont des données satellitaires/réanalyse sur grille, pas des mesures locales.

PVGIS/fournisseur spécialisé : obtenez les séries requises avec documentation. Le PV cite PVGIS comme source mais ne propose pas de récupération PVGIS automatique.

Bibliothèque météo : UTC avec Z, CSV ou première feuille XLSX, rayonnements W/m² ou Wh/m² déclarés, pas de colonne albedo. PV : heure locale standard sans Z, CSV seulement, W/m², albedo facultatif. Les exports ne sont donc pas directement interchangeables.

Fiche météo : renseigner site, source/référence/nature, unité rayonnement et hauteur du vent ; contrôler l’aperçu ; Enregistrer la fiche non vérifiée ; ouvrir et Valider après examen. Trou ou manque bloque la validation. Exporter CSV conserve la fiche, ce n’est pas une conversion PV.

Gardez le fichier original et documentez les transformations. Wh/m² sur exactement 1 h ÷ 1 h donne la moyenne W/m² avec égalité numérique, uniquement si la définition du fournisseur le confirme. Ne retirez pas simplement Z pour un site de fuseau différent. Faites vérifier dates, unités et période avant usage.

Sources : NASA POWER https://power.larc.nasa.gov/ ; PVGIS/JRC https://re.jrc.ec.europa.eu/pvg_tools/en/ ; PVWatts https://pvwatts.nrel.gov/ . Les fiches fabricant, mesures et références du site restent à fournir.

## 6. Batterie : préparer le stockage

Après un PV terminé rattaché au projet, préparez une fiche et une configuration de stockage du même projet. Une validation de fiche ne garantit pas qu’elle soit suffisamment complète.

Stockage par batteries → créer/ouvrir la fiche fabricant. Valeurs indispensables :
• Énergie nominale par module, kWh.
• Puissances maximales de charge et décharge par module, kW.
• Nom, fabricant, source documentaire et méthode d’acquisition.
Enregistrer la fiche, puis validation dédiée après contrôle.

Projets → votre projet → Stockage → Nouvelle configuration. Choisir Fiche technique, nombre de modules, SOC minimum/maximum, rendements séparés charge/décharge et justification. Si série/parallèle sont renseignés, leur produit doit correspondre aux modules.

Enregistrer la configuration puis Valider. Contrôlez la présence et les valeurs de l’instantané figé. Constituer l’instantané pour un ancien dossier exige examen ; ne reconstituez pas fictivement des paramètres historiques.

La capacité de référence est modules × énergie nominale. La plage accessible applique les bornes SOC : ne réduisez pas encore la capacité par le DoD. Les valeurs viennent de l’instantané et de la configuration, pas de chiffres libres inventés dans le calcul.

Le SOC minimum doit être inférieur au maximum ; rendements séparés positifs et ≤ 100 %. L’autonomie simplifiée n’est pas une garantie disponible à déduire de la capacité seule.

## 7. Batterie : demande et lancement

En-tête exact : timestamp;demand_kwh. L’énergie consommée pendant chaque heure est en kWh, pas une puissance instantanée. Les horodatages doivent être identiques à ceux du PV, caractère par caractère et dans le même ordre.

Utilisez mesures ou hypothèses explicitement identifiées. Ne répartissez pas uniformément une consommation annuelle sans justification. Le CSV d’inventaire de Demande énergétique n’est pas ce fichier.

1. Simulations → Nouvelle simulation → Batterie (réservoir + rendements).
2. Configuration projet validée et Nom de la simulation.
3. Simulation PV source : PV terminé du même projet.
4. Fichier CSV de demande : importer et renseigner nature/source.
5. SOC initial (%) entre les bornes retenues.
6. Stratégie : Auto-consommation maximale pour commencer.
7. Cocher la confirmation de même projet et sources exactes.
8. Lancer la simulation batterie, puis lire les résultats.

Le PV n’est pas recalculé ; sa production horaire enregistrée alimente le bilan. La batterie ne remplace pas une demande manquante par zéro.

Limites V1 : rendements constants, pas de vieillissement ni auto-décharge, pas de charge réseau. Réduction de pointe utilise le même pilotage que l’autoconsommation : aucune priorité horaire garantie.

Bouton désactivé : vérifier moteur, configuration, PV terminé, demande importée et confirmation. Attendez le chargement des listes ; une liste provisoirement vide ne prouve pas l’absence de données.

## 8. Lire les résultats et les conserver

Simulations → cliquer sur le nom du calcul. La page Simulations / Résultats présente statut, moteur/version, indicateurs, avertissements et Traçabilité des entrées. Batterie : instantané configuration/projet/demande.

• Énergie PV AC : kWh en sortie ; contrôler puissance, période et pertes.
• Énergie AC mensuelle : somme des heures, profil saisonnier à vérifier.
• ENS : énergie non servie, kWh ; ne pas omettre le déficit.
• Surplus : pas automatiquement une recette de vente.
• Pertes batterie : énergie dissipée dans les échanges.
• SOC du graphique : kWh stockés en fin d’heure, pas pourcentage.
• Couverture : demande servie, sur la même période.

Avant conclusion : même site/projet/période ? Unités correctes ? Sources et hypothèses conservées ? Profil plausible ? Déficits/surplus visibles ? Avertissements pris en compte ?

Validé signifie contrôle d’une donnée/configuration ; Terminé signifie calcul produit. Validé scientifiquement suppose comparaison indépendante et acceptation du domaine d’emploi par l’ingénieur. Des données synthétiques restent synthétiques.

Un total annuel ne garantit pas la couverture horaire ni l’autonomie. Ne concluez pas à un investissement sans cas réel et référence indépendante.

Conservez nom/identifiant, fichiers et sources. La page de résultats inspectée n’offre pas d’export dédié ; une impression navigateur n’est pas un rapport validé. Exporter PDF d’un projet concerne sa fiche enregistrée, pas une garantie d’export de tous les résultats horaires.

## 9. Éolien, biomasse et CSP

ÉOLIEN : Simulations → Nouvelle simulation → Éolien (A / B / C). Nom, projet, Site / jeu météo vent validé, hauteur documentée. A = analyse du vent, pas électricité. B = flux cinétique avec densité kg/m³ et surface m², pas électricité. C = turbine avec densité, moyeu/rotor m, puissance W, densité de référence et courbe.

Courbe C : modèle, source/version, conditions, 2–1 000 points vitesse m/s ; puissance W, croissants et cohérents. Hauteur moyeu = hauteur mesure ; densité = référence de courbe, sans correction automatique. Confirmer vitesses horaires, Vérifier les paramètres puis Lancer le calcul éolien. Pas de sillage, pertes supposées ou annualisation d’une courte période.

BIOMASSE : une fiche validée et une année complète, masse reçue t/an positive, PCI reçu MJ/kg positif, humidité/période/source/qualité documentées. Pas de stock forestier converti en disponibilité annuelle ni de PCI sec converti silencieusement.

Biomasse (énergie primaire) : nom/projet/fiche validée, convention d’humidité (base humide eau/masse totale ; base sèche eau/masse sèche), justification de compatibilité, confirmation. Vérifier les paramètres → Lancer le bilan primaire. Primaire recensé seulement ; mobilisation, chaleur utile et électricité indisponibles.

CSP (bilan limité) : projet, DNI horaire validé et confirmation explicite de conversion si proposée. Surface m² > 0 ; rendement optique effectif fraction > 0 ≤ 1 ; pertes W ≥ 0 ; température °C, fluide, conditions et référence. Nature/source de chaque paramètre ; Lancer le bilan CSP.

Cycle facultatif : absent = brut indisponible ; auxiliaires facultatifs : absents = net indisponible. Cylindro-parabolique prescrit seulement, pas stockage thermique ni température dynamique. Pertes/auxiliaires chaque heure, nuit incluse ; conserver bilans signés et sorties indisponibles.

## 10. Hybride, optimisation et finance

SYSTÈMES HYBRIDES → Nouvelle configuration → A · Préparation. Projet/site/demande/objectifs/période/technologies ; associer résultats individuels et sources, documenter hypothèses/contraintes ; Enregistrer la configuration. B · Comparaison : valeurs compatibles côte à côte, sans addition électricité/chaleur/primaire. C · Simulation multi-sources est indisponible ; PV + batterie est le parcours distinct des chapitres 6–7.

OPTIMISATION : configuration enregistrée → Optimisation. 1–12 calculs batterie enregistrés compatibles, même PV/demande, référence incluse ; bornes capacité et justifications, même énergie initiale utilisable, finale au moins égale à l’initiale ; plafond ENS facultatif. Enregistrer le problème → Vérifier les données → Lancer et enregistrer. Minimum ENS sur l’ensemble seulement ; pas nouveau dimensionnement ou minimum économique.

Après modification des configurations, rafraîchir/recalculer et relire références/périodes : ne pas réutiliser sans contrôle un résultat ancien. Les réserves de l’audit restent applicables.

FINANCE : Projets → projet → Finances → Renseigner/Modifier les hypothèses. Devise, CAPEX, OPEX annuel, durée, taux réel, dégradation, production année 1, remplacements et sources ; Enregistrer les hypothèses conserve un historique. Une liaison PV annuelle éligible prévaut sur une production manuelle.

Analyse financière : LCOE = coût actualisé devise/kWh, pas tarif de vente ni VAN. Le bloc Flux de trésorerie, VAN, TRI et temps de retour est à renseigner séparément : il n’a pas le même préremplissage. Production annuelle admissible ou hypothèse, parts vendue/substituée (somme ≤ 100 %), tarif/coût évité, subvention/résiduel, postes/remplacements ; Calculer les flux.

Hypothèses projet sauvegardées, flux et variantes locaux non enregistrés : conserver entrées/relevés avant départ et recalculer après modification. Monnaie constante, sans impôts ni financement ; revenus vides non inventés, TRI/retour parfois indisponibles. Ne supposez pas toute la production vendue.

## 11. Dépannage, classeur et portée

Vérification… : attendre et Revérifier la connexion. Listes vides : vérifier chargement, droits, projet et statuts. Bouton batterie grisé : moteur + config + PV + demande + confirmation. CSV refusé : en-tête exact, unités, valeurs et chronologie. Horodatages incompatibles : même fuseau/année/ordre et aucun trou. Indisponible/aucune solution : lire la raison, ne pas inventer la sortie.

Pour une aide ciblée, conserver projet/calcul, technologie, période, fichier, lignes, colonnes, unités, message exact et capture sans données sensibles. Ne jamais communiquer mot de passe, clé privée ou jeton.

CLASSEUR JOINT : Mode_emploi, Site_PV, Batterie, Autres_moteurs, Finance collectent vos valeurs et sources. Meteo_PV, Demande_Batterie, Meteo_Site ont des en-têtes exacts en ligne 1 sans données. Complétez avec vos séries puis exportez une seule feuille CSV UTF-8 ; ne chargez pas le classeur entier dans le PV.

Meteo_PV : 8 760 heures locales standard sans Z, W/m². Demande_Batterie : mêmes dates, kWh par heure. Meteo_Site : UTC avec Z et unité native déclarée. Aucun calcul ni valeur réelle n’est contenu dans le classeur.

PORTÉE : lecture du logiciel et ouverture connectée des cinq formulaires dans l’aperçu ; moteur annoncé connecté. Aucun nouveau calcul, donnée, validation, permission ou modification du logiciel. Listes batterie vues lors de leur ouverture sans preuve de fin de chargement : pas preuve d’absence de résultats. Fonctionnement publié et validité scientifique sur votre site non certifiés.

Référence : audit hybride/optimisation/économie clôturé le 16/11/2026. Ce guide ne corrige pas ses réserves. Commencez par un PV annuel documenté, vérifiez, puis ajoutez la demande et la batterie du même projet.