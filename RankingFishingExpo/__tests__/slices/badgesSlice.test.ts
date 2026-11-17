import reducer, { fetchBadges } from '../../src/store/slices/badgesSlice';
import { MOCK_BADGES } from '../../src/api/mock/data';

const init = () => reducer(undefined, { type: '@@init' });

describe('badgesSlice', () => {
  it('état initial', () => {
    expect(init()).toMatchObject({ badges: [], isLoading: false, error: null });
  });

  it('fetchBadges : pending → fulfilled', () => {
    let s = reducer(init(), fetchBadges.pending('r', 'user_me'));
    expect(s.isLoading).toBe(true);
    s = reducer(s, fetchBadges.fulfilled(MOCK_BADGES, 'r', 'user_me'));
    expect(s.badges).toHaveLength(MOCK_BADGES.length);
    expect(s.isLoading).toBe(false);
  });

  it('fetchBadges rejeté → erreur', () => {
    const s = reducer(init(), fetchBadges.rejected(null, 'r', 'user_me', 'Impossible de charger les badges.'));
    expect(s.error).toBe('Impossible de charger les badges.');
    expect(s.isLoading).toBe(false);
  });
});
