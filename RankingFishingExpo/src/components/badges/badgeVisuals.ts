import { Ionicons } from '@expo/vector-icons';
import { Badge, BadgeTier, BadgeCategory } from '../../store/types';
import { formatRank } from '../../utils/formatting';

type IconName = keyof typeof Ionicons.glyphMap;

// Teintes par palier : `fg` lisible sur fond clair (icône, texte), `bg` pastille.
export const TIER_TONES: Record<BadgeTier, { fg: string; bg: string; ring: string; label: string }> = {
  bronze: { fg: '#8A5220', bg: '#F6E8DA', ring: '#CD7F32', label: 'Bronze' },
  silver: { fg: '#55636D', bg: '#ECEFF1', ring: '#A7B1B8', label: 'Argent' },
  gold: { fg: '#8D6A00', bg: '#FFF4C7', ring: '#E0B400', label: 'Or' },
  platinum: { fg: '#2F6F68', bg: '#DDF3F0', ring: '#7CC8BE', label: 'Platine' },
};

export const CATEGORY_META: Record<BadgeCategory, { label: string; icon: IconName }> = {
  progression: { label: 'Progression', icon: 'trending-up-outline' },
  excellence: { label: 'Excellence', icon: 'trophy-outline' },
  community: { label: 'Communauté', icon: 'people-outline' },
  seasonal: { label: 'Saisonnier', icon: 'leaf-outline' },
};

const ICON_BY_ID: Record<string, IconName> = {
  badge_first_catch: 'fish',
  badge_10_catches: 'ribbon',
  badge_50_catches: 'medal',
  badge_100_catches: 'trophy',
  badge_big_carp: 'barbell',
  badge_big_pike: 'flash',
  badge_top100: 'globe',
  badge_validator: 'checkmark-done',
  badge_spring: 'flower',
};

const ICON_BY_METRIC: Record<string, IconName> = {
  total_captures: 'fish',
  species_weight: 'barbell',
  global_rank: 'globe',
  validations: 'checkmark-done',
  seasonal_captures: 'flower',
};

export function badgeIconName(badge: Pick<Badge, 'id' | 'metric'>): IconName {
  return ICON_BY_ID[badge.id] ?? (badge.metric ? ICON_BY_METRIC[badge.metric] : undefined) ?? 'ribbon';
}

function kg(grams: number): string {
  const v = Math.round(grams / 100) / 10;
  return v.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
}

function int(n: number): string {
  return n.toLocaleString('fr-FR');
}

/**
 * Texte de progression lisible : « 47 / 50 captures », « 5,6 / 8 kg »,
 * « Rang actuel : 342e ». Retourne null si la valeur brute est inconnue.
 */
export function badgeProgressLabel(badge: Badge): string | null {
  const target = badge.targetValue;
  const cur = badge.currentValue;
  if (target === undefined || badge.metric === undefined) return null;

  switch (badge.metric) {
    case 'global_rank':
      if (cur === null || cur === undefined || cur <= 0) return 'Pas encore classé';
      return `Rang actuel : ${formatRank(cur)}`;
    case 'species_weight':
      if (cur === null || cur === undefined) return null;
      return cur > 0 ? `Record : ${kg(cur)} / ${kg(target)} kg` : `Aucune prise · objectif ${kg(target)} kg`;
    case 'total_captures':
      if (cur === null || cur === undefined) return null;
      return `${int(Math.min(cur, target))} / ${int(target)} captures`;
    case 'seasonal_captures':
      if (cur === null || cur === undefined) return null;
      return `${int(Math.min(cur, target))} / ${int(target)} au printemps`;
    case 'validations':
      if (cur === null || cur === undefined) return null;
      return `${int(Math.min(cur, target))} / ${int(target)} validations`;
    default:
      return null;
  }
}
