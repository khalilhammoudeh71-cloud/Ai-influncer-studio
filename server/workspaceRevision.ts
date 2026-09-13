export function workspaceWriteRevision(key:string, value:unknown, now=Date.now()):Date {
  if(!key.startsWith('chat_history_super_agent')) return new Date(now);
  if(typeof value!=='string' || !Number.isFinite(Date.parse(value))) throw new Error('Reload the app to save this conversation with version protection.');
  const time=Date.parse(value);
  if(time>now+60000) throw new Error('Your device clock is ahead. Correct it before syncing this conversation.');
  return new Date(time);
}
