// ─── Outils mock propres au chat ──────────────────────────────────────────────
// Utilisé uniquement quand USE_MOCK_DATA = true (tests Playwright, démo hors ligne).

import { ConversationParticipant, Message } from '../../store/types';
import * as mockDb from './db';

/** Résout un participant (pseudo + avatar) depuis la base mock partagée. */
export async function findMockChatUser(userId: string): Promise<ConversationParticipant | undefined> {
  const u = await mockDb.getUser(userId);
  return u ? { id: u.id, username: u.username, avatar: u.avatar } : undefined;
}

/** Utilisateur connecté en mode mock (équivalent de auth.uid()). */
export async function getMockSessionUser(): Promise<ConversationParticipant> {
  const id = await mockDb.getSessionUserId();
  return (await findMockChatUser(id)) ?? { id, username: 'Pêcheur' };
}

// ─── Bus d'événements : simule Supabase Realtime en mode mock ────────────────
// Les envois de message (y compris un partage de capture lancé depuis un autre
// écran) sont diffusés aux écrans abonnés, exactement comme le ferait Realtime.

export type MockChatEvent = { kind: 'insert' | 'update'; message: Message };
type Listener = (event: MockChatEvent) => void;

const listeners = new Set<Listener>();

export const mockChatBus = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  emit(event: MockChatEvent) {
    // Asynchrone, comme un écho réseau
    setTimeout(() => listeners.forEach((l) => l(event)), 0);
  },
};
