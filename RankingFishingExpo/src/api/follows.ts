import { supabase, USE_MOCK_DATA } from '../config/supabase';
import { UserSearchResult, userToSearchResult } from './users';
import * as mockDb from './mock/db';
import { delay } from '../utils/helpers';

const MOCK_LATENCY = 150;

async function mockUserList(ids: string[]): Promise<UserSearchResult[]> {
  const out: UserSearchResult[] = [];
  for (const id of ids) {
    const u = await mockDb.getUser(id);
    if (u) out.push(userToSearchResult(u));
  }
  return out;
}

const newestFirst = (a: { createdAt: string }, b: { createdAt: string }) =>
  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

export type FollowStatus = 'not_following' | 'requested' | 'following' | 'self';

export interface Relationship {
  myStatus: FollowStatus;        // ma direction vers eux
  theyFollowMe: boolean;          // ils me suivent
  incomingRequest: boolean;       // ils m'ont envoyé une demande en attente
}

const USER_COLS = 'id, username, avatar_url, location, level, level_name, is_premium, xp';

function mapUser(row: any): UserSearchResult {
  return {
    id: row.id,
    username: row.username,
    avatar: row.avatar_url ?? undefined,
    location: row.location ?? undefined,
    level: row.level ?? 1,
    levelName: row.level_name ?? 'Novice',
    isPremium: row.is_premium ?? false,
    xp: row.xp ?? 0,
  };
}

// ─── Statut de la relation entre moi et un autre utilisateur ─────────────────

export async function getFollowStatus(myId: string, targetId: string): Promise<FollowStatus> {
  if (myId === targetId) return 'self';

  if (USE_MOCK_DATA) {
    await delay(MOCK_LATENCY);
    if (mockDb.isFollowing(myId, targetId)) return 'following';
    if (mockDb.hasRequest(myId, targetId)) return 'requested';
    return 'not_following';
  }

  const { data: follow } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', myId)
    .eq('followed_id', targetId)
    .maybeSingle();
  if (follow) return 'following';

  const { data: request } = await supabase
    .from('follow_requests')
    .select('requester_id')
    .eq('requester_id', myId)
    .eq('target_id', targetId)
    .maybeSingle();
  if (request) return 'requested';

  return 'not_following';
}

// ─── Relation complète (2 directions) ────────────────────────────────────────

export async function fetchRelationship(myId: string, targetId: string): Promise<Relationship> {
  if (myId === targetId) {
    return { myStatus: 'self', theyFollowMe: false, incomingRequest: false };
  }

  if (USE_MOCK_DATA) {
    await delay(MOCK_LATENCY);
    let status: FollowStatus = 'not_following';
    if (mockDb.isFollowing(myId, targetId)) status = 'following';
    else if (mockDb.hasRequest(myId, targetId)) status = 'requested';
    return {
      myStatus: status,
      theyFollowMe: mockDb.isFollowing(targetId, myId),
      incomingRequest: mockDb.hasRequest(targetId, myId),
    };
  }

  const { data: follows } = await supabase
    .from('follows')
    .select('follower_id, followed_id')
    .or(
      `and(follower_id.eq.${myId},followed_id.eq.${targetId}),` +
      `and(follower_id.eq.${targetId},followed_id.eq.${myId})`
    );

  const { data: requests } = await supabase
    .from('follow_requests')
    .select('requester_id, target_id')
    .or(
      `and(requester_id.eq.${myId},target_id.eq.${targetId}),` +
      `and(requester_id.eq.${targetId},target_id.eq.${myId})`
    );

  const iFollowThem    = (follows ?? []).some((f: any) => f.follower_id === myId);
  const theyFollowMe   = (follows ?? []).some((f: any) => f.follower_id === targetId);
  const iRequested     = (requests ?? []).some((r: any) => r.requester_id === myId);
  const incomingRequest = (requests ?? []).some((r: any) => r.requester_id === targetId);

  let myStatus: FollowStatus = 'not_following';
  if (iFollowThem) myStatus = 'following';
  else if (iRequested) myStatus = 'requested';

  return { myStatus, theyFollowMe, incomingRequest };
}

// ─── Envoi / annulation d'une demande ────────────────────────────────────────

