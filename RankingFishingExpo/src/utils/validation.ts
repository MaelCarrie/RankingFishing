export function validateEmail(email: string): string | null {
  if (!email.trim()) return 'L\'email est requis';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return 'Format d\'email invalide';
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Le mot de passe est requis';
  if (password.length < 8) return 'Minimum 8 caractères';
  if (!/[A-Z]/.test(password)) return 'Au moins une majuscule requise';
  if (!/[0-9]/.test(password)) return 'Au moins un chiffre requis';
  return null;
}

export function validatePasswordConfirm(password: string, confirm: string): string | null {
  if (!confirm) return 'Confirme ton mot de passe';
  if (password !== confirm) return 'Les mots de passe ne correspondent pas';
  return null;
}

export function validateUsername(username: string): string | null {
  if (!username.trim()) return 'Le nom d\'utilisateur est requis';
  if (username.length < 3) return 'Minimum 3 caractères';
  if (username.length > 20) return 'Maximum 20 caractères';
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) return 'Lettres, chiffres, _ et - uniquement';
  return null;
}

export function validateWeight(value: string): string | null {
  if (!value.trim()) return 'Le poids est requis';
  const num = parseFloat(value.replace(',', '.'));
  if (isNaN(num) || num <= 0) return 'Poids invalide';
  if (num > 300) return 'Poids trop élevé (max 300 kg)';
  return null;
}

export function validateSize(value: string): string | null {
  if (!value.trim()) return 'La taille est requise';
  const num = parseFloat(value.replace(',', '.'));
  if (isNaN(num) || num <= 0) return 'Taille invalide';
  if (num > 500) return 'Taille trop élevée (max 500 cm)';
  return null;
}

// ─── Nombres saisis à la française (issue #3) ────────────────────────────────

/**
 * Convertit une saisie utilisateur en nombre en acceptant la virgule décimale
 * française et les espaces ("1 250,5" → 1250.5).
 * Renvoie null si la chaîne est vide, undefined si elle n'est pas numérique.
 */
export function parseDecimalFr(raw: string): number | null | undefined {
  const value = raw.replace(/[\s  ]/g, '').replace(',', '.');
  if (value === '') return null;
  if (!/^\d+(\.\d+)?$/.test(value) && !/^\.\d+$/.test(value)) return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

export const MAX_CAPTURE_WEIGHT_KG = 300;
export const MAX_CAPTURE_SIZE_CM = 500;

/** Poids total en grammes depuis les champs kg + g (null si invalide ou vide). */
export function captureWeightToGrams(kg: string, grams: string): number | null {
  const k = parseDecimalFr(kg);
  const g = parseDecimalFr(grams);
  if (k === undefined || g === undefined) return null;
  const total = Math.round((k ?? 0) * 1000 + (g ?? 0));
  return total > 0 ? total : null;
}

export function validateCaptureWeight(kg: string, grams: string): string | null {
  const k = parseDecimalFr(kg);
  const g = parseDecimalFr(grams);
  if (k === undefined) return 'Kilos invalides : utilise des chiffres (ex. 7,2)';
  if (g === undefined) return 'Grammes invalides : utilise des chiffres (ex. 350)';
  if (k === null && g === null) return 'Indique le poids de ta prise';
  const total = (k ?? 0) * 1000 + (g ?? 0);
  if (total <= 0) return 'Le poids doit être supérieur à 0';
  if (total > MAX_CAPTURE_WEIGHT_KG * 1000) return `Poids trop élevé (max ${MAX_CAPTURE_WEIGHT_KG} kg)`;
  return null;
}

export function validateCaptureSize(cm: string, required: boolean): string | null {
  const n = parseDecimalFr(cm);
  if (n === undefined) return 'Taille invalide : utilise des chiffres (ex. 64,5)';
  if (n === null) return required ? 'Indique la taille de ta prise' : null;
  if (n <= 0) return 'La taille doit être supérieure à 0';
  if (n > MAX_CAPTURE_SIZE_CM) return `Taille trop élevée (max ${MAX_CAPTURE_SIZE_CM} cm)`;
  return null;
}

/** Une capture ne peut pas être datée dans le futur (tolérance 5 min pour les horloges décalées). */
export function validateCaughtAt(iso: string): string | null {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 'Date invalide';
  if (t > Date.now() + 5 * 60_000) return 'La date de la prise ne peut pas être dans le futur';
  return null;
}
