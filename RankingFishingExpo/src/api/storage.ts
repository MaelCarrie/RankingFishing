import { File } from 'expo-file-system/next';
import { supabase, USE_MOCK_DATA } from '../config/supabase';

// En mode mock, aucun upload : on réutilise directement l'URI locale de la photo.

export async function uploadCapturePhoto(
  userId: string,
  captureId: string,
  localUri: string
): Promise<string> {
  if (USE_MOCK_DATA) return localUri;

  const file = new File(localUri);
  const bytes = await file.bytes();

  const fileName = `${userId}/${captureId}/${Date.now()}.jpg`;

  const { error } = await supabase.storage
    .from('captures')
    .upload(fileName, bytes, { contentType: 'image/jpeg' });

  if (error) throw error;

  const { data } = supabase.storage.from('captures').getPublicUrl(fileName);
  return data.publicUrl;
}

export async function uploadAvatar(userId: string, localUri: string): Promise<string> {
  if (USE_MOCK_DATA) return localUri;

  const file = new File(localUri);
  const bytes = await file.bytes();

  const fileName = `${userId}/avatar.jpg`;

  const { error } = await supabase.storage
    .from('avatars')
    .upload(fileName, bytes, { contentType: 'image/jpeg', upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
  return data.publicUrl;
}
