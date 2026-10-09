import {initialState,validateState,isTime} from './core.js';
import {photoData,photoBlob,cachedPhotoData} from './photo-data.js';
let database;
const legacyBlobs=new WeakSet();
export function decodeStoredState(raw){
 if(!raw)return initialState();
 if(!Array.isArray(raw.photos))throw new Error('保存写真の一覧が不正です。');
 const photos=raw.photos.map(p=>{if(typeof p.data==='string'){const {data,...meta}=p;return {...meta,blob:photoBlob(data)};}if(p.blob instanceof Blob)legacyBlobs.add(p.blob);return p;});
 return validateState({...raw,photos});
}
export async function detachPhotoReferences(state){
 const photos=[];
 for(const p of state.photos){if(cachedPhotoData(p.blob)){photos.push(p);continue;}try{
  // Read a legacy file-backed Blob once, then display/export owned bytes.
  const data=await photoData(p.blob);photos.push({...p,blob:photoBlob(data)});
 }catch{photos.push(p);}}
 return {...state,photos};
}
export async function encodeStoredState(state){
 const clean=validateState(state),photos=[];
 for(const p of clean.photos){const {blob,...meta}=p;try{photos.push({...meta,data:await photoData(blob)});}catch(e){
  // Keep unreadable legacy references for potential recovery. Never silently
  // drop a photograph, and never accept unreadable newly captured images.
  if(legacyBlobs.has(blob))photos.push(p);else throw new Error('写真を保存できませんでした。元データは変更していません。写真を選び直して再試行してください。');
 }}
 return {...clean,photos};
}
export async function openDB(){database=await new Promise((resolve,reject)=>{const r=indexedDB.open('body-recomp-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('data');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(new Error('別の画面でアプリを開いています。その画面を閉じてから再読み込みしてください。'));});database.onversionchange=()=>database.close();return database;}
export async function readState(){const raw=await new Promise((resolve,reject)=>{let value,savedAt;const t=database.transaction('data','readonly'),store=t.objectStore('data'),r=store.get('state'),m=store.get('lastBackup');r.onsuccess=()=>value=r.result;m.onsuccess=()=>savedAt=m.result;t.oncomplete=()=>{if(savedAt!==undefined){const base=value||initialState();value={...base,settings:{...base.settings,lastBackup:savedAt}};}resolve(value);};t.onabort=()=>reject(t.error||new Error('記録を読み込めませんでした。'));t.onerror=()=>{};});return detachPhotoReferences(decodeStoredState(raw));}
export async function writeState(state){const clean=validateState(state),stored=await encodeStoredState(clean);return new Promise((resolve,reject)=>{const t=database.transaction('data','readwrite'),store=t.objectStore('data');store.put(stored,'state');store.put(clean.settings.lastBackup,'lastBackup');t.oncomplete=()=>resolve(decodeStoredState(stored));t.onabort=()=>reject(t.error||new Error('保存を完了できませんでした。'));t.onerror=()=>{};});}
export async function saveBackupTime(at){if(!isTime(at))throw new Error('保存確認日時が不正です。');return new Promise((resolve,reject)=>{const t=database.transaction('data','readwrite');t.objectStore('data').put(at,'lastBackup');t.oncomplete=resolve;t.onabort=()=>reject(t.error||new Error('保存確認を記録できませんでした。'));t.onerror=()=>{};});}
