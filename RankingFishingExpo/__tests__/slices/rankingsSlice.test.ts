import reducer, { fetchRankings, setType, setPeriod, setSpecies } from '../../src/store/slices/rankingsSlice';
import { RankingEntry } from '../../src/store/types';

const init = () => reducer(undefined, { type: '@@init' });
const arg = { type: 'global' as const, period: 'alltime' as const };

const entries: RankingEntry[] = [
  { rank: 1, userId: 'user_4', username: 'CarpeFanatik', score: 9847, totalCaptures: 412 },
  { rank: 12, userId: 'user_me', username: 'PierreM', score: 1412, totalCaptures: 47, isCurrentUser: true },
];

describe('rankingsSlice', () => {
  it('état initial', () => {
    expect(init()).toMatchObject({ entries: [], type: 'global', period: 'alltime', isLoading: false, error: null });
  });

  it('filtres type / période / espèce', () => {
    let s = reducer(init(), setType('species'));
    s = reducer(s, setPeriod('week'));
    s = reducer(s, setSpecies('pike'));
    expect(s).toMatchObject({ type: 'species', period: 'week', selectedSpecies: 'pike' });
  });

  it('pending → chargement', () => {
    const s = reducer({ ...init(), error: 'x' }, fetchRankings.pending('r', arg));
    expect(s.isLoading).toBe(true);
    expect(s.error).toBeNull();
  });

  // Le payload est construit par le thunk (entries + currentUser + métadonnées)
  const payload = (list: RankingEntry[]) => ({
    entries: list,
    currentUser: list.find((e) => e.isCurrentUser) ?? null,
    isCurrentUserInList: list.some((e) => e.isCurrentUser),
    limit: 100,
    region: 'Bretagne',
  });

  it('fulfilled → entrées + rang de l\'utilisateur courant', () => {
    let s = reducer(init(), fetchRankings.pending('r1', arg));
    s = reducer(s, fetchRankings.fulfilled(payload(entries) as any, 'r1', arg));
    expect(s.entries).toHaveLength(2);
    expect(s.currentUserRank?.rank).toBe(12);
    expect(s.isLoading).toBe(false);
  });

  it('fulfilled sans moi → currentUserRank null', () => {
    let s = reducer(init(), fetchRankings.pending('r1', arg));
    s = reducer(s, fetchRankings.fulfilled(payload([entries[0]]) as any, 'r1', arg));
    expect(s.currentUserRank).toBeNull();
  });

  it('ignore la réponse d\'une requête dépassée (changement d\'onglet rapide)', () => {
    let s = reducer(init(), fetchRankings.pending('ancienne', arg));
    s = reducer(s, fetchRankings.pending('nouvelle', { ...arg, type: 'friends' }));
    s = reducer(s, fetchRankings.fulfilled(payload(entries) as any, 'ancienne', arg));
    expect(s.entries).toHaveLength(0);
    expect(s.isLoading).toBe(true);
  });

  it('rejected → erreur', () => {
    let s = reducer(init(), fetchRankings.pending('r1', arg));
    s = reducer(s, fetchRankings.rejected(null, 'r1', arg, 'Réseau indisponible'));
    expect(s.error).toBe('Réseau indisponible');
    expect(s.isLoading).toBe(false);
  });
});
