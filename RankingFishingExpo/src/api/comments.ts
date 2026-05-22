import { Comment } from '../store/types';
import { supabase, USE_MOCK_DATA } from '../config/supabase';
import { delay, generateId } from '../utils/helpers';

let mockComments: Comment[] = [];

// ─── Lire les commentaires d'une capture ──────────────────────────────────────

export async function fetchComments(captureId: string): Promise<Comment[]> {
  if (USE_MOCK_DATA) {
    await delay(300);
    return mockComments.filter((c) => c.captureId === captureId);
  }

  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('capture_id', captureId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapComment);
}

// ─── Poster un commentaire ────────────────────────────────────────────────────

export async function postComment(
  captureId: string,
  userId: string,
  username: string,
  content: string,
  userAvatar?: string
): Promise<Comment> {
  if (USE_MOCK_DATA) {
    await delay(300);
    const c: Comment = {
      id: generateId(),
      captureId,
      userId,
      username,
      userAvatar,
      content,
      createdAt: new Date().toISOString(),
    };
    mockComments.push(c);
    return c;
  }

  const { data, error } = await supabase
    .from('comments')
    .insert({
      capture_id: captureId,
      user_id: userId,
      username,
      user_avatar: userAvatar ?? null,
      content,
    })
    .select()
    .single();

  if (error) throw error;
  return mapComment(data);
}

// ─── Supprimer un commentaire ─────────────────────────────────────────────────

export async function deleteComment(commentId: string): Promise<void> {
  if (USE_MOCK_DATA) {
    await delay(200);
    mockComments = mockComments.filter((c) => c.id !== commentId);
    return;
  }

  const { error } = await supabase.from('comments').delete().eq('id', commentId);
  if (error) throw error;
}

// ─── Mapper une ligne Supabase → type Comment ─────────────────────────────────

function mapComment(row: any): Comment {
  return {
    id: row.id,
    captureId: row.capture_id,
    userId: row.user_id,
    username: row.username,
    userAvatar: row.user_avatar ?? undefined,
    content: row.content,
    createdAt: row.created_at,
  };
}
