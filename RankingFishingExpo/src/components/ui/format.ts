/**
 * Formatage des chiffres « fiche de pesée » : virgule décimale française,
 * espace fine insécable pour les milliers, unité séparée de la valeur.
 */
const NNBSP = ' ';

/** 12345 → « 12 345 » (espace fine insécable). */
export function formatInt(n: number): string {
  const s = Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, NNBSP);
  return n < 0 ? `−${s}` : s;
}

/** 4.25 → « 4,3 » (1 décimale par défaut, sans zéro inutile si `trim`). */
export function formatDecimal(n: number, digits = 1, trim = true): string {
  const fixed = Math.abs(n).toFixed(digits);
  const [int, dec] = fixed.split('.');
  const intPart = formatInt(Number(int));
  const sign = n < 0 ? '−' : '';
  if (!dec || (trim && /^0+$/.test(dec))) return sign + intPart;
  return `${sign}${intPart},${dec}`;
}

export interface ValueUnit {
  value: string;
  unit: string;
}

/** Grammes → { value: '4,2', unit: 'kg' } ou { value: '850', unit: 'g' }. */
export function splitWeight(grams: number): ValueUnit {
  if (grams >= 1000) {
    const kg = grams / 1000;
    return { value: formatDecimal(kg, kg >= 100 ? 0 : kg >= 10 ? 1 : 2), unit: 'kg' };
  }
  return { value: formatInt(grams), unit: 'g' };
}

/** Centimètres → { value: '72', unit: 'cm' }. */
export function splitLength(cm: number): ValueUnit {
  return { value: formatDecimal(cm, 1), unit: 'cm' };
}

/** Score → { value: '1 240', unit: 'pts' }. */
export function splitScore(score: number): ValueUnit {
  return { value: formatInt(score), unit: 'pts' };
}

/** Version parlée pour les lecteurs d'écran. */
export function spokenUnit(unit: string): string {
  switch (unit) {
    case 'kg': return 'kilos';
    case 'g': return 'grammes';
    case 'cm': return 'centimètres';
    case 'pts': return 'points';
    case 'XP': return 'points d’expérience';
    default: return unit;
  }
}
