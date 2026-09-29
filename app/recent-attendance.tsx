"use client";

import { useEffect, useState } from "react";
import { dateLabel, timeLabel, voices, type Voice } from "./data";
import { Icon } from "./ui";
import { loadPublicAttendance, type PublicAttendance } from "./store";

export default function RecentAttendance() {
 const [summary, setSummary] = useState<PublicAttendance | null>(null);
 const [loading, setLoading] = useState(true);
 const [failed, setFailed] = useState(false);
 const [attempt, setAttempt] = useState(0);
 const [search, setSearch] = useState("");
 const [voice, setVoice] = useState<Voice | "All voices">("All voices");
 useEffect(() => {
  const controller = new AbortController();
  loadPublicAttendance(controller.signal).then(value => {
   if (!controller.signal.aborted) { setSummary(value); setFailed(false); setLoading(false); }
  }).catch(() => {
   if (!controller.signal.aborted) { setFailed(true); setLoading(false); }
  });
  return () => controller.abort();
 }, [attempt]);
 const attendees = summary?.attendees.filter(member =>
  (voice === "All voices" || member.voice === voice) && member.name.toLowerCase().includes(search.toLowerCase())
 ) || [];
 return <section className="public-attendance" aria-labelledby="recent-attendance-title" aria-busy={loading}>
  <div className="public-attendance-intro"><span className="eyebrow">SHOWING UP. SINGING TOGETHER.</span><h2 id="recent-attendance-title">Our latest harmony.</h2><p>A little dedication from every voice makes all the difference.</p></div>
  <div className="panel public-register">
   <div className="panel-heading"><div><h3>Recent rehearsal attendance</h3><p>Members who attended our latest recorded rehearsal.</p></div><span className="stat-icon"><Icon name="music"/></span></div>
   {loading ? <div className="empty" role="status">Loading recent attendance…</div> : failed ? <div className="empty" role="status"><p>Recent attendance is temporarily unavailable. You can still sign in.</p><button type="button" className="btn" onClick={() => { setLoading(true); setFailed(false); setAttempt(value => value + 1); }}>Try again</button></div> : !summary ? <div className="empty"><Icon name="calendar" size={30}/><p>No rehearsal attendance to share yet.</p><small>Check back after our next practice.</small></div> : <>
    <div className="public-rehearsal"><div className="date-tile highlight"><span>{dateLabel(summary.date,{month:"short"})}</span><strong>{dateLabel(summary.date,{day:"2-digit"})}</strong></div><div><h4>{summary.title}</h4><p>{dateLabel(summary.date)} · {timeLabel(summary.time)}</p></div><span className="public-total"><strong>{summary.attendees.length}</strong>attended</span></div>
    {summary.attendees.length > 0 && <div className="table-tools"><label className="search"><Icon name="search" size={17}/><input aria-label="Search recent attendees" placeholder="Find a choir member…" value={search} onChange={event=>setSearch(event.target.value)}/></label><select aria-label="Filter recent attendees by voice" value={voice} onChange={event=>setVoice(event.target.value as Voice | "All voices")}><option>All voices</option>{voices.map(part=><option key={part}>{part}</option>)}</select></div>}
    <ul className="public-attendees" aria-label="Members who attended">{attendees.map((member,index)=><li key={`${member.name}-${member.voice}-${index}`}><span className={`avatar ${member.voice.toLowerCase()}`} aria-hidden="true">{member.name.split(" ").filter(Boolean).slice(0,2).map(part=>part[0]).join("")}</span><span className="attendee-name">{member.name}</span><span className={`badge ${member.voice.toLowerCase()}`}>{member.voice}</span></li>)}</ul>
    {!attendees.length && <div className="empty">{summary.attendees.length ? "No attendees match your search." : "No members were marked present or late for this rehearsal."}</div>}
    <div className="public-register-footer"><span className="tiny-dot"/> Present and late members are included. Updates appear after attendance is saved.</div>
   </>}
  </div>
 </section>;
}
