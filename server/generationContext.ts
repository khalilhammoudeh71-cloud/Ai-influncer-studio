import {AsyncLocalStorage} from 'node:async_hooks';
type GenerationContext={jobId?:string;attempt?:number;runId?:string};
const context=new AsyncLocalStorage<GenerationContext>();
export function withGenerationContext<T>(value:GenerationContext,run:()=>T):T{return context.run(Object.freeze({...value}),run);}
export function generationMetadata(metadata:Record<string,unknown>={}):Record<string,unknown>{return {...metadata,...context.getStore()};}
export function activeGenerationContext(){return context.getStore();}
