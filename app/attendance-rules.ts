import type { Data, Rehearsal, Voice } from "./data";
export type RepeatPlan = { days: number[]; until: string };
export type AbsenceSummary = {
 streaks: { name: string; voice: Voice; streak: number }[];
 rehearsals: { title: string; date: string; time: string; absent: {name:string;voice:Voice}[] }[];
};
export function repeatDates(start: string, plan: RepeatPlan): string[] {
 const first = new Date(start + "T00:00:00Z"), last = new Date(plan.until + "T00:00:00Z");
 if (!Number.isFinite(+first) || !Number.isFinite(+last) || last < first || +last - +first > 366*86400000) throw new Error("Choose an end date within one year of the first rehearsal.");
 if (!plan.days.length || plan.days.some(day=>!Number.isInteger(day)||day<0||day>6)) throw new Error("Select at least one rehearsal day.");
 const dates: string[] = [];
 for (const date = new Date(first); date <= last; date.setUTCDate(date.getUTCDate()+1)) {
  if (plan.days.includes(date.getUTCDay())) dates.push(date.toISOString().slice(0,10));
 }
 if (!dates.length) throw new Error("No selected weekdays occur in this date range.");
 return dates;
}
export function localChoirTime(now = new Date()) {
 const parts = new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Manila",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}).formatToParts(now);
 const p = Object.fromEntries(parts.map(part=>[part.type,part.value]));
 return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`;
}
export function rehearsalStarted(r:Rehearsal, now = new Date()) { return `${r.date}T${r.time.length===5?r.time+":00":r.time}` <= localChoirTime(now); }
export function absenceSummary(data:Data, now = new Date()):AbsenceSummary {
 const recorded=new Set(data.attendance.map(a=>a.rehearsal_id));
 const marks=new Map(data.attendance.map(a=>[`${a.rehearsal_id}:${a.member_id}`,a]));
 const sortKey=(r:Rehearsal)=>`${r.date}${r.time.length===5?r.time+":00":r.time}${r.id}`;
 const regular=data.rehearsals.filter(r=>r.kind!=="Extra"&&!r.cancelled&&rehearsalStarted(r,now)&&recorded.has(r.id)).sort((a,b)=>sortKey(b).localeCompare(sortKey(a)));
 const streaks=data.members.filter(m=>m.status==="Active").map(m=>{
  let streak=0;
  for(const r of regular){
   if(m.joined&&r.date<m.joined)break;
   const record=marks.get(`${r.id}:${m.id}`);
   // Unmarked members never become absent automatically or join two runs of absences.
   if(record?.status!=="Absent")break;
   streak++;
  }
  return {name:m.name,voice:m.voice,streak};
 }).filter(m=>m.streak>0).sort((a,b)=>b.streak-a.streak||a.name.localeCompare(b.name));
 return {streaks,rehearsals:regular.map(r=>({title:r.title,date:r.date,time:r.time,absent:data.attendance.filter(a=>a.rehearsal_id===r.id&&a.status==="Absent").flatMap(a=>{const m=data.members.find(m=>m.id===a.member_id);return m?[{name:m.name,voice:m.voice}]:[];}).sort((a,b)=>a.name.localeCompare(b.name))}))};
}
