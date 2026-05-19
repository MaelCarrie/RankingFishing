// Formate le poids (grammes → affichage)
export function formatWeight(grams: number): string {
  if (grams >= 1000) {
    const kg = grams / 1000;
    return kg % 1 === 0 ? `${kg} kg` : `${kg.toFixed(1)} kg`;
  }
  return `${grams} g`;
}

// Formate la taille en cm
export function formatSize(cm: number): string {
  return `${cm} cm`;
}

// Formate un score de classement
export function formatScore(score: number): string {
  if (score >= 1000) return `${(score / 1000).toFixed(1)}k pts`;
  return `${score} pts`;
}

// Formate une date relative (ex: "il y a 2h")
export function formatRelativeDate(isoDate: string): string {
  const now = new Date();
  const date = new Date(isoDate);
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

// Formate une date complète
export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Formate un rang (1 → "1er", 2 → "2e", etc.)
export function formatRank(rank: number): string {
  if (rank === 1) return '1er';
  return `${rank}e`;
}

// Formate un XP
export function formatXP(xp: number): string {
  if (xp >= 1000) return `${(xp / 1000).toFixed(1)}k XP`;
  return `${xp} XP`;
}

// Initialiales depuis un username
export function getInitials(username: string): string {
  const parts = username.trim().split(/[\s_-]/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return username.slice(0, 2).toUpperCase();
}
