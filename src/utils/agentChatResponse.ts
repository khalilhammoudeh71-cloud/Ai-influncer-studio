export async function readAgentChatResponse(response: Response): Promise<any> {
  const data=await response.json().catch(()=>null);
  if (!response.ok) {
    const known=['selected_model_unavailable','planning_failed','unrestricted_provider_unavailable'].includes(data?.error);
    const detail=known && typeof data?.text==='string'?data.text.trim().slice(0,700):'';
    throw new Error(detail || `The planning service returned HTTP ${response.status}. Your message is saved; please retry. No actions were started.`);
  }
  if (!data || typeof data.text!=='string' || !data.text.trim()) throw new Error('The planner returned no usable response. Your message is saved; please retry.');
  return data;
}
