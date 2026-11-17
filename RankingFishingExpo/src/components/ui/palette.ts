/**
 * Palette sobre et désaturée pour les tuiles dérivées d'une clé
 * (espèces, initiales d'avatar). Chaque encre fait ≥ 4.5:1 sur son fond.
 */
export interface Tone {
  bg: string;
  ink: string;
}

export const TONES: Tone[] = [
  { bg: '#E6EDE3', ink: '#3D5A3A' }, // mousse
  { bg: '#E3EBEF', ink: '#36566A' }, // lac
  { bg: '#E7E8EC', ink: '#4A4F63' }, // ardoise
  { bg: '#F1EBDF', ink: '#6B5634' }, // sable
  { bg: '#F1E5E0', ink: '#7A4A3C' }, // argile
  { bg: '#ECEDDF', ink: '#55572F' }, // roseau
  { bg: '#E0ECEA', ink: '#2F5E58' }, // sarcelle
  { bg: '#EDE5EC', ink: '#5E4560' }, // prune
];

function hash(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Teinte stable pour une clé (id d'espèce, nom d'utilisateur…). */
export function toneFor(key: string): Tone {
  return TONES[hash(key || '?') % TONES.length];
}
