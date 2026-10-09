import {validateState,isTime} from './core.js';
import {photoData} from './photo-data.js';
export async function prepareBackup(snapshot,exportedAt,recordsOnly=false,skipUnreadable=false){
 const clean=validateState(snapshot);if(!isTime(exportedAt))throw new Error('書き出し日時が不正です。');
 const photos=[],missingPhotos=[];
 if(!recordsOnly)for(const p of clean.photos){const {blob,...meta}=p;try{photos.push({...meta,data:await photoData(blob)});}catch{if(skipUnreadable)missingPhotos.push(meta);else throw new Error(`${p.at.replace('T',' ')}の写真を読み込めず、写真込みのバックアップを準備できません。元データは変更していません。「読める写真と記録を救出」または「写真なしで記録を救出」を使えます。`);}}
 const payload={...clean,settings:{...clean.settings,lastBackup:exportedAt},photos,app:'BODY RECOMP',exportedAt};
 if(recordsOnly)payload.backupNote='写真を含まない救出用バックアップ';
 if(missingPhotos.length){payload.backupNote=`読み込めない写真${missingPhotos.length}枚を含まない救出用バックアップ`;payload.unreadablePhotos=missingPhotos;}
 const file=new File([JSON.stringify(payload)],`body-recomp-${recordsOnly?'records-only-':missingPhotos.length?'readable-only-':''}${exportedAt.slice(0,10)}.json`,{type:'application/json'});
 if(file.size>150*1024*1024)throw new Error('バックアップが初版の復元上限150MBを超えています。元データは変更していません。');
 return {file,exportedAt,recordsOnly,partial:!!missingPhotos.length,missingPhotos,counts:{measurements:clean.measurements.length,workouts:clean.workouts.length,photos:photos.length}};
}
export function canSaveViaShare(file,navigatorObject=navigator){try{return typeof navigatorObject.share==='function'&&!!navigatorObject.canShare?.({files:[file]});}catch{return false;}}
// Called directly by a new tap, before any await, so iOS keeps user activation.
export function sharePreparedFile(prepared,navigatorObject=navigator){return navigatorObject.share({files:[prepared.file],title:'BODY RECOMP バックアップ'});}