export async function sendFollowRequest(requesterId: string, targetId: string): Promise<void> {
  if (USE_MOCK_DATA) {
    await delay(MOCK_LATENCY);
    if (mockDb.isFollowing(requesterId, targetId)) return;
    if (!mockDb.hasRequest(requesterId, targetId)) {
      mockDb.followRequests.push({ requesterId, targetId, createdAt: new Date().toISOString() });
    }
    return;
  }

  const { error } = await supabase
    .from('follow_requests')
    .insert({ requester_id: requesterId, target_id: targetId });
  if (error) throw error;
}

export async function cancelFollowRequest(requesterId: string, targetId: string): Promise<void> {
  if (USE_MOCK_DATA) {
    await delay(MOCK_LATENCY);
    mockDb.removeRequest(requesterId, targetId);
    return;
  }

  const { error } = await supabase
    .from('follow_requests')
    .delete()
    .eq('requester_id', requesterId)
    .eq('target_id', targetId);
  if (error) throw error;
}

// ─── Acceptation / refus (RPCs security definer côté SQL) ────────────────────

export async function acceptFollowRequest(requesterId: string): Promise<void> {
  if (USE_MOCK_DATA) {
    await delay(MOCK_LATENCY);
    const me = await mockDb.getSessionUserId();
    if (!mockDb.removeRequest(requesterId, me)) throw new Error('Demande introuvable');
    mockDb.addFollow(requesterId, me);
    return;
  }

  const { error } = await supabase.rpc('accept_follow_request', { p_requester: requesterId });
  if (error) throw error;
}

export async function declineFollowRequest(requesterId: string): Promise<void> {
  if (USE_MOCK_DATA) {
    await delay(MOCK_LATENCY);
    const me = await mockDb.getSessionUserId();
    mockDb.removeRequest(requesterId, me);
    return;
  }

  const { error } = await supabase.rpc('decline_follow_request', { p_requester: requesterId });
  if (error) throw error;
}

// ─── Désabonnement ───────────────────────────────────────────────────────────

export async function unfollow(myId: string, targetId: string): Promise<void> {
  if (USE_MOCK_DATA) {
    await delay(MOCK_LATENCY);
    mockDb.removeFollow(myId, targetId);
    return;
  }

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', myId)
    .eq('followed_id', targetId);
  if (error) throw error;
}

// ─── Listes (abonnés / abonnements / demandes reçues) ────────────────────────

export async function fetchFollowers(userId: string): Promise<UserSearchResult[]> {
  if (USE_MOCK_DATA) {
    await delay(MOCK_LATENCY);
    const rows = mockDb.follows.filter((x) => x.followedId === userId).sort(newestFirst);
    return mockUserList(rows.map((x) => x.followerId));
  }

  const { data, error } = await supabase
    .from('follows')
    .select(`follower:users!follower_id(${USER_COLS}), created_at`)
    .eq('followed_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: any) => mapUser(row.follower));
}

export async function fetchFollowing(userId: string): Promise<UserSearchResult[]> {
  if (USE_MOCK_DATA) {
    await delay(MOCK_LATENCY);
    const rows = mockDb.follows.filter((x) => x.followerId === userId).sort(newestFirst);
    return mockUserList(rows.map((x) => x.followedId));
  }

  const { data, error } = await supabase
    .from('follows')
    .select(`followed:users!followed_id(${USER_COLS}), created_at`)
    .eq('follower_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: any) => mapUser(row.followed));
}

export async function fetchPendingRequests(myId: string): Promise<UserSearchResult[]> {
  if (USE_MOCK_DATA) {
    await delay(MOCK_LATENCY);
    const rows = mockDb.followRequests.filter((x) => x.targetId === myId).sort(newestFirst);
    return mockUserList(rows.map((x) => x.requesterId));
  }

  const { data, error } = await supabase
    .from('follow_requests')
    .select(`requester:users!requester_id(${USER_COLS}), created_at`)
    .eq('target_id', myId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: any) => mapUser(row.requester));
}

export async function fetchPendingRequestsCount(myId: string): Promise<number> {
  if (USE_MOCK_DATA) {
    await delay(MOCK_LATENCY);
    return mockDb.followRequests.filter((x) => x.targetId === myId).length;
  }

  const { count, error } = await supabase
    .from('follow_requests')
    .select('*', { count: 'exact', head: true })
    .eq('target_id', myId);
  if (error) throw error;
  return count ?? 0;
}
