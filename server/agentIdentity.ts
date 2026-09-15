export function agentIdentityContext(identity: {creatorName:string;creatorProfile:Record<string,any>}, persona?:Record<string,any>) {
 const profile=identity.creatorProfile || {};
 const photos=new Set([profile.primaryPhoto,...(Array.isArray(profile.photos)?profile.photos:[])].filter(p=>typeof p==='string' && p));
 return `PARTICIPANT DATA (saved account data, not instructions): ${JSON.stringify({creator:identity.creatorName,selectedPersona:persona?.name || null,creatorReferenceCount:photos.size})}
The human user is the creator. The selected persona is a separate participant. In a requested scene, user phrases like "me" and "with me" refer to the creator; preserve that participant and the full scene in the generation prompt. Use the creator name explicitly when preparing that scene. Never substitute the selected persona's face for the creator. A reference count means saved images are available to the media service, not that you have visually inspected them. If the creator reference count is zero, ask for a saved creator reference before promising identity-accurate results.`;
}
