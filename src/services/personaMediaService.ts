import { supabase } from '../lib/supabase';

const PERSONA_MEDIA_BUCKET = 'Images';

const MIME_EXTENSIONS: Record<string, string> = {
  'image/avif': 'avif',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function isDataImage(value: string): boolean {
  return /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(value);
}

function dataUrlToBlob(dataUrl: string): { blob: Blob; contentType: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('One of the reference photos has an unsupported format');

  const contentType = match[1];
  const binary = window.atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return { blob: new Blob([bytes], { type: contentType }), contentType };
}

async function uploadReferenceImage(
  image: string,
  userId: string,
  personaId: string,
  index: number,
): Promise<string> {
  if (!isDataImage(image)) return image;

  const { blob, contentType } = dataUrlToBlob(image);
  const extension = MIME_EXTENSIONS[contentType] || 'jpg';
  const safePersonaId = personaId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const objectPath = `${userId}/personas/${safePersonaId}/reference-${index}.${extension}`;

  const { error } = await supabase.storage
    .from(PERSONA_MEDIA_BUCKET)
    .upload(objectPath, blob, {
      cacheControl: '31536000',
      contentType,
      upsert: true,
    });

  if (error) {
    console.error('[Persona Reference Upload Error]:', error);
    throw new Error(`Could not upload reference photo ${index + 1}: ${error.message}`);
  }

  const { data } = supabase.storage.from(PERSONA_MEDIA_BUCKET).getPublicUrl(objectPath);
  if (!data.publicUrl) throw new Error(`Could not create a URL for reference photo ${index + 1}`);
  return data.publicUrl;
}

export async function persistPersonaReferenceImages(images: string[], personaId: string): Promise<string[]> {
  if (!images.some(isDataImage)) return images;

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error('Please sign in again before publishing this persona');
  }

  const uploadedImages: string[] = [];
  const batchSize = 3;

  for (let start = 0; start < images.length; start += batchSize) {
    const batch = images.slice(start, start + batchSize);
    const batchUrls = await Promise.all(
      batch.map((image, offset) => uploadReferenceImage(image, data.user.id, personaId, start + offset)),
    );
    uploadedImages.push(...batchUrls);
  }

  return uploadedImages;
}
