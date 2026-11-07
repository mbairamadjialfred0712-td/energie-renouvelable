# VALIDATION — MODULE D'IMPORTATION DES DOCUMENTS (PROMPT 20)

Date : 06/11/2026. Périmètre : importation de rapports et documents techniques externes.

## 1. État initial constaté (audit)

- La page `/imports` était un gabarit statique sans upload réel ; la page `/reports` reste un gabarit distinct (rapports générés par la plateforme).
- La table `imported_files` et le bucket privé `project-imports` existaient avec politiques RLS (propriétaire + administrateur ; dossier de stockage par utilisateur), mais aucun code applicatif ne les utilisait.
- Imports spécialisés déjà opérationnels et non dupliqués : territoires CSV/XLSX (`/geography/import`, prévisualisation + validation humaine), météo horaire CSV/XLSX et NASA POWER (module météo).

## 2. Fonctionnalités implémentées

- Dépôt par glisser-déposer ou sélection, avec barre de progression réelle (XHR), annulation avant la fin de l'envoi, indication des formats et de la taille maximale.
- Stockage privé dans `project-imports/<uid>/`, jamais public ; enregistrement serveur qui revérifie format, taille et appartenance du chemin.
- Classification en 14 catégories, association facultative à un projet et une localité (vérifiés côté serveur sous RLS).
- Extraction déterministe : tableaux CSV/XLSX (en-têtes + lignes, bornés), texte PDF (pdfjs-dist) et DOCX (mammoth), signal explicite « OCR nécessaire » pour les documents scannés, troncature signalée.
- Prévisualisation du document original par lien signé de 5 minutes (visionneuse PDF intégrée).
- Corrections humaines : valeurs relues avec libellé, valeur, unité telle qu'écrite et provenance (page/tableau).
- Trois statuts métier : Importé → Extraction à vérifier → Validé (plus Rejeté). Validation/rejet réservés aux ingénieurs et administrateurs, vérifiés côté serveur ; la validation exige une extraction ou des corrections.
- Historique complet : table `imported_file_history` alimentée par trigger (création, modifications, changements de statut).
- Filtres par catégorie, statut et recherche ; bouton Retour du détail conservant les filtres.

## 3. Formats réellement pris en charge

| Format | Dépôt | Extraction |
| --- | --- | --- |
| PDF | Oui | Texte natif (pdfjs-dist) ; scannés signalés « OCR nécessaire » |
| XLSX | Oui | Première feuille, 500 premières lignes, 100 colonnes max |
| CSV / TXT | Oui | Séparateur `;` ou `,` détecté, UTF-8 |
| DOCX | Oui | Texte brut (mammoth) |
| XLS (ancien) | Non | Refusé : réenregistrer en .xlsx |

Taille maximale : 20 Mo. Aucun fichier n'est exécuté ; seuls le texte et les cellules sont lus.

## 4. Limites de l'extraction

- Aucune valeur énergétique n'est devinée : l'extraction restitue le contenu lu ; la structuration (GHI, PCI, CAPEX…) reste une saisie humaine dans « Valeurs relues ».
- PDF scannés : pas d'OCR intégré ; le besoin est signalé.
- Tableaux PDF complexes : restitués comme texte, pas comme cellules.
- Les tests sur fichiers synthétiques ne valident pas la qualité d'extraction sur des rapports réels.

## 5. Règles de validation et d'intégration

- Aucune donnée extraite n'est validée automatiquement ; aucune simulation ni analyse financière n'est déclenchée par un import.
- L'intégration aux modules (ressources, demande, finance) reste manuelle : les valeurs relues et validées servent de référence traçable lors de la saisie dans les fiches existantes. L'intégration automatique avec contrôle de doublons n'est pas implémentée.
- Un document validé ne peut plus être modifié ni supprimé que par un ingénieur/administrateur.

## 6. Sécurité et permissions

- Bucket privé, politiques de stockage par dossier utilisateur ; liens signés de 5 minutes.
- Table `imported_files` : RLS propriétaire + administrateur ; grants existants conservés.
- Contrôles serveur sur chaque fonction : format, taille, chemin de stockage, existence des associations, rôles pour la validation.
- Aucun secret dans le navigateur ; le dépôt utilise le jeton de session de l'utilisateur.

## 7. Tables et migrations

- Migration `0024_imported_files_category_history.sql` (additive) : colonnes `category` (avec liste contrôlée) et `locality_id` sur `imported_files` ; table `imported_file_history` + trigger `record_imported_file_history`. Aucune migration destructive.

## 8. Tests exécutés

- Tests unitaires du modèle d'importation (détection de formats, limites, statuts, formes d'extraction, corrections, chemins de stockage).
- Suite TypeScript complète et build : voir le rapport final de l'étape.
- Vérification navigateur sous le compte administrateur : dépôt CSV réel, extraction, correction, validation, historique, filtres et retour.

## 9. Non implémenté / restant à valider avec M. Joël

- OCR des documents scannés.
- Extraction assistée par IA des champs énergétiques (proposition structurée) — non activée pour ne jamais présenter une valeur devinée comme lue.
- Intégration automatique des valeurs validées dans les fiches ressources/demande/finance avec détection de doublons.
- Isolation entre deux comptes QA (en attente d'une paire de comptes autorisés) et contrôle de la version publiée.
- Validation de la qualité d'extraction sur des rapports réels fournis par l'utilisateur.
