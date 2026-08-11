# RestoHub — interface de référence

RestoHub est un carnet de bonnes adresses personnel qui peut accueillir les listes partagées par des amis. L’interface doit donner envie d’enregistrer, puis permettre de retrouver une adresse en quelques secondes.

## Direction artistique (globale)

- Neo-brutalisme / zine / rétro-moderne punk : aplats de papier lavande, encre bleu nuit, rose acide et violet. Les cartes sont des blocs francs, parfois légèrement décalés, avec une ombre dure sans flou.
- L’iconographie utilise UIcons Rounded de Flaticon pour l’interface, avec des illustrations locales choisies pour les catégories Sushi, Kebab et Asiatique.
- Le grain, les demi-teintes et les effets “sticker” sont des accents ponctuels, pas une texture répétée derrière chaque élément.
- Le mode clair reste papier + encre, le mode sombre prune profond + lavande clair : aucun écran ne mélange un texte sombre sur une surface sombre ou l’inverse.
- L’indigo porte les actions, le rose vif signe la marque et le lavande structure les états secondaires.
- Le rose lisible dédié aux amis est distinct du rose signature. Vert, ambre et rouge restent exclusivement sémantiques.
- Les surfaces regroupent l’information : une section blanche/légèrement contrastée, arrondie et aérée vaut mieux qu’une succession de dividers. Une carte porte une action claire et ne contient pas d’autre carte.
- UIcons Rounded uniquement pour les icônes. Pas d’emoji structurel.
- Le flou est réservé aux surfaces de navigation et aux panneaux posés sur la carte, où il sert à laisser deviner le contenu sous-jacent sans ajouter de bordures décoratives.

## Couleurs

| Token | Clair | Sombre | Usage |
|---|---|---|---|
| `background` | `#F5EFF7` | `#100D18` | Toile de l’application |
| `surface` | `#FFFFFF` | `#1B1426` | Surface de contenu |
| `surfaceMuted` | `#E9DDF0` | `#2B2140` | Contrôle secondaire / emplacement d’image |
| `primary` / `accent` | `#292C90` | `#9A9FF4` | Action principale, lien et focus |
| `accentPink` | `#FF007F` | `#FF3BA4` | Signature, illustration et marqueur |
| `friendText` | `#A60062` | `#FF8BCB` | Texte et provenance d’une liste amie |
| `lavender` | `#7C4C9B` | `#C9A5DF` | Accent secondaire et sélection douce |
| `textPrimary` | `#17121E` | `#FAF8FB` | Texte principal |
| `textSecondary` | `#51485A` | `#D4C9DC` | Texte secondaire |
| `textMuted` | `#6E6575` | `#A99DB2` | Métadonnées |
| `border` | `#17121E` | `#F8F3FF` | Contour franc / focus |

Les huit couleurs de source sont désignées par une clé stable (`rose`, `magenta`, `plum`, `violet`, `grape`, `indigo`, `iris`, `orchid`) puis résolues selon le thème. Un ami conserve ainsi la même identité en clair et en sombre sans persister une hexadécimale. La couleur ne porte jamais seule l’information : le nom de l’ami et le libellé « Partagée par … » restent visibles.

## Typographie et rythme

- Inter Regular pour le texte courant.
- Inter Medium pour les informations secondaires.
- Inter SemiBold pour les titres, actions et noms de lieux.
- Échelle : 12 / 14 / 16 / 19 / 23 / 28 / 32 px.
- Rythme 4/8 px : espacements usuels 8, 12, 16, 20, 24, 32, 40.
- Zone tactile minimale : 44 × 44 px.

## Navigation

La navigation principale est le host natif `NativeTabs` d’Expo Router, avec quatre entrées iOS glass : Restos, Carte, Listes et Paramètres. Le material blur système est piloté par `blurEffect` et les safe areas sont gérées par le composant natif. Les écrans internes utilisent un top bar simple avec retour, titre et une action maximum.

Les listes racines partagent un header responsive : titre et bouton `+` icon-only de 44 pt sur la première ligne, sous-titre sur une ligne séparée. Le bouton ne doit jamais compresser ou couper le titre. Le réglage d’apparence n’est pas une action de header.

## Écrans

### Restos

