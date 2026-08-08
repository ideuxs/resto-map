# 🍽️ RestoHub — Votre Carnet de Route Gastronomique Premium

**RestoHub** est une application mobile élégante et performante conçue pour capturer et organiser vos découvertes culinaires. Développée avec **React Native** et **Expo**, elle offre une expérience utilisateur fluide, centrée sur le contenu et l'esthétique, permettant de transformer de simples adresses en véritables souvenirs visuels.

---

## 💎 Points Forts de l'Expérience Utilisateur

### 🎨 Design "Glassmorphism" Moderne
L'interface utilise des effets de flou translucides (via `expo-blur`) pour créer une hiérarchie visuelle profonde. Les composants semblent flotter sur le contenu, offrant un aspect premium et épuré.

### 🌗 Gestion Dynamic du Thème
- **Système Intelligent** : Détecte automatiquement la préférence système (Sombre/Clair).
- **Contrôle Manuel** : Un bouton dédié dans l'en-tête permet de basculer instantanément entre les modes sans quitter l'écran.
- **Harmonie Visuelle** : Les palettes de couleurs (curatées dans `theme.ts`) sont conçues pour minimiser la fatigue oculaire tout en restant vibrantes.

### 📸 Galerie Photo & Visionneuse
- **Gestion Locale** : Vos images sont stockées dans le système de fichiers sécurisé de l'application (pas de dépendance au cloud).
- **Format Plein Écran** : Une visionneuse fluide avec indicateur de position pour admirer vos plats en haute résolution.

---

## 🚀 Fonctionnalités Détaillées

### 1. Gestion des Restaurants
- **Saisie Intuitive** : Formulaire optimisé pour une saisie rapide (Catégorie, Prix, Adresse).
- **Géolocalisation** : Intégration optionnelle de `expo-location` pour capturer précisément où vous vous trouvez.
- **Catégorisation** : 30+ catégories prédéfinies avec icônes et couleurs dédiées.

### 2. Organisation par Collections
- Créez des listes thématiques personnalisées (ex: "Meilleurs Tacos", "Végétarien 2024").
- Déplacez facilement un restaurant d'une collection à l'autre.
- Interface dédiée pour visualiser le contenu d'une collection spécifique.

### 3. Carte Interactive
- Clusterisation visuelle simplifiée via des pins colorés selon la catégorie.
- Aperçu rapide du restaurant directement depuis la carte.
- Navigation fluide d'un point à un autre.

---

## 🛠️ Architecture Technique & Choix de Conception

### Stockage des Données & Images
- **Data** : Utilisation de `AsyncStorage` pour une persistance rapide et fiable des données JSON.
- **Images** : Les photos prises ou sélectionnées sont copiées dans le dossier `Documents` de l'application via `expo-file-system`. Cela garantit que les images restent accessibles même si l'original est supprimé de la pellicule du téléphone.
- **ImageStorage Utility** : Une couche d'abstraction gère les noms de fichiers uniques (UUID) et le nettoyage automatique des fichiers orphelins.

### Système de Design (Atomic CSS-in-JS)
Le projet utilise un système de jetons (tokens) centralisé dans `src/constants/theme.ts` :
- **Spacing** : Multiples de 4/8 pour une grille cohérente.
- **BorderRadius** : Arrondis généreux pour un aspect moderne et doux.
- **Shadows** : Ombres portées multi-couches pour un effet de profondeur réel.

---

## 📂 Structure du Code Source

```text
RestoHub/
├── src/
│   ├── components/
│   │   ├── RestaurantCard.tsx    # Card principale avec BlurView et Glass panel
│   │   ├── CollectionFormModal.tsx # Création/Édition de collections
│   │   └── EmptyState.tsx        # États vides élégants avec icônes
│   ├── constants/
│   │   ├── theme.ts             # Source de vérité pour les couleurs et styles
│   │   └── categories.ts        # Librairie des 30+ types de restaurants
│   ├── screens/
│   │   ├── RestaurantList.tsx    # Écran principal avec Header Sticky Compact
│   │   ├── RestaurantDetail.tsx  # Galerie, actions et description
│   │   ├── AddRestaurant.tsx     # Formulaire de création hybride
│   │   └── MapScreen.tsx         # Intégration React Native Maps
│   ├── storage/
│   │   ├── storage.ts           # CRUD AsyncStorage
│   │   └── imageStorage.ts      # Gestion Filesystem des photos
│   ├── theme/
│   │   └── ThemeProvider.tsx    # Hook useTheme et logique Dark Mode
│   └── types/
│       └── index.ts             # Interfaces TypeScript partagées
```

---

## 🔧 Installation & Contribution

1. **Préparation** :
   ```bash
   git clone git@github.com:ismahamat/RestoHub.git
   cd RestoHub
   npm install
   ```

2. **Lancement** :
   ```bash
   npx expo start
   ```

3. **Ajouter une Catégorie** :
   Modifiez simplement `src/constants/categories.ts` pour ajouter un nouveau type avec son icône Lucide et sa couleur.

---

## 📜 Licence & Crédits
- Icônes : [Lucide](https://lucide.dev/)
- Typographie : [Inter (Google Fonts)](https://fonts.google.com/specimen/Inter)
- Développé par **Issa Mahamat**.

---

*Bon appétit et bonne découverte !*
