# Fondation V1 de la plateforme énergétique

## Produit livré
- Une application professionnelle en français avec connexion, inscription et récupération de mot de passe.
- Un espace protégé avec navigation complète, profils utilisateurs et quatre rôles sécurisés : administrateur, ingénieur, analyste et lecteur.
- Un tableau de bord qui ne montre que les données réellement enregistrées et présente des états vides lorsque nécessaire.
- Les espaces Territoires, Ressources, Demande, Technologies, Simulations, Scénarios, Finance, Projets, Imports, Rapports et Paramètres.

## Données et sécurité
- Créer les tables relationnelles demandées avec identifiants UUID, relations, contraintes, dates et index utiles.
- Conserver les rôles dans une table dédiée, distincte des profils, et appliquer les permissions côté serveur et base de données.
- Isoler les données par propriétaire et permettre les accès partagés uniquement selon les rôles autorisés.
- Préparer le stockage privé des fichiers importés et la validation humaine avant utilisation.

## Architecture scientifique
- Définir des contrats typés pour les entrées, hypothèses, unités, sources et résultats.
- Préparer les modules PV, éolien, biomasse, CSP, batterie, hybride, scénarios, optimisation, finance et validation.
- Ne livrer aucune formule ni aucun résultat scientifique fictif dans cette V1.

## Interface
- Utiliser l’identité visuelle du logo : bleu nuit, gris technique, vert énergie et accent jaune mesuré.
- Concevoir une interface dense, lisible et adaptée aux ingénieurs, avec tableaux, formulaires, filtres et statuts.
- Garantir une utilisation confortable sur ordinateur, tablette et mobile.

## Vérification
- Vérifier l’inscription, la connexion, la récupération du mot de passe, la déconnexion et les accès protégés.
- Vérifier la création et la lecture des principales données avec un utilisateur connecté.
- Vérifier l’absence de données inventées, les états vides, les erreurs et les principaux formats d’écran.
