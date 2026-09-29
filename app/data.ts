export type Voice = "Soprano" | "Alto" | "Tenor" | "Bass";
export type Member = { id: string; name: string; voice: Voice; email: string; phone: string; birthday: string; joined: string; status: "Active" | "Inactive"; photo: string; notes: string };
export type Rehearsal = { id: string; title: string; date: string; time: string; location: string; notes: string };
export type Attendance = { id: string; rehearsal_id: string; member_id: string; status: "Present" | "Late" | "Absent" | "Excused" };
export type Data = { members: Member[]; rehearsals: Rehearsal[]; attendance: Attendance[] };
export const voices: Voice[] = ["Soprano", "Alto", "Tenor", "Bass"];
export const statuses: Attendance["status"][] = ["Present", "Late", "Absent", "Excused"];
export function dateLabel(date: string, options?: Intl.DateTimeFormatOptions) { return new Date(date + "T12:00:00").toLocaleDateString("en-US", options || { month: "short", day: "numeric", year: "numeric" }); }
export function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
export function timeLabel(time: string) { const [h,m] = time.split(":"); return `${Number(h)%12 || 12}:${m} ${Number(h)>=12 ? "PM" : "AM"}`; }
export function seed(): Data {
 const names = ["Isabella Reyes", "Sofia Mendoza", "Gabrielle Santos", "Angela Cruz", "Camille Garcia", "Maria Villanueva", "Patricia Lim", "Bianca Torres", "Miguel Santos", "Gabriel Ramos", "Joshua Dela Cruz", "Daniel Flores", "Paolo Navarro", "Rafael Castillo", "Adrian Bautista", "Luis Mercado"];
 const members: Member[] = names.map((name,i) => ({ id: `00000000-0000-4000-8000-${String(i+1).padStart(12,"0")}`, name, voice: voices[Math.floor(i/4)], email: name.toLowerCase().replaceAll(" ",".")+"@example.com", phone: "+63 917 000 "+String(1000+i), birthday: `199${i%10}-0${i%9+1}-15`, joined: "2026-01-12", status: "Active", photo: "", notes: i===0 ? "Section leader. Please contact for soprano sectionals." : "" }));
 const rehearsals = [-21,-14,-7,0,4,7].map((offset,i) => { const d = new Date(); d.setDate(d.getDate()+offset); return { id: `10000000-0000-4000-8000-${String(i+1).padStart(12,"0")}`, title: ["Sunday Service Rehearsal","Full Choir Rehearsal","Christmas Repertoire","Full Choir Rehearsal","Sectional Practice","Sunday Service Rehearsal"][i], date: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`, time: i===4 ? "15:00" : "18:00", location: i===4 ? "Music Room" : "Parish Hall", notes: "Warm-ups, section work, and full ensemble practice." }; });
 const attendance: Attendance[] = rehearsals.slice(0,3).flatMap((r,ri) => members.map((m,i) => ({id:crypto.randomUUID(), rehearsal_id:r.id, member_id:m.id, status: (i+ri)%11===0 ? "Absent" : (i+ri)%7===0 ? "Late" : "Present"})));
 return {members,rehearsals,attendance};
}
export function rate(records: Attendance[]) { const eligible=records.filter(r=>r.status!=="Excused"); return eligible.length ? Math.round(eligible.filter(r=>r.status==="Present" || r.status==="Late").length/eligible.length*100) : null; }
