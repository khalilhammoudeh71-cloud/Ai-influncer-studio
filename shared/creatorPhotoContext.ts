/** Stored references are available inputs, not proof the model saw an image or made media. */
export function buildCreatorPhotoContext(profile: { primaryPhoto?: unknown; photos?: unknown } | null | undefined): string {
  const photos = new Set([profile?.primaryPhoto, ...(Array.isArray(profile?.photos) ? profile.photos : [])]
    .filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
    .map(value => value.trim()));
  const availability = photos.size
    ? `${photos.size} creator reference photo(s) are configured. This is not evidence that you have seen their contents in this turn.`
    : 'No creator reference photo is configured. If an identity-matched image is requested, ask for a reference instead of claiming one is loaded.';
  return `• Creator Reference Photos: ${availability}\n• Media actions require the current user request and a supported tool. Only claim creation or delivery after a successful tool result; an available reference is not a completed action.`;
}
