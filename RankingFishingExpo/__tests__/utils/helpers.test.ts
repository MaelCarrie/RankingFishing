import {
  delay, generateId, getLevelInfo, truncate, getAvatarColor, getInitials, kgAndGramsToGrams,
} from '../../src/utils/helpers';

describe('getLevelInfo', () => {
  it('niveau 1 à 0 XP', () => {
    expect(getLevelInfo(0)).toEqual({ level: 1, name: 'Novice', nextXp: 200, progress: 0 });
  });
  it('progression dans le niveau', () => {
    // 1250 XP : niveau 4 (1000) → niveau 5 (2000) = 25 %
    expect(getLevelInfo(1250)).toEqual({ level: 4, name: 'Confirmé', nextXp: 2000, progress: 25 });
  });
  it('pile sur un seuil', () => {
    expect(getLevelInfo(500)).toMatchObject({ level: 3, name: 'Amateur', progress: 0 });
  });
  it('niveau max = 100 %', () => {
    expect(getLevelInfo(50000)).toEqual({ level: 7, name: 'Légende', nextXp: 8000, progress: 100 });
  });
});

describe('truncate', () => {
  it('ne touche pas un texte court', () => expect(truncate('Brochet', 10)).toBe('Brochet'));
  it('tronque avec une ellipse', () => {
    const out = truncate('Superbe commune prise cette nuit', 12);
    expect(out.endsWith('…')).toBe(true);
    expect(out.length).toBeLessThanOrEqual(12);
  });
});

describe('getAvatarColor', () => {
  it('est déterministe', () => expect(getAvatarColor('PierreM')).toBe(getAvatarColor('PierreM')));
  it('renvoie une couleur hex', () => expect(getAvatarColor('SilureMaster')).toMatch(/^#[0-9A-F]{6}$/i));
});

describe('getInitials', () => {
  it('pseudo composé', () => expect(getInitials('Silure-Master')).toBe('SM'));
});

describe('kgAndGramsToGrams', () => {
  it('additionne kg et g', () => expect(kgAndGramsToGrams('18', '200')).toBe(18200));
  it('accepte la virgule', () => expect(kgAndGramsToGrams('1,5', '')).toBe(1500));
  it('ignore les champs vides ou invalides', () => expect(kgAndGramsToGrams('', 'abc')).toBe(0));
});

describe('generateId / delay', () => {
  it('génère des ids uniques', () => {
    const ids = new Set(Array.from({ length: 200 }, generateId));
    expect(ids.size).toBe(200);
  });
  it('delay résout après le délai', async () => {
    jest.useFakeTimers();
    const spy = jest.fn();
    const p = delay(500).then(spy);
    jest.advanceTimersByTime(499);
    await Promise.resolve();
    expect(spy).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    await p;
    expect(spy).toHaveBeenCalled();
    jest.useRealTimers();
  });
});
