import type { Data, Rehearsal } from "./data";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const connected = Boolean(url && key);
type Session = {access_token:string; refresh_token:string; expires_at:number};
let session: Session | null = null;
let refreshing: Promise<void> | null = null;
export function hasSession() { try { session=JSON.parse(sessionStorage.getItem("duyog-session") || "null"); } catch {session=null;} return !!session; }
async function auth(body: object, grant: string) {
 const res=await fetch(`${url}/auth/v1/token?grant_type=${grant}`,{method:"POST",headers:{apikey:key!,"Content-Type":"application/json"},body:JSON.stringify(body)});
 const result=await res.json(); if(!res.ok) throw new Error(result.msg || result.error_description || "Sign in failed.");
 session={access_token:result.access_token,refresh_token:result.refresh_token,expires_at:Date.now()+result.expires_in*1000};
 sessionStorage.setItem("duyog-session",JSON.stringify(session));
}
export async function signIn(email:string,password:string) { await auth({email,password},"password"); }
export async function signOut() { try { if(session) await fetch(`${url}/auth/v1/logout`,{method:"POST",signal:AbortSignal.timeout(8000),headers:{apikey:key!,Authorization:`Bearer ${session.access_token}`}}); } finally {session=null;sessionStorage.removeItem("duyog-session");} }
async function request(path:string, method="GET",body?:unknown) {
 if(!session) throw new Error("Please sign in again.");
 if(session.expires_at<Date.now()+60000) { refreshing ??= auth({refresh_token:session.refresh_token},"refresh_token").finally(()=>{refreshing=null;}); await refreshing; }
 const res=await fetch(`${url}/rest/v1/${path}`,{method,headers:{apikey:key!,Authorization:`Bearer ${session!.access_token}`,"Content-Type":"application/json",Prefer:"return=representation,resolution=merge-duplicates"},body:body===undefined?undefined:JSON.stringify(body)});
 if(!res.ok) { const error=await res.json(); throw new Error(error.message || "Unable to save changes."); }
 return res.status===204 ? null : res.json();
}
async function allRows(path:string) {
 const all=[];
 for(let offset=0;;offset+=500){const page=await request(`${path}&limit=500&offset=${offset}`);all.push(...page);if(page.length<500)return all;}
}
export async function loadData():Promise<Data> {
 const admins=await request("choir_admins?select=user_id");
 if(!admins.length)throw new Error("This account is not a choir administrator. Ask your project owner to add your Auth user ID to choir_admins.");
 const [members,rehearsals,attendance]=await Promise.all([allRows("members?order=name,id"),allRows("rehearsals?order=date,time,id"),allRows("attendance?order=id")]);
 return {members,rehearsals,attendance};
}
export async function saveRehearsalBatch(rows:Rehearsal[]):Promise<Rehearsal[]> { return request("rpc/create_rehearsal_batch","POST",{rows}); }
export async function saveRow(table:keyof Data,row:object) { await request(table,"POST",row); }
export async function deleteRow(table:keyof Data,id:string) { await request(`${table}?id=eq.${encodeURIComponent(id)}`,"DELETE"); }
export async function saveAttendance(rows:Data["attendance"]) { if(rows.length) await request("attendance?on_conflict=rehearsal_id,member_id","POST",rows); }



export type PublicAttendance = {
 title: string; date: string; time: string;
 attendees: { name: string; voice: import("./data").Voice }[];
};
export async function loadPublicAttendance(signal?: AbortSignal): Promise<PublicAttendance | null> {
 const response = await fetch(`${url}/rest/v1/rpc/recent_public_attendance`, {
  method: "POST", headers: { apikey: key!, "Content-Type": "application/json" },
  body: "{}", cache: "no-store", signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000),
 });
 if (!response.ok) throw new Error("Recent attendance is unavailable.");
 return response.json();
}

export async function loadPublicAbsences(signal?:AbortSignal):Promise<import("./attendance-rules").AbsenceSummary> {
 const response=await fetch(`${url}/rest/v1/rpc/public_absence_watch`,{method:"POST",headers:{apikey:key!,"Content-Type":"application/json"},body:"{}",cache:"no-store",signal:signal?AbortSignal.any([signal,AbortSignal.timeout(10000)]):AbortSignal.timeout(10000)});
 if(!response.ok)throw new Error("Absence information is unavailable.");
 return response.json();
}
