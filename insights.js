import {dateKey,isDay} from './core.js';
export const metricKeys=['weight','fat','waist'];
export function shiftMonth(month,offset){const d=new Date(`${month}-01T12:00:00`);d.setMonth(d.getMonth()+offset);return dateKey(d).slice(0,7);}
export function monthStats(measurements,month){
 const rows=measurements.filter(m=>m.at.startsWith(month));
 return Object.fromEntries(metricKeys.map(key=>{const days=new Map();for(const m of rows)if(m[key]!==null){const day=m.at.slice(0,10),v=days.get(day)||[];v.push(m[key]);days.set(day,v);}const daily=[...days.values()].map(v=>v.reduce((a,b)=>a+b,0)/v.length);return [key,{average:daily.length?daily.reduce((a,b)=>a+b,0)/daily.length:null,days:daily.length,count:rows.filter(m=>m[key]!==null).length}];}));
}
export function graphPoints(measurements,key,month,range,mode){
 const first=range==='three'?shiftMonth(month,-2):month;
 const rows=measurements.filter(m=>m[key]!==null&&(range==='all'||m.at.slice(0,7)>=first&&m.at.slice(0,7)<=month)).sort((a,b)=>a.at.localeCompare(b.at));
 if(mode!=='monthly')return rows;
 return [...new Set(rows.map(m=>m.at.slice(0,7)))].sort().map(month=>({at:month+'-01T12:00',[key]:monthStats(rows,month)[key].average}));
}
export function availableMonths(state,today=dateKey()){
 return [...new Set([today.slice(0,7),...state.measurements.map(m=>m.at.slice(0,7)),...state.workouts.map(w=>w.day.slice(0,7)),...state.photos.map(p=>p.at.slice(0,7))])].sort().reverse();
}
export function monthReview(state,month){const current=monthStats(state.measurements,month),previous=monthStats(state.measurements,shiftMonth(month,-1));return {current,previous,quick:state.workouts.filter(w=>w.type==='quick'&&w.day.startsWith(month)).length,strength:state.workouts.filter(w=>w.type==='strength'&&w.day.startsWith(month)).length,photos:['front','side','back'].map(view=>state.photos.filter(p=>p.view===view&&p.at.startsWith(month)).sort((a,b)=>b.at.localeCompare(a.at))[0]||null)};}
export function backupReminder(state,today=dateKey()){
 if(!state.measurements.length&&!state.workouts.length&&!state.photos.length)return null;
 const last=state.settings.lastBackup;if(!last)return 'まだバックアップの保存確認がありません。記録と写真を「ファイル」に保存しましょう。';
 const day=last.slice(0,10);if(!isDay(day))return null;
 const nextMonth=shiftMonth(day.slice(0,7),1),end=new Date(`${shiftMonth(nextMonth,1)}-01T12:00:00`);end.setDate(0);const due=nextMonth+'-'+String(Math.min(Number(day.slice(8)),end.getDate())).padStart(2,'0');
 return today>=due?'最後のバックアップ保存確認から1か月経ちました。最新の記録と写真を保存しましょう。':null;
}
