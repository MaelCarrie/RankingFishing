// ─── Captures mock supplémentaires (pagination du feed, issue #18) ──────────
//
// Captures plus anciennes (25 à 80 jours) pour que l'infinite scroll ait
// plusieurs pages à charger en mode mock. Elles s'ajoutent à
// MOCK_FEED_CAPTURES (src/api/mock/data.ts, possédé par un autre agent).

import { Capture, WeatherCondition } from '../../store/types';
import { FISH_SPECIES, calculateCaptureScore } from '../../config/constants';
import { MOCK_ALL_USERS } from './data';

const DAY = 24 * 3600000;

const SEEDS: {
  userId: string;
  speciesId: string;
  weightGrams: number;
  sizeCm: number;
  daysAgo: number;
  weather: WeatherCondition;
  description: string;
  likes: number;
}[] = [
  { userId: 'user_2', speciesId: 'catfish', weightGrams: 41000, sizeCm: 172, daysAgo: 25, weather: 'cloudy', likes: 96, description: 'Silure de fin de journée sur le Rhône, au clonk.' },
  { userId: 'user_3', speciesId: 'pike', weightGrams: 6100, sizeCm: 86, daysAgo: 28, weather: 'windy', likes: 48, description: 'Brochet au jerkbait, coup de vent idéal.' },
  { userId: 'user_5', speciesId: 'brown_trout', weightGrams: 1350, sizeCm: 47, daysAgo: 31, weather: 'sunny', likes: 39, description: 'Fario de torrent en nymphe au fil.' },
  { userId: 'user_8', speciesId: 'zander', weightGrams: 5200, sizeCm: 78, daysAgo: 34, weather: 'foggy', likes: 57, description: 'Sandre en verticale, petit matin brumeux.' },
  { userId: 'user_12', speciesId: 'sea_bass', weightGrams: 3900, sizeCm: 69, daysAgo: 37, weather: 'windy', likes: 71, description: 'Bar au leurre de surface dans le ressac.' },
  { userId: 'user_4', speciesId: 'carp', weightGrams: 21500, sizeCm: 104, daysAgo: 41, weather: 'rainy', likes: 88, description: 'Miroir sous la pluie, session de 48 h.' },
  { userId: 'user_6', speciesId: 'perch', weightGrams: 980, sizeCm: 41, daysAgo: 45, weather: 'cloudy', likes: 22, description: 'Grosse perche au drop-shot.' },
  { userId: 'user_9', speciesId: 'eel', weightGrams: 1600, sizeCm: 88, daysAgo: 49, weather: 'stormy', likes: 17, description: 'Anguille de nuit avant l\'orage.' },
  { userId: 'user_10', speciesId: 'tench', weightGrams: 2300, sizeCm: 52, daysAgo: 54, weather: 'sunny', likes: 26, description: 'Tanche au coup, flotteur qui file.' },
  { userId: 'user_11', speciesId: 'black_bass', weightGrams: 2100, sizeCm: 49, daysAgo: 60, weather: 'sunny', likes: 44, description: 'Black-bass au texas rig dans les herbiers.' },
  { userId: 'user_7', speciesId: 'asp', weightGrams: 4400, sizeCm: 74, daysAgo: 67, weather: 'cloudy', likes: 33, description: 'Aspe en chasse, lancé au jig minnow.' },
  { userId: 'user_2', speciesId: 'salmon', weightGrams: 8700, sizeCm: 92, daysAgo: 80, weather: 'rainy', likes: 120, description: 'Saumon de printemps, relâché.' },
];

export const MOCK_EXTRA_FEED_CAPTURES: Capture[] = SEEDS.flatMap((s, i) => {
  const user = MOCK_ALL_USERS.find((u) => u.id === s.userId);
  const species = FISH_SPECIES.find((sp) => sp.id === s.speciesId);
  if (!user || !species) return [];
  const id = `cap_extra_${i + 1}`;
  const publishedAt = new Date(Date.now() - s.daysAgo * DAY).toISOString();
  return [{
    id,
    userId: user.id,
    username: user.username,
    userAvatar: user.avatar,
    species,
    weightGrams: s.weightGrams,
    sizeCm: s.sizeCm,
    photos: [`https://picsum.photos/seed/${id}/800/600`],
    description: s.description,
    weather: s.weather,
    publishedAt,
    caughtAt: publishedAt,
    isDraft: false,
    validationScore: 80,
    score: calculateCaptureScore(s.weightGrams, species),
    likes: s.likes,
    comments: 0,
    isLiked: false,
  }];
});
