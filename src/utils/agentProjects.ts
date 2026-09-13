export interface AgentProject { id: string; name: string }
export function projectKeys(id: string) {
  return id === 'default' ? {history:'chat_history_super_agent',brief:'super_agent_brief'} :
    {history:`chat_history_super_agent_project_${id}`,brief:`super_agent_project_brief_${id}`};
}
export function readProjects(raw: string | null): AgentProject[] {
  const projects: AgentProject[]=[{id:'default',name:'Main workspace'}];
  try {
    const parsed=JSON.parse(raw || '[]');
    if(Array.isArray(parsed)) for(const item of parsed) {
      if(item && typeof item.id==='string' && /^[a-zA-Z0-9_-]+$/.test(item.id) && typeof item.name==='string' && item.name.trim() && !projects.some(p=>p.id===item.id))
        projects.push({id:item.id,name:item.name.trim().slice(0,80)});
    }
  } catch {}
  return projects;
}
