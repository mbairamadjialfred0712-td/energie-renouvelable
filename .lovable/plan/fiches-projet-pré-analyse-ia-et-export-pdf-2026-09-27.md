# Fiches projet, pré-analyse IA et export PDF

## Objectif
Créer un véritable dossier de projet énergétique : saisie structurée, séparation explicite entre données fournies et hypothèses, pré-analyse IA lancée à la demande, historique complet et export PDF vérifiable.

## Fonctionnalités
- Remplacer la page générique « Projets » par une liste réelle des projets enregistrés et un parcours de création.
- Ajouter une fiche projet détaillée organisée en sections : identité, territoire, demande, ressources, technologies, économie, sources et hypothèses.
- Pour chaque valeur scientifique, enregistrer la valeur, l’unité, sa nature (donnée fournie ou hypothèse), la source, la période et une note de qualité.
- Enregistrer chaque création et modification dans un historique immuable indiquant la date, l’auteur, l’action et les changements.
- Ajouter un bouton « Lancer la pré-analyse » : le modèle examine uniquement l’instantané sauvegardé et retourne trois listes distinctes — informations manquantes, hypothèses déclarées et points à vérifier — sans calculer ni inventer de résultat énergétique ou financier.
- Conserver chaque pré-analyse avec le modèle, la date, l’instantané analysé et son statut, afin qu’une nouvelle analyse ne remplace jamais silencieusement la précédente.
- Ajouter un export PDF de la fiche contenant les données et unités, les hypothèses, les sources, la dernière pré-analyse et l’historique des modifications.

## Sécurité et fiabilité
- Protéger toutes les lectures et écritures par l’identité de l’utilisateur et les règles d’accès existantes.
- Garder l’appel AI Gateway et ses instructions côté serveur, avec le modèle `openai/gpt-6-astra` et la configuration Responses requise.
- Ne lancer aucune analyse automatiquement ; une action explicite de l’utilisateur est obligatoire.
- Afficher les messages sûrs retournés par AI Gateway, sans relance automatique des erreurs permanentes.
- Générer le PDF à partir des données effectivement enregistrées, sans contenu de démonstration ni calcul caché.

## Technique
- Étendre la base avec des tables dédiées aux champs structurés, versions de pré-analyse et événements d’historique, avec permissions et règles d’accès complètes.
- Ajouter des fonctions serveur authentifiées pour lister, créer, modifier, analyser et charger le dossier exportable.
- Utiliser une sortie JSON stricte et validée pour la pré-analyse ; conserver le texte de justification et les références aux champs concernés.
- Générer le PDF dans le navigateur à partir du dossier chargé, pour éviter les dépendances incompatibles avec l’environnement serveur.
- Ajouter les pages `/projects/new` et `/projects/$id`, puis vérifier le parcours authentifié complet, le PDF et un appel AI Gateway réel.
