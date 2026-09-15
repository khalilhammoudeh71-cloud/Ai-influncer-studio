export const SEQUENCE_STYLES = [
 ['same-shoot','Same shoot — varied poses and framing'],['camera-angles','Different camera angles'],['expressions','Expressions and mood'],['details','Close-ups and detail shots'],['outfits','Outfit changes / lookbook'],['locations','Different locations'],['day-in-life','Day in the life'],['travel','Travel diary'],['story','A visual story with a beginning and ending'],['before-after','Before and after'],['tutorial','Step-by-step demonstration'],['product','Product showcase'],['lighting','Lighting and time of day'],['seasonal','Seasons and weather'],['editorial','Fashion editorial'],['action','Movement and action'],['behind-scenes','Behind the scenes'],['custom','Your own sequence']
] as const;
export function validateSequence(data:any,count:number):{slide:number;options:{title:string;prompt:string}[]}[]{
 if(!Array.isArray(data?.slides)||data.slides.length!==count-1)throw new Error('The sequence was incomplete. Try again.');
 return data.slides.map((s:any,i:number)=>{
  if(!Array.isArray(s.options)||s.options.length<2||s.options.length>4)throw new Error('The sequence needs more photo options. Try again.');
  return {slide:i+1,options:s.options.map((o:any)=>{if(typeof o.title!=='string'||!o.title.trim()||typeof o.prompt!=='string'||!o.prompt.trim()||o.prompt.length>1800)throw new Error('A suggestion was incomplete. Try again.');return {title:o.title.slice(0,100),prompt:o.prompt};})};
 });
}
