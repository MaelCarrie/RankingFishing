import { calculateCaptureScore, getLevelFromXP, FISH_SPECIES } from '../../src/config/constants';

const sp = (id: string) => FISH_SPECIES.find((s) => s.id === id)!;

describe('calculateCaptureScore', () => {
  // score = round(kg × coefficient × 10 + rareté)
  it.each([
    ['carp', 26400, 269],     // 26.4 × 1.0 × 10 + 5
    ['catfish', 72000, 366],  // 72 × 0.5 × 10 + 6
    ['pike', 9100, 192],      // 9.1 × 2 × 10 + 10
    ['zander', 4200, 117],    // 4.2 × 2.5 × 10 + 12
    ['salmon', 6800, 292],    // 6.8 × 4 × 10 + 20
    ['roach', 0, 2],          // poids nul → bonus de rareté seul
  ])('%s de %i g → %i pts', (id, grams, expected) => {
    expect(calculateCaptureScore(grams, sp(id))).toBe(expected);
  });

  it('un poisson plus lourd rapporte plus', () => {
    expect(calculateCaptureScore(10000, sp('pike'))).toBeGreaterThan(calculateCaptureScore(5000, sp('pike')));
  });

  it('valorise les espèces rares à poids égal', () => {
    expect(calculateCaptureScore(2000, sp('brown_trout'))).toBeGreaterThan(calculateCaptureScore(2000, sp('carp')));
  });

  it('renvoie toujours un entier', () => {
    for (const s of FISH_SPECIES) expect(Number.isInteger(calculateCaptureScore(1234, s))).toBe(true);
  });
});

describe('getLevelFromXP', () => {
  it('cohérent avec les seuils', () => {
    expect(getLevelFromXP(0)).toMatchObject({ level: 1, name: 'Novice' });
    expect(getLevelFromXP(199)).toMatchObject({ level: 1 });
    expect(getLevelFromXP(200)).toMatchObject({ level: 2, name: 'Apprenti pêcheur' });
    expect(getLevelFromXP(9200)).toMatchObject({ level: 7, name: 'Légende', progress: 100 });
  });
});
