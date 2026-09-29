/* eslint-disable @next/next/no-img-element -- Member photos are small, private data URLs. */
"use client";
import { useEffect, useRef, type ReactNode } from "react";
import type { Member } from "./data";
export function Icon({name,size=20}:{name:string;size?:number}) {
 const paths:Record<string,ReactNode>={grid:<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,people:<><circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 5"/></>,calendar:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18m-14 4h2m4 0h2m-8 3h2"/></>,check:<><rect x="4" y="3" width="16" height="18" rx="2"/><path d="m8 12 3 3 5-6M9 3v3h6V3"/></>,chart:<path d="M4 3v18h17M8 16v-4m5 4V7m5 9v-6"/>,settings:<><path d="m9 3-1 3-3 1-2 4 2 2v4l4 3 3-1 3 1 4-3v-4l2-2-2-4-3-1-1-3Z"/><circle cx="12" cy="12" r="3"/></>,music:<><path d="M9 18V5l11-2v13M9 8l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2.5"/><ellipse cx="17" cy="16" rx="3" ry="2.5"/></>,arrow:<path d="M4 12h15m-5-5 5 5-5 5"/>,plus:<path d="M12 5v14M5 12h14"/>,search:<><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></>,download:<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>,clock:<><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></>,pin:<><path d="M19 10c0 6-7 11-7 11S5 16 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2"/></>,close:<path d="m6 6 12 12M6 18 18 6"/>,edit:<path d="m14 5 5 5M4 20l5-1L21 7l-5-5L4 14Z"/>,trash:<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>,menu:<path d="M4 6h16M4 12h16M4 18h16"/>,logout:<path d="M9 3H4v18h5m5-14 5 5-5 5M8 12h12"/>};
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]||paths.music}</svg>;
}
export function Avatar({member,large=false}:{member:Member;large?:boolean}) { return <span className={`avatar ${member.voice.toLowerCase()} ${large?"large":""}`}>{member.photo ? <img src={member.photo} alt={member.name}/> : member.name.split(" ").map(n=>n[0]).slice(0,2).join("")}</span>; }
export function Modal({title,children,close}:{title:string;children:ReactNode;close:()=>void}) {
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{ref.current?.showModal();const previous=document.body.style.overflow;document.body.style.overflow="hidden";return()=>{document.body.style.overflow=previous;};},[]);
 return <dialog ref={ref} aria-label={title} className="modal" onCancel={e=>{e.preventDefault();close();}} onClick={e=>{if(e.target===e.currentTarget)close();}}><div className="modal-head"><div><span className="eyebrow">DUYOG CHOIR</span><h2>{title}</h2></div><button className="icon-btn" aria-label="Close dialog" onClick={close}><Icon name="close"/></button></div>{children}</dialog>;
}

