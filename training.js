export function cleanTraining(raw){
 if(!raw||!Array.isArray(raw.exercises)||raw.exercises.length>30||typeof raw.note!=='string'||raw.note.length>1000)throw new Error('筋トレ内容の形式が不正です。');
 const exercises=raw.exercises.map(e=>{
  if(typeof e.name!=='string'||!e.name.trim()||e.name.length>80||!Number.isInteger(e.sets)||e.sets<1||e.sets>100||!Number.isInteger(e.reps)||e.reps<1||e.reps>1000||!(e.weight===null||typeof e.weight==='number'&&Number.isFinite(e.weight)&&e.weight>=0&&e.weight<=1000))throw new Error('種目名・セット数・回数・重さを確認してください。');
  return {name:e.name.trim(),sets:e.sets,reps:e.reps,weight:e.weight};
 });
 if(new Set(exercises.map(e=>e.name)).size!==exercises.length)throw new Error('同じ種目は1行にまとめてください。');
 return {exercises,note:raw.note.trim()};
}
export function priorTraining(workouts,day){return workouts.filter(w=>w.type==='strength'&&w.day<day&&w.training?.exercises.length).sort((a,b)=>b.day.localeCompare(a.day))[0];}
export function compareTraining(current,previous){
 return (current?.training?.exercises||[]).map(e=>{const p=previous?.training?.exercises.find(p=>p.name===e.name);return {current:e,previous:p||null,sets:p?e.sets-p.sets:null,reps:p?e.reps-p.reps:null,weight:p&&e.weight!==null&&p.weight!==null?e.weight-p.weight:null};});
}
