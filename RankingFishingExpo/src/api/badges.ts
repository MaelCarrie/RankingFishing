import { Badge } from '../store/types';
import { MOCK_BADGES } from './mock/data';
import { delay } from '../utils/helpers';
import { USE_MOCK_DATA } from '../config/firebase';

export async function fetchBadges(userId: string): Promise<Badge[]> {
  if (USE_MOCK_DATA) {
    await delay(400);
    return [...MOCK_BADGES];
  }
  throw new Error('Firebase non configuré');
}
