import { File } from 'expo-file-system/next';
import { supabase } from '../config/supabase';

export async function uploadCapturePhoto(
  userId: string,
  captureId: string,
  localUri: string
): Promise<string> {
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
