import {writingInstructions,campaignIdeaInstructions} from './agentWriting';
/** Reviewed build-time modules only. User messages cannot install or modify skills. */
const modules = Object.freeze([
 {id:'creator-writing',version:'1.0.0',scope:'current-conversation',instructions:writingInstructions},
 {id:'creator-campaign-ideas',version:'1.0.0',scope:'current-conversation',instructions:campaignIdeaInstructions},
]);
export function selectAgentSkills(prompt:string) {
 return modules.flatMap(module=>{
   const instructions=module.instructions(prompt);
   return instructions?[{id:module.id,version:module.version,scope:module.scope,instructions}]:[];
 });
}
