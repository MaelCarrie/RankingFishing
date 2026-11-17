import {
  validateEmail, validatePassword, validatePasswordConfirm, validateUsername, validateWeight, validateSize,
} from '../../src/utils/validation';

describe('validateEmail', () => {
  it('accepte un email valide', () => expect(validateEmail('demo@rankingfishing.app')).toBeNull());
  it('refuse un email vide', () => expect(validateEmail('  ')).toBe("L'email est requis"));
  it('refuse un format invalide', () => {
    expect(validateEmail('pierre@')).toBe("Format d'email invalide");
    expect(validateEmail('pierre example.com')).toBe("Format d'email invalide");
  });
});

describe('validatePassword', () => {
  it('accepte un mot de passe conforme', () => expect(validatePassword('Brochet2026')).toBeNull());
  it.each([
    ['', 'Le mot de passe est requis'],
    ['Abc12', 'Minimum 8 caractères'],
    ['brochet2026', 'Au moins une majuscule requise'],
    ['BrochetXXL', 'Au moins un chiffre requis'],
  ])('"%s" → %s', (pwd, msg) => expect(validatePassword(pwd)).toBe(msg));
});

describe('validatePasswordConfirm', () => {
  it('ok si identiques', () => expect(validatePasswordConfirm('Abcdef12', 'Abcdef12')).toBeNull());
  it('requis', () => expect(validatePasswordConfirm('Abcdef12', '')).toBe('Confirme ton mot de passe'));
  it('différents', () => expect(validatePasswordConfirm('Abcdef12', 'Abcdef13')).toBe('Les mots de passe ne correspondent pas'));
});

describe('validateUsername', () => {
  it('accepte lettres, chiffres, _ et -', () => expect(validateUsername('Carpe_Fan-44')).toBeNull());
  it.each([
    ['', "Le nom d'utilisateur est requis"],
    ['ab', 'Minimum 3 caractères'],
    ['a'.repeat(21), 'Maximum 20 caractères'],
    ['Pêcheur', 'Lettres, chiffres, _ et - uniquement'],
    ['Jean Pierre', 'Lettres, chiffres, _ et - uniquement'],
  ])('"%s" → %s', (name, msg) => expect(validateUsername(name)).toBe(msg));
});

describe('validateWeight', () => {
  it('accepte point et virgule', () => {
    expect(validateWeight('18.2')).toBeNull();
    expect(validateWeight('18,2')).toBeNull();
  });
  it.each([
    ['', 'Le poids est requis'],
    ['abc', 'Poids invalide'],
    ['0', 'Poids invalide'],
    ['-3', 'Poids invalide'],
    ['301', 'Poids trop élevé (max 300 kg)'],
  ])('"%s" → %s', (v, msg) => expect(validateWeight(v)).toBe(msg));
});

describe('validateSize', () => {
  it('accepte une taille valide', () => expect(validateSize('112')).toBeNull());
  it.each([
    ['', 'La taille est requise'],
    ['x', 'Taille invalide'],
    ['501', 'Taille trop élevée (max 500 cm)'],
  ])('"%s" → %s', (v, msg) => expect(validateSize(v)).toBe(msg));
});
