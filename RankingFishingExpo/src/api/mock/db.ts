// ─── Base de données en mémoire du mode mock ─────────────────────────────────
//
// État mutable partagé par les API mockées (auth, users, follows).
// Les comptes inscrits sont aussi persistés dans AsyncStorage pour survivre
// à un rechargement de la page (Expo web) ou de l'app.
// ─────────────────────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../../store/types';
import {
  MOCK_ALL_USERS, MOCK_CURRENT_USER, MOCK_DEMO_EMAIL, MOCK_DEMO_PASSWORD,
  MOCK_FOLLOWS, MOCK_FOLLOW_REQUESTS, MockFollow, MockFollowRequest,
} from './data';

// Même clé que src/api/auth.ts (utilisateur connecté persisté)
export const USER_STORAGE_KEY = '@rankingfishing_user';
const ACCOUNTS_STORAGE_KEY = '@rankingfishing_mock_accounts';

interface MockAccount {
  password: string;
  user: User;
}

// ─── Utilisateurs ─────────────────────────────────────────────────────────────

const users = new Map<string, User>(MOCK_ALL_USERS.map((u) => [u.id, { ...u }]));
const accounts = new Map<string, MockAccount>([
  [MOCK_DEMO_EMAIL, { password: MOCK_DEMO_PASSWORD, user: MOCK_CURRENT_USER }],
]);
let accountsLoaded = false;

async function loadAccounts(): Promise<void> {
  if (accountsLoaded) return;
  accountsLoaded = true;
  try {
    const json = await AsyncStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (!json) return;
    const saved: Record<string, MockAccount> = JSON.parse(json);
    for (const [email, account] of Object.entries(saved)) {
      if (!accounts.has(email)) accounts.set(email, account);
      if (!users.has(account.user.id)) users.set(account.user.id, account.user);
    }
  } catch {
    // stockage indisponible : on reste en mémoire
  }
}

async function saveAccounts(): Promise<void> {
  const out: Record<string, MockAccount> = {};
  for (const [email, account] of accounts) {
    if (email === MOCK_DEMO_EMAIL) continue;
    out[email] = { password: account.password, user: users.get(account.user.id) ?? account.user };
  }
  try {
    await AsyncStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(out));
  } catch {
    // ignore
  }
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export async function findAccount(email: string): Promise<MockAccount | undefined> {
  await loadAccounts();
  return accounts.get(normalizeEmail(email));
}

export async function createAccount(email: string, password: string, user: User): Promise<void> {
  await loadAccounts();
  accounts.set(normalizeEmail(email), { password, user });
  users.set(user.id, user);
  await saveAccounts();
}

export async function getAllUsers(): Promise<User[]> {
  await loadAccounts();
  return [...users.values()];
}

/** Profil avec compteurs abonnés/abonnements calculés depuis le graphe. */
export async function getUser(userId: string): Promise<User | undefined> {
  await loadAccounts();
  let u = users.get(userId);
  if (!u) {
    // Utilisateur connecté inconnu de la mémoire (ex. stockage local d'une ancienne session)
    const stored = await getStoredMockUser();
    if (stored && stored.id === userId) {
      users.set(stored.id, stored);
      u = stored;
    }
  }
  if (!u) return undefined;
  return {
    ...u,
    followersCount: follows.filter((x) => x.followedId === userId).length,
    followingCount: follows.filter((x) => x.followerId === userId).length,
  };
}

export async function patchUser(userId: string, fields: Partial<User>): Promise<User | undefined> {
  await loadAccounts();
  const u = users.get(userId);
  if (!u) return undefined;
  users.set(userId, { ...u, ...fields });
  await saveAccounts();
  return getUser(userId);
}

// ─── Session ──────────────────────────────────────────────────────────────────

async function getStoredMockUser(): Promise<User | null> {
  try {
    const json = await AsyncStorage.getItem(USER_STORAGE_KEY);
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

/** Id de l'utilisateur connecté (équivalent de auth.uid() côté SQL). */
export async function getSessionUserId(): Promise<string> {
  const stored = await getStoredMockUser();
  if (!stored) throw new Error('Non connecté');
  return stored.id;
}

// ─── Graphe social ────────────────────────────────────────────────────────────

export const follows: MockFollow[] = MOCK_FOLLOWS.map((x) => ({ ...x }));
export const followRequests: MockFollowRequest[] = MOCK_FOLLOW_REQUESTS.map((x) => ({ ...x }));

export function isFollowing(followerId: string, followedId: string): boolean {
  return follows.some((x) => x.followerId === followerId && x.followedId === followedId);
}

export function hasRequest(requesterId: string, targetId: string): boolean {
  return followRequests.some((x) => x.requesterId === requesterId && x.targetId === targetId);
}

export function removeRequest(requesterId: string, targetId: string): boolean {
  const i = followRequests.findIndex((x) => x.requesterId === requesterId && x.targetId === targetId);
  if (i === -1) return false;
  followRequests.splice(i, 1);
  return true;
}

export function addFollow(followerId: string, followedId: string): void {
  if (!isFollowing(followerId, followedId)) {
    follows.push({ followerId, followedId, createdAt: new Date().toISOString() });
  }
}

export function removeFollow(followerId: string, followedId: string): void {
  const i = follows.findIndex((x) => x.followerId === followerId && x.followedId === followedId);
  if (i !== -1) follows.splice(i, 1);
}
