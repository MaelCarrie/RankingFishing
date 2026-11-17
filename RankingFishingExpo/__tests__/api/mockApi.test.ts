/**
 * API en mode mock (EXPO_PUBLIC_USE_MOCK=1) : auth, recherche, follows.
 * Les modules sont rechargés après avoir positionné la variable d'env.
 */
type Api = {
  auth: typeof import('../../src/api/auth');
  users: typeof import('../../src/api/users');
  follows: typeof import('../../src/api/follows');
  storage: typeof import('../../src/api/storage');
  config: typeof import('../../src/config/supabase');
};

function loadApi(): Api {
  let api!: Api;
  jest.isolateModules(() => {
    api = {
      auth: require('../../src/api/auth'),
      users: require('../../src/api/users'),
      follows: require('../../src/api/follows'),
      storage: require('../../src/api/storage'),
      config: require('../../src/config/supabase'),
    };
  });
  return api;
}

const DEMO = { email: 'demo@rankingfishing.app', password: 'demo1234' };

describe('API mock', () => {
  const previous = process.env.EXPO_PUBLIC_USE_MOCK;
  let api: Api;

  beforeEach(async () => {
    process.env.EXPO_PUBLIC_USE_MOCK = '1';
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.clear();
    api = loadApi();
  });
  afterAll(() => {
    process.env.EXPO_PUBLIC_USE_MOCK = previous;
  });

  it('le mode mock suit la variable d\'environnement', () => {
    expect(api.config.USE_MOCK_DATA).toBe(true);
    process.env.EXPO_PUBLIC_USE_MOCK = '';
    expect(loadApi().config.USE_MOCK_DATA).toBe(false);
  });

  describe('auth', () => {
    it('connecte le compte démo et le persiste', async () => {
      const user = await api.auth.signIn(DEMO);
      expect(user).toMatchObject({ id: 'user_me', username: 'PierreM', email: DEMO.email });
      expect(user.followersCount).toBeGreaterThan(0);
      expect((await api.auth.getStoredUser())?.id).toBe('user_me');
    });

    it('refuse un mauvais mot de passe ou un email inconnu', async () => {
      await expect(api.auth.signIn({ ...DEMO, password: 'nope' })).rejects.toThrow('Email ou mot de passe incorrect');
      await expect(api.auth.signIn({ email: 'inconnu@x.fr', password: 'x' })).rejects.toThrow();
    });

    it('inscrit un nouvel email puis permet de s\'y reconnecter', async () => {
      const created = await api.auth.register({
        email: 'Lucie@Example.fr', password: 'Truite2026', username: 'LucieMouche', region: 'Bretagne',
      });
      expect(created).toMatchObject({ username: 'LucieMouche', xp: 0, level: 1, region: 'Bretagne' });
      await expect(api.auth.register({ email: 'lucie@example.fr', password: 'x', username: 'Autre' }))
        .rejects.toThrow('Un compte existe déjà');

      await api.auth.signOut();
      expect(await api.auth.getStoredUser()).toBeNull();

      // Rechargement de l'app : le compte est relu depuis AsyncStorage
      const reloaded = loadApi();
      const again = await reloaded.auth.signIn({ email: 'lucie@example.fr', password: 'Truite2026' });
      expect(again.id).toBe(created.id);
      expect((await reloaded.users.searchUsers('lucie')).map((u) => u.username)).toContain('LucieMouche');
    });

    it('met à jour le profil et le rafraîchit', async () => {
      await api.auth.signIn(DEMO);
      const updated = await api.auth.updateProfile('user_me', { bio: 'Nouvelle bio', region: 'Normandie' });
      expect(updated).toMatchObject({ bio: 'Nouvelle bio', region: 'Normandie' });
      expect((await api.auth.refreshAndStoreUser('user_me')).bio).toBe('Nouvelle bio');
    });

    it('fetchUserProfile échoue proprement pour un id inconnu', async () => {
      await expect(api.auth.fetchUserProfile('user_inexistant')).rejects.toThrow('Utilisateur introuvable');
    });

    it('resetPassword ne fait rien en mock', async () => {
      await expect(api.auth.resetPassword(DEMO.email)).resolves.toBeUndefined();
    });
  });

  describe('users', () => {
    it('recherche insensible à la casse, triée par XP', async () => {
      const res = await api.users.searchUsers('BROCHET');
      expect(res.map((u) => u.username)).toEqual(['BrochetFou', 'BrochetQueen']);
      expect(await api.users.searchUsers('   ')).toEqual([]);
    });

    it('top pêcheurs par XP', async () => {
      const top = await api.users.fetchTopUsers(3);
      expect(top).toHaveLength(3);
      expect(top[0].username).toBe('CarpeFanatik');
      expect(top[0].xp).toBeGreaterThanOrEqual(top[1].xp);
    });
  });

  describe('follows', () => {
    beforeEach(async () => {
      await api.auth.signIn(DEMO);
    });

    it('demandes reçues par le démo', async () => {
      const pending = await api.follows.fetchPendingRequests('user_me');
      expect(pending.map((u) => u.username)).toEqual(['BrochetFou', 'SandreKing', 'LacOuvert']);
      expect(await api.follows.fetchPendingRequestsCount('user_me')).toBe(3);
    });

    it('accepter une demande crée un abonné', async () => {
      const before = (await api.auth.fetchUserProfile('user_me')).followersCount;
      await api.follows.acceptFollowRequest('user_7');
      expect(await api.follows.fetchPendingRequestsCount('user_me')).toBe(2);
      expect((await api.follows.fetchFollowers('user_me')).map((u) => u.id)).toContain('user_7');
      expect((await api.auth.fetchUserProfile('user_me')).followersCount).toBe(before + 1);
      expect(await api.follows.fetchRelationship('user_me', 'user_7')).toMatchObject({ theyFollowMe: true });
    });

    it('refuser une demande la supprime', async () => {
      await api.follows.declineFollowRequest('user_8');
      expect(await api.follows.fetchRelationship('user_me', 'user_8'))
        .toEqual({ myStatus: 'not_following', theyFollowMe: false, incomingRequest: false });
    });

    it('envoyer / annuler une demande', async () => {
      expect(await api.follows.getFollowStatus('user_me', 'user_9')).toBe('not_following');
      await api.follows.sendFollowRequest('user_me', 'user_9');
      expect(await api.follows.getFollowStatus('user_me', 'user_9')).toBe('requested');
      await api.follows.cancelFollowRequest('user_me', 'user_9');
      expect(await api.follows.getFollowStatus('user_me', 'user_9')).toBe('not_following');
    });

    it('relation existante et désabonnement', async () => {
      expect(await api.follows.fetchRelationship('user_me', 'user_2'))
        .toEqual({ myStatus: 'following', theyFollowMe: true, incomingRequest: false });
      expect(await api.follows.getFollowStatus('user_me', 'user_6')).toBe('requested');
      expect(await api.follows.getFollowStatus('user_me', 'user_me')).toBe('self');
      await api.follows.unfollow('user_me', 'user_2');
      expect((await api.follows.fetchFollowing('user_me')).map((u) => u.id)).not.toContain('user_2');
    });
  });

  it('storage renvoie l\'URI locale', async () => {
    await expect(api.storage.uploadCapturePhoto('user_me', 'cap', 'file:///photo.jpg')).resolves.toBe('file:///photo.jpg');
    await expect(api.storage.uploadAvatar('user_me', 'blob:abc')).resolves.toBe('blob:abc');
  });
});