Le haut de l’écran donne le nombre d’adresses, la moyenne et la part provenant d’amis. La recherche est toujours visible. Les filtres de source sont courts (`Tout`, `Mes adresses`, `Listes d’amis`) ; les filtres avancés sont dans une feuille dédiée. Les adresses importées ont une ligne source et un marqueur dédié, sans rail coloré ni changement de structure. Lorsque le carnet est vide, le CTA central remplace le `+` du header afin de ne pas dupliquer l’action.

Les filtres avancés restent compacts : les catégories, budgets et tris défilent horizontalement; les préférences sont des lignes à cocher. La feuille n’affiche pas une mosaïque de boutons et garde son action principale au-dessus de la safe area.

Les mini-fiches sont des surfaces éditoriales arrondies, avec illustration de catégorie si aucune photo n’existe, provenance explicite, adresse, note/budget et état de géolocalisation. Elles n’utilisent pas de rail coloré : la source est portée par l’icône, le nom de l’ami et sa couleur dédiée.

### Carte

Une adresse sans position n’apparaît pas. Les marqueurs personnels utilisent la couleur de catégorie ; les marqueurs importés utilisent la couleur de la source. Un clic ouvre une mini-fiche flottante en liquid glass dans la carte, sans callout système concurrent. Le bouton de localisation reste toujours au-dessus de cette fiche.

La mini-fiche affiche deux temps indicatifs (voiture/transports) et, quand l’API de navigation renvoie une géométrie, le tracé entre la position de l’utilisateur et le lieu. Une indisponibilité réseau laisse la fiche utilisable et propose l’ouverture de la fiche complète ou d’Apple Plans.

### Listes

Les listes personnelles et importées sont séparées par deux carrousels horizontaux de cartes légèrement compactes, avec un aperçu de la carte suivante pour rendre le défilement évident. Les listes personnelles portent une hiérarchie de collection ; les listes importées montrent directement « Partagée par [prénom] », le nombre d’adresses, la date d’import et le bouton œil pour l’afficher ou la masquer dans Restos et Carte. Chaque liste peut avoir une couverture locale, avec l’icône comme solution de repli. Masquer une liste ne supprime aucune donnée. Supprimer une liste importée retire ses restaurants importés, tandis que supprimer une liste personnelle laisse les restaurants intacts. Les outils (« Doublons à vérifier », « Apparence ») sont regroupés dans une surface unique, sans rails ni lignes répétées. Les réglages complets sont dans l’onglet Paramètres ; le choix `Système` / `Clair` / `Sombre` reste accessible depuis Listes.

### Fiche lieu et photos

La fiche complète utilise des blocs autonomes (provenance, résumé, journal, détails) avec des espacements et des fonds contrastés plutôt que des séparateurs continus. « À propos », « Plat à retenir » et les tags vivent dans une seule surface, avec les titres empilés et le titre `Tags` placé sous les autres contenus. Une photo se touche pour ouvrir une galerie plein écran paginée; le compteur indique la position dans la série. Les visites privées restent lisibles comme des entrées de journal, sans être exposées dans un partage.

Le sélecteur « Ajouter à mes listes » reprend la toile lavande, l’accent rose et les ombres dures de la marque : un bandeau de sélection résume l’état, les listes sont de grandes cartes tactiles et l’enregistrement automatique est confirmé près du CTA.

### Ajouter un lieu

Deux étapes seulement :

1. **Essentiel** — nom, type, adresse ou position.
2. **Détails facultatifs** — note, envie d’y retourner, plat, date, budget, photos, description et tags.

Le bouton d’action est fixe au-dessus de la safe area. Si aucune photo n’est ajoutée, l’écran montre une illustration de catégorie et les initiales du lieu : aucun emplacement vide.

## États importants

- Import en cours : confirmation courte, puis la liste arrive dans “Listes importées”.
- Liste amie masquée : œil fermé dans Listes, absence des adresses dans Restos et Carte.
- Pas de photo : bloc de catégorie coloré, icône de catégorie et initiales.
- Aucun résultat : message court + action de récupération explicite.
- Erreur de formulaire : cause et format attendu dans une alerte proche de l’action.

## À éviter

- Cartes dans des cartes, gros panneaux flottants, ombres fortes et gradients.
- Titres marketing ou paragraphes décoratifs dans les écrans internes.
- Séries de badges et de pills sans fonction.
- Emoji comme icône.
- Orange primaire, blanc brillant et mode sombre noir pur.
