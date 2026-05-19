import { RankingEntry, RankingType, RankingPeriod } from '../store/types';
import { MOCK_RANKINGS_GLOBAL } from './mock/data';
import { delay } from '../utils/helpers';
import { USE_MOCK_DATA } from '../config/firebase';

function shuffleForPeriod(entries: RankingEntry[], period: RankingPeriod): RankingEntry[] {
  // Simule des classements différents selon la période
  const factor = { day: 0.2, week: 0.5, month: 0.8, year: 0.95, alltime: 1 }[period];
  return entries
    .map((e) => ({ ...e, score: Math.round(e.score * factor + Math.random() * 50) }))
    .sort((a, b) => b.score - a.score)
    .map((e, i) => ({ ...e, rank: i + 1 }));
}

export async function fetchRankings(type: RankingType, period: RankingPeriod): Promise<RankingEntry[]> {
  if (USE_MOCK_DATA) {
    await delay(500);
    const base = [...MOCK_RANKINGS_GLOBAL];

    if (type === 'friends') {
      return shuffleForPeriod(base.slice(0, 6), period);
    }
    if (type === 'regional') {
      return shuffleForPeriod(base.slice(0, 8), period);
    }
    if (type === 'species') {
      return shuffleForPeriod(base, period);
    }
    return shuffleForPeriod(base, period);
  }
  throw new Error('Firebase non configuré');
}
