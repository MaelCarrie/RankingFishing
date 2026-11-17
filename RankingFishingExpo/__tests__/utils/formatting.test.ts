import {
  formatWeight, formatSize, formatScore, formatRelativeDate, formatRank, formatXP, getInitials,
} from '../../src/utils/formatting';

describe('formatWeight', () => {
  it('affiche les grammes sous 1 kg', () => {
    expect(formatWeight(820)).toBe('820 g');
    expect(formatWeight(0)).toBe('0 g');
  });
  it('affiche les kilos entiers sans décimale', () => {
    expect(formatWeight(72000)).toBe('72 kg');
    expect(formatWeight(1000)).toBe('1 kg');
  });
  it('affiche une décimale sinon', () => {
    expect(formatWeight(26400)).toBe('26,4 kg');
    expect(formatWeight(1850)).toBe('1,9 kg');
  });
});

describe('formatSize / formatScore / formatXP / formatRank', () => {
  it('formatSize', () => {
    expect(formatSize(112)).toBe('112 cm');
    expect(formatSize(64.5)).toBe('64,5 cm');
  });
  it('formatScore', () => {
    expect(formatScore(274)).toBe('274 pts');
    expect(formatScore(9847)).toBe('9,8k pts');
  });
  it('formatXP', () => {
    expect(formatXP(780)).toBe('780 XP');
    expect(formatXP(1250)).toBe('1,3k XP');
  });
  it('formatRank', () => {
    expect(formatRank(1)).toBe('1er');
    expect(formatRank(2)).toBe('2e');
    expect(formatRank(342)).toBe('342e');
  });
});

describe('formatRelativeDate', () => {
  const NOW = new Date('2026-06-15T12:00:00Z').getTime();
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });
  afterAll(() => jest.useRealTimers());

  const minus = (ms: number) => new Date(NOW - ms).toISOString();

  it.each([
    [30 * 1000, "À l'instant"],
    [5 * 60 * 1000, 'Il y a 5 min'],
    [3 * 3600 * 1000, 'Il y a 3h'],
    [30 * 3600 * 1000, 'Hier'],
    [3 * 24 * 3600 * 1000, 'Il y a 3 jours'],
  ])('%i ms → %s', (ms, expected) => {
    expect(formatRelativeDate(minus(ms))).toBe(expected);
  });

  it('affiche une date au-delà d\'une semaine', () => {
    const out = formatRelativeDate(minus(20 * 24 * 3600 * 1000));
    expect(out).toMatch(/26/);
    expect(out).not.toMatch(/Il y a/);
  });
});

describe('getInitials', () => {
  it('prend les 2 premières lettres d\'un pseudo simple', () => expect(getInitials('PierreM')).toBe('PI'));
  it('prend l\'initiale de chaque mot', () => {
    expect(getInitials('jean_dupont')).toBe('JD');
    expect(getInitials('Marie Claire')).toBe('MC');
  });
});
