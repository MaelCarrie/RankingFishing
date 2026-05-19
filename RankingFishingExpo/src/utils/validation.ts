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
  if (!confirm) return 'Veuillez confirmer votre mot de passe';
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
