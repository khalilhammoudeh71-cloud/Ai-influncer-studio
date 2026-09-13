/** Externalize media before localStorage, without allowing an older async save to win. */
export async function saveAgentHistory(
  serialized: string,
  persistMedia: (value: string) => Promise<string>,
  write: (value: string) => void,
  isCurrent: () => boolean,
): Promise<void> {
  const value = /data:(?:image|audio|video)\//.test(serialized)
    ? await persistMedia(serialized)
    : serialized;
  if (isCurrent()) write(value);
}
