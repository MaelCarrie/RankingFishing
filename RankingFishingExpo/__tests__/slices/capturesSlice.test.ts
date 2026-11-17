import reducer, {
  fetchMyCaptures, publishCapture, toggleLike, deleteCapture, clearError,
} from '../../src/store/slices/capturesSlice';
import { MOCK_FEED_CAPTURES, MOCK_MY_CAPTURES } from '../../src/api/mock/data';
import { Capture } from '../../src/store/types';

const init = () => reducer(undefined, { type: '@@init' });
const feed: Capture[] = MOCK_FEED_CAPTURES.slice(0, 3).map((c) => ({ ...c }));
const mine: Capture[] = MOCK_MY_CAPTURES.slice(0, 2).map((c) => ({ ...c }));
const withData = () => ({ ...init(), feed: feed.map((c) => ({ ...c })), myCaptures: mine.map((c) => ({ ...c })) });

describe('capturesSlice', () => {
  it('état initial vide', () => {
    expect(init()).toMatchObject({ feed: [], myCaptures: [], isLoading: false, isSubmitting: false, error: null });
  });

  it('fetchMyCaptures : pending → fulfilled', () => {
    let s = reducer(init(), fetchMyCaptures.pending('r', 'user_me'));
    expect(s.isLoading).toBe(true);
    s = reducer(s, fetchMyCaptures.fulfilled(mine, 'r', 'user_me'));
    expect(s.myCaptures).toHaveLength(2);
    expect(s.isLoading).toBe(false);
  });

  it('toggleLike met à jour likes + isLiked', () => {
    const target = feed[0];
    const s = reducer(withData(), toggleLike.fulfilled(
      { captureId: target.id, likes: target.likes + 1, isLiked: true }, 'r', { captureId: target.id, userId: 'user_me' },
    ));
    const updated = s.feed.find((c) => c.id === target.id)!;
    expect(updated.likes).toBe(target.likes + 1);
    expect(updated.isLiked).toBe(true);
  });

  it('publishCapture publiée → en tête du feed et de mes captures', () => {
    const draftArg = { userId: 'user_me', username: 'PierreM', form: {} as any };
    const fresh: Capture = { ...mine[0], id: 'new_cap', isDraft: false };
    let s = reducer(withData(), publishCapture.pending('r', draftArg));
    expect(s.isSubmitting).toBe(true);
    s = reducer(s, publishCapture.fulfilled(fresh, 'r', draftArg));
    expect(s.isSubmitting).toBe(false);
    expect(s.feed[0].id).toBe('new_cap');
    expect(s.myCaptures[0].id).toBe('new_cap');
  });

  it('publishCapture brouillon → seulement dans mes captures', () => {
    const arg = { userId: 'user_me', username: 'PierreM', form: {} as any };
    const draft: Capture = { ...mine[0], id: 'draft_cap', isDraft: true };
    const s = reducer(withData(), publishCapture.fulfilled(draft, 'r', arg));
    expect(s.feed.some((c) => c.id === 'draft_cap')).toBe(false);
    expect(s.myCaptures[0].id).toBe('draft_cap');
  });

  it('publishCapture rejeté → erreur', () => {
    const arg = { userId: 'user_me', username: 'PierreM', form: {} as any };
    const s = reducer(withData(), publishCapture.rejected(null, 'r', arg, 'Espèce requise'));
    expect(s.error).toBe('Espèce requise');
    expect(s.isSubmitting).toBe(false);
    expect(reducer(s, clearError()).error).toBeNull();
  });

  it('deleteCapture retire la capture partout', () => {
    const id = mine[0].id;
    const s = reducer(withData(), deleteCapture.fulfilled(id, 'r', id));
    expect(s.feed.some((c) => c.id === id)).toBe(false);
    expect(s.myCaptures.some((c) => c.id === id)).toBe(false);
  });
});
