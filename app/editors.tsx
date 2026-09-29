"use client";

import { useState, type FormEvent } from "react";

import { type Member, type Rehearsal, voices, today } from "./data";

import { Avatar, Modal } from "./ui";

import { repeatDates, type RepeatPlan } from "./attendance-rules";

type Common = {save:(e:FormEvent<HTMLFormElement>)=>void;close:()=>void;busy:boolean;error:string};

export function MemberEditor({value:m,set,save,close,busy,error,setError}:Common&{value:Member;set:(v:Member)=>void;setError:(s:string)=>void}) {

 return <Modal title="Member details" close={close}><form onSubmit={save}><div className="photo-upload"><Avatar member={m} large/><label className="btn">Upload photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>500*1024||!["image/jpeg","image/png","image/webp"].includes(file.type)){setError("Choose a JPG, PNG, or WebP image smaller than 500 KB.");return;}const reader=new FileReader();reader.onload=()=>{set({...m,photo:String(reader.result)});setError("");};reader.onerror=()=>setError("Could not read this image.");reader.readAsDataURL(file);}}/></label>{m.photo&&<button type="button" className="text-button" onClick={()=>set({...m,photo:""})}>Remove</button>}<small>JPG, PNG or WebP · Max 500 KB</small></div><fieldset disabled={busy} className="form-grid"><label className="full">Full name (required)<input required maxLength={100} value={m.name} onChange={e=>set({...m,name:e.target.value})}/></label><label>Voice part (required)<select required value={m.voice} onChange={e=>set({...m,voice:e.target.value as Member["voice"]})}>{voices.map(v=><option key={v}>{v}</option>)}</select></label><label>Status<select value={m.status} onChange={e=>set({...m,status:e.target.value as Member["status"]})}><option>Active</option><option>Inactive</option></select></label><label>Email (optional)<input type="email" value={m.email ?? ""} onChange={e=>set({...m,email:e.target.value})}/></label><label>Phone (optional)<input type="tel" value={m.phone ?? ""} onChange={e=>set({...m,phone:e.target.value})}/></label><label>Birthday (optional)<input type="date" max={today()} value={m.birthday ?? ""} onChange={e=>set({...m,birthday:e.target.value})}/></label><label>Member since (optional)<input type="date" value={m.joined ?? ""} onChange={e=>set({...m,joined:e.target.value})}/></label><label className="full">Notes (optional)<textarea rows={3} value={m.notes ?? ""} onChange={e=>set({...m,notes:e.target.value})} placeholder="Anything helpful to know about this member..."/></label></fieldset>{error&&<p className="error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="btn" disabled={busy} onClick={close}>Cancel</button><button className="btn primary" disabled={busy}>{busy?"Saving...":"Save member"}</button></div></form></Modal>;

}

export function RehearsalEditor({value:r,set,save,close,busy,error,existing}:Omit<Common,"save">&{value:Rehearsal;set:(v:Rehearsal)=>void;save:(e:FormEvent<HTMLFormElement>,plan?:RepeatPlan)=>void;existing:boolean}) {

 const [repeat,setRepeat]=useState(false);

 const [days,setDays]=useState<number[]>([2,4]);

 const [until,setUntil]=useState(()=>{const end=new Date(r.date+"T00:00:00Z");end.setUTCDate(end.getUTCDate()+56);return end.toISOString().slice(0,10);});

 let count=0;

 if(repeat&&until&&days.length){try{count=repeatDates(r.date,{days,until}).length;}catch{}}

 return <Modal title={existing?"Edit rehearsal":"Schedule rehearsals"} close={close}><form onSubmit={e=>save(e,repeat?{days,until}:undefined)}><fieldset disabled={busy} className="form-grid"><label className="full">Rehearsal title<input required maxLength={120} placeholder="e.g. Regular Choir Rehearsal" value={r.title} onChange={e=>set({...r,title:e.target.value})}/></label><label>Rehearsal type<select value={r.kind||"Regular"} onChange={e=>set({...r,kind:e.target.value as "Regular"|"Extra"})}><option>Regular</option><option>Extra</option></select></label><label>Session status<select value={r.cancelled?"Cancelled":"Scheduled"} onChange={e=>set({...r,cancelled:e.target.value==="Cancelled"})}><option>Scheduled</option><option>Cancelled</option></select></label><label>{repeat?"Start date":"Date"}<input required type="date" value={r.date} onChange={e=>set({...r,date:e.target.value})}/></label><label>Time (Asia/Manila)<input required type="time" value={r.time.slice(0,5)} onChange={e=>set({...r,time:e.target.value})}/></label><label className="full">Location<input required value={r.location} onChange={e=>set({...r,location:e.target.value})}/></label>

 {!existing&&<div className="full repeat-options"><label className="repeat-check"><input type="checkbox" checked={repeat} onChange={e=>setRepeat(e.target.checked)}/>Repeat weekly</label>{repeat&&<><p>Select your usual two days, or any number of rehearsal days. All registers in the range are created together.</p><div className="weekday-options">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((day,i)=><label key={day}><input type="checkbox" checked={days.includes(i)} onChange={e=>setDays(e.target.checked?[...days,i]:days.filter(d=>d!==i))}/>{day}</label>)}</div><label>Repeat until<input required type="date" min={r.date} value={until} onChange={e=>setUntil(e.target.value)}/></label><small>{count} rehearsal dates · Up to one year · Same time for selected days</small></>}</div>}

 <label className="full">Rehearsal notes<textarea rows={3} value={r.notes} onChange={e=>set({...r,notes:e.target.value})}/></label></fieldset>{existing&&<p className="absence-policy">Changes apply to this rehearsal only. Cancel a session to exclude it from absence streaks while keeping its history.</p>}{error&&<p className="error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="btn" disabled={busy} onClick={close}>Cancel</button><button className="btn primary" disabled={busy}>{busy?"Saving...":repeat?"Create weekly rehearsals":"Save rehearsal"}</button></div></form></Modal>;

}

