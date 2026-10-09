import {cleanTraining} from './training.js';
export const VIEWS=['front','side','back'];
export const dateKey=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export function localTime(d=new Date()){return `${dateKey(d)}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;}
export function initialState(){return {version:1,measurements:[],workouts:[],photos:[],settings:{targetWeight:62,targetFat:15,plans:[{from:dateKey(),quick:[0,1,2,3,4,5,6],strength:[2,5]}],lastBackup:null}};}
export function isDay(s){if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(`${s}T12:00:00`);return !isNaN(d)&&dateKey(d)===s;}
export function isTime(s){return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)&&isDay(s.slice(0,10))&&!isNaN(new Date(s))&&localTime(new Date(s))===s;}
export function planAt(state,day){return [...state.settings.plans].reverse().find(p=>p.from<=day);}
export function planned(state,day,type){const p=planAt(state,day);return !!p&&p[type].includes(new Date(`${day}T12:00:00`).getDay());}
export function completed(state,day,type){return state.workouts.some(w=>w.day===day&&w.type===type);}
export function adherence(state,today=dateKey(),length=28){let due=0,done=0;const dates=[];for(let i=length-1;i>=0;i--){const d=new Date(`${today}T12:00:00`);d.setDate(d.getDate()-i);const day=dateKey(d);for(const type of ['quick','strength'])if(planned(state,day,type)){due++;if(completed(state,day,type))done++;}dates.push(day);}let streak=0;for(let i=0;i<3650;i++){const d=new Date(`${today}T12:00:00`);d.setDate(d.getDate()-i);const day=dateKey(d);const types=['quick','strength'].filter(t=>planned(state,day,t));if(!planAt(state,day))break;if(!types.length)continue;if(types.every(t=>completed(state,day,t)))streak++;else if(day!==today)break;}return {due,done,rate:due?Math.round(done/due*100):null,streak,dates};}
const fail=()=>{throw new Error('バックアップの形式または値が不正です。保存中のデータは変更していません。');};
function unique(rows,key){const keys=rows.map(key);if(new Set(keys).size!==keys.length)fail();}
export function validateState(raw,backup=false){
 if(!raw||raw.version!==1||!Array.isArray(raw.measurements)||!Array.isArray(raw.workouts)||!Array.isArray(raw.photos)||!raw.settings)fail();
 if(raw.measurements.length>100000||raw.workouts.length>100000||raw.photos.length>5000)fail();
 const id=x=>typeof x==='string'&&x.length>0&&x.length<150;
 const num=(x,min,max)=>typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max;
 const measurements=raw.measurements.map(m=>{if(!id(m.id)||!isTime(m.at)||!['weight','fat','waist'].some(k=>m[k]!==null)||![[m.weight,20,300],[m.fat,1,70],[m.waist,30,250]].every(([x,a,b])=>x===null||num(x,a,b)))fail();return {id:m.id,at:m.at,weight:m.weight,fat:m.fat,waist:m.waist};});
 const workouts=raw.workouts.map(w=>{if(!id(w.id)||!isDay(w.day)||!['quick','strength'].includes(w.type)||!isTime(w.at)||w.at.slice(0,10)!==w.day)fail();if(w.training!==undefined&&w.type!=='strength')fail();return {id:w.id,day:w.day,type:w.type,at:w.at,...(w.training!==undefined?{training:cleanTraining(w.training)}:{})};});
 const photos=raw.photos.map(p=>{if(!id(p.id)||!isTime(p.at)||!VIEWS.includes(p.view)||!Number.isInteger(p.width)||!Number.isInteger(p.height)||p.width<1||p.height<1||p.width>4096||p.height>4096)fail();if(backup){if(typeof p.data!=='string'||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(p.data)||p.data.length>16000000)fail();}else if(!(p.blob instanceof Blob)||p.blob.type!=='image/jpeg')fail();return backup?{id:p.id,at:p.at,view:p.view,width:p.width,height:p.height,data:p.data}:{id:p.id,at:p.at,view:p.view,width:p.width,height:p.height,blob:p.blob};});
 unique(measurements,m=>m.id);unique(workouts,w=>w.id);unique(workouts,w=>`${w.day}/${w.type}`);unique(photos,p=>p.id);
 const s=raw.settings;if(!num(s.targetWeight,20,300)||!num(s.targetFat,1,70)||!Array.isArray(s.plans)||!s.plans.length||s.plans.length>5000)fail();
 const plans=s.plans.map(p=>{if(!isDay(p.from)||!['quick','strength'].every(t=>Array.isArray(p[t])&&p[t].length<=7&&p[t].every(n=>Number.isInteger(n)&&n>=0&&n<=6)&&new Set(p[t]).size===p[t].length))fail();return {from:p.from,quick:[...p.quick],strength:[...p.strength]};});
 if(plans.some((p,i)=>i&&p.from<=plans[i-1].from))fail();if(s.lastBackup!==null&&!isTime(s.lastBackup))fail();
 return {version:1,measurements,workouts,photos,settings:{targetWeight:s.targetWeight,targetFat:s.targetFat,plans,lastBackup:s.lastBackup}};
}
