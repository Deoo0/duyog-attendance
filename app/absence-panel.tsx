"use client";
import { useState } from "react";
import type { AbsenceSummary } from "./attendance-rules";
import { dateLabel, timeLabel } from "./data";
export default function AbsencePanel({summary}:{summary:AbsenceSummary}) {
 const [selected,setSelected]=useState(0);
 const rehearsal=summary.rehearsals[selected]||summary.rehearsals[0];
 return <section className="panel absence-panel"><div className="panel-heading"><div><h2>Regular rehearsal attendance watch</h2><p>Four consecutive absences are subject to removal review.</p></div><span className="badge neutral">{summary.streaks.filter(m=>m.streak>=4).length} for review</span></div>
 <div className="absence-content"><p className="absence-policy">Only saved Absent marks at regular rehearsals count. Present, Late, Excused, or an unmarked entry breaks the streak. Extra and cancelled rehearsals are excluded. Removal is an administrator decision.</p>
 <h3>Current absence streaks</h3>{summary.streaks.length?<ul className="absence-list">{summary.streaks.map((m,i)=><li key={i}><div><strong>{m.name}</strong><small>{m.voice}</small></div><span className={m.streak>=4?"badge danger":"badge neutral"}>{m.streak} consecutive {m.streak===1?"absence":"absences"}{m.streak>=4?" · Subject to removal review":""}</span></li>)}</ul>:<p className="absence-empty">No current absence streaks.</p>}
 <h3>Absent members by regular rehearsal</h3>{rehearsal?<><label className="absence-select">Saved regular rehearsal registers<select value={Math.min(selected,summary.rehearsals.length-1)} onChange={e=>setSelected(Number(e.target.value))}>{summary.rehearsals.map((r,i)=><option value={i} key={i}>{dateLabel(r.date)} · {timeLabel(r.time)} · {r.title}</option>)}</select></label><ul className="absence-list">{rehearsal.absent.map((m,i)=><li key={i}><strong>{m.name}</strong><span className={`badge ${m.voice.toLowerCase()}`}>{m.voice}</span></li>)}</ul>{!rehearsal.absent.length&&<p className="absence-empty">No members marked absent in this register.</p>}</>:<p className="absence-empty">Save attendance for a regular rehearsal to see it here.</p>}</div></section>;
}
