import assert from 'node:assert/strict';
import test from 'node:test';
class MemoryStorage {
  data = new Map<string,string>();
  get length(){return this.data.size;}
  key(i:number){return [...this.data.keys()][i] ?? null;}
  getItem(k:string){return this.data.get(k) ?? null;}
  setItem(k:string,v:string){this.data.set(k,v);}
  removeItem(k:string){this.data.delete(k);}
  clear(){this.data.clear();}
}
Object.defineProperty(globalThis,'localStorage',{value:new MemoryStorage(),configurable:true});
Object.defineProperty(globalThis,'sessionStorage',{value:new MemoryStorage(),configurable:true});
const storage = await import('./accountStorage');

test('unsynced local history survives a later timestamp on an older cloud snapshot', async () => {
  localStorage.clear(); storage.setActiveStorageUserId('qa');
  const saved:string[]=[];
  storage.configureAccountStorageSync({list:async()=>[{key:'chat_history_super_agent',value:'old',updatedAt:'2099-01-01T00:00:00Z'}],save:async(key,value)=>{saved.push(value);return {key,value,updatedAt:'2099-01-02T00:00:00Z'};},remove:async()=>{}});
  storage.accountLocalStorage.setItem('chat_history_super_agent','newest');
  await storage.hydrateAccountLocalStorage('qa');
  assert.equal(storage.accountLocalStorage.getItem('chat_history_super_agent'),'newest');
  assert.ok(saved.includes('newest'));
  storage.setActiveStorageUserId(null);
});

test('cloud hydration cannot overwrite changes made while media is being prepared', async () => {
  localStorage.clear(); storage.setActiveStorageUserId('qa');
  let release!:(value:string)=>void;
  const waiting = new Promise<string>(resolve=>release=resolve);
  let started!:()=>void; const preparing=new Promise<void>(resolve=>started=resolve);
  storage.configureAccountStorageSync({list:async()=>[{key:'chat_history_super_agent',value:'old',updatedAt:'2099-01-01T00:00:00Z'}],prepareForLocal:()=>{started();return waiting;},save:async(key,value)=>({key,value,updatedAt:new Date().toISOString()}),remove:async()=>{}});
  const hydration=storage.hydrateAccountLocalStorage('qa');
  await preparing;
  storage.accountLocalStorage.setItem('chat_history_super_agent','newest');
  release('old'); await hydration;
  assert.equal(storage.accountLocalStorage.getItem('chat_history_super_agent'),'newest');
  storage.setActiveStorageUserId(null);
});

test('an old upload finishing last is followed by the latest value, not lost history', async () => {
  localStorage.clear(); storage.setActiveStorageUserId('qa');
  let releaseOld!:()=>void, oldStarted!:()=>void, newStarted!:()=>void, repaired!:()=>void;
  const oldGate=new Promise<void>(resolve=>releaseOld=resolve);
  const oldReady=new Promise<void>(resolve=>oldStarted=resolve);
  const newReady=new Promise<void>(resolve=>newStarted=resolve);
  const repairedReady=new Promise<void>(resolve=>repaired=resolve);
  let cloud='',newSaves=0;
  storage.configureAccountStorageSync({list:async()=>[],save:async(key,value)=>{
    if(value==='old'){oldStarted();await oldGate;}
    cloud=value;
    if(value==='new'){newSaves++;newStarted();if(newSaves===2)repaired();}
    return {key,value,updatedAt:new Date().toISOString()};
  },remove:async()=>{}});
  storage.accountLocalStorage.setItem('chat_history_super_agent','old');
  await oldReady;
  storage.accountLocalStorage.setItem('chat_history_super_agent','new');
  await newReady;releaseOld();await repairedReady;
  assert.equal(cloud,'new');
  assert.equal(storage.accountLocalStorage.getItem('chat_history_super_agent'),'new');
  storage.setActiveStorageUserId(null);
});
