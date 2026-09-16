export class AgentContextLimitError extends Error {}
/** Request-only context selection. Never mutates the saved conversation. */
export function prepareAgentContext(input: any[]) {
  const messages = input.filter(m => m && ['user','model','assistant'].includes(m.role)).map(m => ({...m, role:m.role==='assistant'?'model':m.role, content:typeof m.content==='string'?m.content:String(m.content?.text || '')}));
  const before = messages.reduce((n,m)=>n+m.content.length,0);
  let masked = 0;
  if (before > 48000) {
    messages.forEach((m,i)=>{
      // Preserve brief, corrections, recent reasoning, saved task state and campaign drafts.
      if (i < messages.length-12 && m.role==='model' && !/\[Workspace task state|\[Saved campaign draft/.test(m.content) && m.content.length>600) {
        m.content='[Older assistant reply omitted from this request; do not infer its contents. Ask for the relevant passage if needed.]'; masked++;
      }
    });
  }
  const after = messages.reduce((n,m)=>n+m.content.length,0);
  if (after > 120000) throw new AgentContextLimitError('This conversation exceeds the planning context limit. Start a new project conversation with the current brief and constraints. Your saved history is unchanged.');
  return {messages, metrics:{inputCharacters:before, sentCharacters:after, maskedAssistantReplies:masked}};
}
