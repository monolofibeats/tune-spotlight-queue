import { supabase } from '@/integrations/supabase/client';

/**
 * Generate a signed URL for accessing a private audio file
 * @param filePath - The path to the file in the song-files bucket
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns The signed URL or null if failed
 */
export async function getSignedAudioUrl(
  filePath: string | null | undefined,
  expiresIn: number = 3600
): Promise<string | null> {
  if (!filePath) return null;
  
  // If it's already a full URL (legacy data), return as-is
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }
  
  try {
    const { data, error } = await supabase.storage
      .from('song-files')
      .createSignedUrl(filePath, expiresIn);
    
    if (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }
    
    return data.signedUrl;
  } catch (error) {
    console.error('Failed to get signed URL:', error);
    return null;
  }
}
