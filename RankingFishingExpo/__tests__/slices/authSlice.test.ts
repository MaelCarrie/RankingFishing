import reducer, {
  initAuth, signIn, register, signOut, refreshUser, refreshPendingCount, updateProfile,
  clearError, updateUser, setPendingRequestsCount, decrementPendingRequestsCount,
} from '../../src/store/slices/authSlice';
import { MOCK_CURRENT_USER } from '../../src/api/mock/data';

const init = () => reducer(undefined, { type: '@@init' });
const user = MOCK_CURRENT_USER;

describe('authSlice', () => {
  it('état initial : chargement, non connecté', () => {
    expect(init()).toEqual({
      user: null, isLoading: true, isAuthenticated: false, error: null, pendingRequestsCount: 0,
    });
  });

  it('initAuth avec un utilisateur stocké → connecté', () => {
    const s = reducer(init(), initAuth.fulfilled(user, 'r'));
    expect(s.isAuthenticated).toBe(true);
    expect(s.user?.id).toBe('user_me');
    expect(s.isLoading).toBe(false);
  });

  it('initAuth sans utilisateur → écran de connexion', () => {
    const s = reducer(init(), initAuth.fulfilled(null, 'r'));
    expect(s.isAuthenticated).toBe(false);
    expect(s.isLoading).toBe(false);
  });

  it('initAuth rejeté → fin du chargement', () => {
    expect(reducer(init(), initAuth.rejected(new Error('x'), 'r')).isLoading).toBe(false);
  });

  it('signIn : pending → fulfilled', () => {
    const creds = { email: 'demo@rankingfishing.app', password: 'demo1234' };
    let s = reducer({ ...init(), isLoading: false, error: 'ancienne' }, signIn.pending('r', creds));
    expect(s.isLoading).toBe(true);
    expect(s.error).toBeNull();
    s = reducer(s, signIn.fulfilled(user, 'r', creds));
    expect(s).toMatchObject({ isLoading: false, isAuthenticated: true, user: { username: 'PierreM' } });
  });

  it('signIn rejeté → message d\'erreur', () => {
    const creds = { email: 'x@y.fr', password: 'bad' };
    const s = reducer(init(), signIn.rejected(null, 'r', creds, 'Email ou mot de passe incorrect'));
    expect(s.error).toBe('Email ou mot de passe incorrect');
    expect(s.isAuthenticated).toBe(false);
    expect(s.isLoading).toBe(false);
  });

  it('register fulfilled → connecté', () => {
    const data = { email: 'a@b.fr', password: 'Abcdef12', username: 'Nouveau' };
    const s = reducer(init(), register.fulfilled({ ...user, username: 'Nouveau' }, 'r', data));
    expect(s.isAuthenticated).toBe(true);
    expect(s.user?.username).toBe('Nouveau');
  });

  it('signOut remet l\'état à zéro', () => {
    let s = reducer(init(), signIn.fulfilled(user, 'r', { email: '', password: '' }));
    s = reducer(s, setPendingRequestsCount(3));
    s = reducer(s, signOut.fulfilled(undefined, 'r'));
    expect(s).toMatchObject({ user: null, isAuthenticated: false, pendingRequestsCount: 0 });
  });

  it('refreshUser / updateProfile remplacent le profil', () => {
    let s = reducer(init(), refreshUser.fulfilled({ ...user, xp: 2000 }, 'r', 'user_me'));
    expect(s.user?.xp).toBe(2000);
    s = reducer(s, updateProfile.fulfilled({ ...user, bio: 'Nouvelle bio' }, 'r', { userId: 'user_me', fields: {} }));
    expect(s.user?.bio).toBe('Nouvelle bio');
  });

  it('updateProfile rejeté → erreur', () => {
    const s = reducer(init(), updateProfile.rejected(null, 'r', { userId: 'u', fields: {} }, 'Mise à jour échouée'));
    expect(s.error).toBe('Mise à jour échouée');
  });

  it('updateUser fusionne partiellement, ignoré si déconnecté', () => {
    expect(reducer(init(), updateUser({ bio: 'x' })).user).toBeNull();
    const s = reducer(reducer(init(), initAuth.fulfilled(user, 'r')), updateUser({ bio: 'x' }));
    expect(s.user).toMatchObject({ bio: 'x', username: 'PierreM' });
  });

  it('clearError', () => {
    const s = reducer({ ...init(), error: 'boom' }, clearError());
    expect(s.error).toBeNull();
  });

  it('compteur de demandes : jamais négatif', () => {
    let s = reducer(init(), refreshPendingCount.fulfilled(2, 'r', 'user_me'));
    expect(s.pendingRequestsCount).toBe(2);
    s = reducer(s, decrementPendingRequestsCount());
    s = reducer(s, decrementPendingRequestsCount());
    s = reducer(s, decrementPendingRequestsCount());
    expect(s.pendingRequestsCount).toBe(0);
    expect(reducer(s, setPendingRequestsCount(-5)).pendingRequestsCount).toBe(0);
  });
});
