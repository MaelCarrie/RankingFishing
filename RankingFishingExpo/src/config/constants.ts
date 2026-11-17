import { FishSpecies, FishingType } from '../store/types';

export const APP_NAME = 'RankingFishing';
export const APP_VERSION = '1.0.0';

// XP thresholds pour chaque niveau
export const LEVEL_THRESHOLDS = [
  { level: 1, xp: 0, name: 'Novice' },
  { level: 2, xp: 200, name: 'Apprenti pêcheur' },
  { level: 3, xp: 500, name: 'Amateur' },
  { level: 4, xp: 1000, name: 'Confirmé' },
  { level: 5, xp: 2000, name: 'Expert' },
  { level: 6, xp: 4000, name: 'Maître pêcheur' },
  { level: 7, xp: 8000, name: 'Légende' },
];

// Liste des espèces de poissons
export const FISH_SPECIES: FishSpecies[] = [
  { id: 'carp', name: 'Carp', nameFr: 'Carpe', category: 'freshwater', icon: '🐟', scoreCoefficient: 1.0, rarityScore: 5 },
  { id: 'pike', name: 'Pike', nameFr: 'Brochet', category: 'freshwater', icon: '🐠', scoreCoefficient: 2.0, rarityScore: 10 },
  { id: 'zander', name: 'Zander', nameFr: 'Sandre', category: 'freshwater', icon: '🐡', scoreCoefficient: 2.5, rarityScore: 12 },
  { id: 'catfish', name: 'Catfish', nameFr: 'Silure', category: 'freshwater', icon: '🦈', scoreCoefficient: 0.5, rarityScore: 6 },
  { id: 'brown_trout', name: 'Brown Trout', nameFr: 'Truite fario', category: 'freshwater', icon: '🎣', scoreCoefficient: 3.0, rarityScore: 15 },
  { id: 'rainbow_trout', name: 'Rainbow Trout', nameFr: 'Truite arc-en-ciel', category: 'freshwater', icon: '🎣', scoreCoefficient: 2.5, rarityScore: 10 },
  { id: 'perch', name: 'Perch', nameFr: 'Perche', category: 'freshwater', icon: '🐟', scoreCoefficient: 1.5, rarityScore: 4 },
  { id: 'black_bass', name: 'Black Bass', nameFr: 'Black-bass', category: 'freshwater', icon: '🐠', scoreCoefficient: 2.0, rarityScore: 12 },
  { id: 'sea_bass', name: 'Sea Bass', nameFr: 'Bar', category: 'saltwater', icon: '🐡', scoreCoefficient: 2.0, rarityScore: 14 },
  { id: 'sea_bream', name: 'Sea Bream', nameFr: 'Dorade', category: 'saltwater', icon: '🐟', scoreCoefficient: 1.8, rarityScore: 12 },
  { id: 'tench', name: 'Tench', nameFr: 'Tanche', category: 'freshwater', icon: '🐟', scoreCoefficient: 1.2, rarityScore: 6 },
  { id: 'roach', name: 'Roach', nameFr: 'Gardon', category: 'freshwater', icon: '🐟', scoreCoefficient: 0.8, rarityScore: 2 },
  { id: 'eel', name: 'Eel', nameFr: 'Anguille', category: 'migratory', icon: '🐍', scoreCoefficient: 1.5, rarityScore: 10 },
  { id: 'salmon', name: 'Salmon', nameFr: 'Saumon', category: 'migratory', icon: '🐟', scoreCoefficient: 4.0, rarityScore: 20 },
  { id: 'asp', name: 'Asp', nameFr: 'Aspe', category: 'freshwater', icon: '🐠', scoreCoefficient: 2.2, rarityScore: 16 },
];

// Régions françaises (valeur normalisée pour les classements régionaux)
export const FR_REGIONS = [
  'Auvergne-Rhône-Alpes',
  'Bourgogne-Franche-Comté',
  'Bretagne',
  'Centre-Val de Loire',
  'Corse',
  'Grand Est',
  'Hauts-de-France',
  'Île-de-France',
  'Normandie',
  'Nouvelle-Aquitaine',
  'Occitanie',
  'Pays de la Loire',
  "Provence-Alpes-Côte d'Azur",
  'Guadeloupe',
  'Martinique',
  'Guyane',
  'La Réunion',
  'Mayotte',
] as const;

export type FrRegion = (typeof FR_REGIONS)[number];

// Labels des types de pêche
export const FISHING_TYPE_LABELS: Record<FishingType, string> = {
  carp: 'Carpiste',
  predators: 'Pêcheur de carnassiers',
  sea: 'Pêcheur en mer',
  trout: 'Truiteur',
  catfish: 'Siluriste',
  coarse: 'Pêche au coup',
  streetfishing: 'Street fishing',
  fly: 'Pêche à la mouche',
};

// Labels météo
export const WEATHER_LABELS = {
  sunny: '☀️ Ensoleillé',
  cloudy: '☁️ Nuageux',
  rainy: '🌧️ Pluvieux',
  windy: '💨 Venteux',
  stormy: '⛈️ Orageux',
  foggy: '🌫️ Brumeux',
};

// Limites
export const MAX_PHOTOS_PER_CAPTURE = 5;
export const MAX_PHOTO_SIZE_MB = 10;
export const MAX_GROUP_SIZE = 100;
export const FREE_CHAT_HISTORY_DAYS = 30;

// Calcul de score
export function calculateCaptureScore(weightGrams: number, species: FishSpecies): number {
  const weightKg = weightGrams / 1000;
  const baseScore = weightKg * species.scoreCoefficient;
  const rarityBonus = species.rarityScore;
  return Math.round(baseScore * 10 + rarityBonus);
}

// Calcul du niveau depuis les XP
export function getLevelFromXP(xp: number): { level: number; name: string; nextXp: number; progress: number } {
  let current = LEVEL_THRESHOLDS[0];
  let next = LEVEL_THRESHOLDS[1];

  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i].xp) {
      current = LEVEL_THRESHOLDS[i];
      next = LEVEL_THRESHOLDS[i + 1] ?? LEVEL_THRESHOLDS[i];
      break;
    }
  }

  const progress = next.xp === current.xp
    ? 100
    : Math.round(((xp - current.xp) / (next.xp - current.xp)) * 100);

  return { level: current.level, name: current.name, nextXp: next.xp, progress };
}
