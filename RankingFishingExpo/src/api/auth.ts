import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../store/types';
import { MOCK_CURRENT_USER } from './mock/data';
import { delay, generateId } from '../utils/helpers';
import { USE_MOCK_DATA } from '../config/firebase';

const USER_STORAGE_KEY = '@rankingfishing_user';

// ─── Interface ────────────────────────────────────────────────────────────────

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  username: string;
}

// ─── Persistance locale ───────────────────────────────────────────────────────

export async function getStoredUser(): Promise<User | null> {
  try {
    const json = await AsyncStorage.getItem(USER_STORAGE_KEY);
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

async function storeUser(user: User): Promise<void> {
  await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

async function clearStoredUser(): Promise<void> {
  await AsyncStorage.removeItem(USER_STORAGE_KEY);
}

// ─── Authentification ─────────────────────────────────────────────────────────

export async function signIn(credentials: AuthCredentials): Promise<User> {
  if (USE_MOCK_DATA) {
    await delay(800);
    // En mode mock, tout email/mdp valide connecte l'utilisateur de démo
    const user = { ...MOCK_CURRENT_USER, email: credentials.email };
    await storeUser(user);
    return user;
  }

  // TODO: Firebase Authentication
  // const { user } = await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
  // return fetchUserProfile(user.uid);
  throw new Error('Firebase non configuré');
}

export async function register(data: RegisterData): Promise<User> {
  if (USE_MOCK_DATA) {
    await delay(1000);
    const newUser: User = {
      ...MOCK_CURRENT_USER,
      id: generateId(),
      email: data.email,
      username: data.username,
      xp: 0,
      level: 1,
      levelName: 'Novice',
      stats: {
        totalCaptures: 0,
        totalWeightGrams: 0,
        biggestFish: null,
        globalRank: null,
        regionalRank: null,
        challengesWon: 0,
      },
      createdAt: new Date().toISOString(),
    };
    await storeUser(newUser);
    return newUser;
  }

  // TODO: Firebase Authentication
  throw new Error('Firebase non configuré');
}

export async function signOut(): Promise<void> {
  if (USE_MOCK_DATA) {
    await delay(300);
    await clearStoredUser();
    return;
  }

  // TODO: Firebase signOut
  throw new Error('Firebase non configuré');
}

export async function resetPassword(email: string): Promise<void> {
  if (USE_MOCK_DATA) {
    await delay(800);
    // Simule l'envoi d'un email de réinitialisation
    return;
  }

  // TODO: Firebase sendPasswordResetEmail
  throw new Error('Firebase non configuré');
}
