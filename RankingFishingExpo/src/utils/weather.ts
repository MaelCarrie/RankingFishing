import { Ionicons } from '@expo/vector-icons';
import { WeatherCondition } from '../store/types';

// Libellés et icônes météo sans emoji (les emojis de WEATHER_LABELS restent
// dans constants.ts pour les écrans qui les utilisent encore).
export const WEATHER_META: Record<WeatherCondition, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  sunny: { label: 'Ensoleillé', icon: 'sunny-outline' },
  cloudy: { label: 'Nuageux', icon: 'cloudy-outline' },
  rainy: { label: 'Pluvieux', icon: 'rainy-outline' },
  windy: { label: 'Venteux', icon: 'flag-outline' },
  stormy: { label: 'Orageux', icon: 'thunderstorm-outline' },
  foggy: { label: 'Brumeux', icon: 'reorder-three-outline' },
};

export const WEATHER_ORDER: WeatherCondition[] = ['sunny', 'cloudy', 'rainy', 'windy', 'stormy', 'foggy'];
