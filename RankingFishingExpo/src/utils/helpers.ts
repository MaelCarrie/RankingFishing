import { LEVEL_THRESHOLDS } from '../config/constants';

// Délai simulé pour le mock API
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Génère un ID unique
export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Calcule le niveau et le nom à partir des XP
export function getLevelInfo(xp: number): { level: number; name: string; nextXp: number; progress: number } {
  let currentIndex = 0;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i].xp) {
      currentIndex = i;
      break;
    }
  }

  const current = LEVEL_THRESHOLDS[currentIndex];
  const next = LEVEL_THRESHOLDS[currentIndex + 1] ?? current;
  const progress = next.xp === current.xp
    ? 100
    : Math.round(((xp - current.xp) / (next.xp - current.xp)) * 100);

  return { level: current.level, name: current.name, nextXp: next.xp, progress };
}

// Tronque un texte
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '…';
}

// Génère une couleur d'avatar depuis un username
export function getAvatarColor(username: string): string {
  const colors = [
    '#2E7D32', '#1565C0', '#6A1B9A', '#AD1457',
    '#E65100', '#2E7D32', '#00695C', '#0277BD',
  ];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// Initiales depuis un username
export function getInitials(username: string): string {
  const parts = username.trim().split(/[\s_-]/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return username.slice(0, 2).toUpperCase();
}

// Convertit kg + g en grammes total
export function kgAndGramsToGrams(kg: string, grams: string): number {
  const kgNum = parseFloat(kg.replace(',', '.')) || 0;
  const gramsNum = parseFloat(grams.replace(',', '.')) || 0;
  return Math.round(kgNum * 1000 + gramsNum);
}
