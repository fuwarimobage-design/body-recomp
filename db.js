import {initialState,validateState} from './core.js';
import {photoData,photoBlob} from './photo-data.js';
let database;
const legacyBlobs=new WeakSet();
export function decodeStoredState(raw){
 if(!raw)return initialState();
 if(!Array.isArray(raw.photos))throw new Error('保存写真の一覧が不正です。');
 const photos=raw.photos.map(p=>{if(typeof p.data==='string'){const {data,...meta}=p;return {...meta,blob:photoBlob(data)};}if(p.blob instanceof Blob)legacyBlobs.add(p.blob);return p;});
 return validateState({...raw,photos});
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
export async function readState(){return new Promise((resolve,reject)=>{const t=database.transaction('data','readonly'),r=t.objectStore('data').get('state');r.onsuccess=()=>{try{resolve(decodeStoredState(r.result));}catch(e){reject(e);}};r.onerror=()=>reject(r.error);});}
export async function writeState(state){const clean=validateState(state),stored=await encodeStoredState(clean);return new Promise((resolve,reject)=>{const t=database.transaction('data','readwrite');t.objectStore('data').put(stored,'state');t.oncomplete=()=>resolve(clean);t.onabort=()=>reject(t.error||new Error('保存を完了できませんでした。'));t.onerror=()=>{};});}
