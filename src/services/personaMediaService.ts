import { persistMediaStringsForPlayback } from './workspaceMediaService';

export async function persistPersonaReferenceImages(images: string[], personaId: string): Promise<string[]> {
  void personaId;
  return persistMediaStringsForPlayback(images);
}
