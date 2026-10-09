// Persist bytes as text rather than relying on Safari's file-backed IDB Blobs.
const cache=new WeakMap();
export function cachedPhotoData(blob){return cache.get(blob);}
export async function photoData(blob){
 if(cache.has(blob))return cache.get(blob);
 let data;
 try{const bytes=new Uint8Array(await blob.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));data=`data:image/jpeg;base64,${btoa(binary)}`;}
 catch(first){if(typeof FileReader==='undefined')throw first;data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error||first);r.readAsDataURL(blob);});}
 if(typeof data!=='string'||!data.startsWith('data:image/jpeg;base64,/9j/'))throw new Error('写真のデータを読み込めません。');cache.set(blob,data);return data;
}
export function photoBlob(data){if(typeof data!=='string'||data.length>16000000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(data))throw new Error('保存写真の形式が不正です。サイトデータを消去せず、バックアップを確認してください。');const bytes=Uint8Array.from(atob(data.split(',')[1]),c=>c.charCodeAt(0));const blob=new Blob([bytes],{type:'image/jpeg'});cache.set(blob,data);return blob;}
