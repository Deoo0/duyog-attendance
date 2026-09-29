import test from 'node:test';
import assert from 'node:assert/strict';
import { repeatDates, absenceSummary, rehearsalStarted } from '../app/attendance-rules.ts';
const now=new Date('2026-10-01T12:00:00Z');
const member={id:'m1',name:'Test Singer',voice:'Alto',status:'Active',joined:null};
function fixture(marks){return {members:[member],rehearsals:marks.map((_,i)=>({id:`r${i}`,title:'Regular',date:`2026-09-${String(i+1).padStart(2,'0')}`,time:'18:00',kind:'Regular',cancelled:false})),attendance:marks.flatMap((status,i)=>status?[{id:`a${i}`,member_id:'m1',rehearsal_id:`r${i}`,status}]:[])};}
test('Tuesday and Thursday schedule includes bounds and skips other weekdays',()=>{
 assert.deepEqual(repeatDates('2026-09-29',{days:[2,4],until:'2026-10-08'}),['2026-09-29','2026-10-01','2026-10-06','2026-10-08']);
});
test('Extra repeat days, leap day and invalid ranges',()=>{
 assert.deepEqual(repeatDates('2028-02-28',{days:[1,2,3],until:'2028-03-01'}),['2028-02-28','2028-02-29','2028-03-01']);
 assert.throws(()=>repeatDates('2026-09-29',{days:[],until:'2026-10-08'}));
 assert.throws(()=>repeatDates('2026-09-29',{days:[2],until:'2026-09-28'}));
 assert.throws(()=>repeatDates('2026-09-29',{days:[2],until:'2028-10-08'}));
});
test('Four consecutive absences flag a member and preserve every session list',()=>{
 const summary=absenceSummary(fixture(['Present','Absent','Absent','Absent','Absent']),now);
 assert.equal(summary.streaks[0].streak,4);assert.equal(summary.rehearsals.length,5);assert.equal(summary.rehearsals[0].absent[0].name,'Test Singer');
});
for(const reset of ['Present','Late','Excused'])test(`${reset} breaks the consecutive absence streak`,()=>{
 assert.equal(absenceSummary(fixture(['Absent','Absent','Absent','Absent',reset,'Absent']),now).streaks[0].streak,1);
 assert.equal(absenceSummary(fixture(['Absent',reset]),now).streaks.length,0);
});
test('An unmarked member in a saved register breaks the streak without counting as absent',()=>{
 const d=fixture(['Absent','Absent',null,'Absent']);
 d.attendance.push({id:'other',member_id:'other',rehearsal_id:'r2',status:'Present'});
 assert.equal(absenceSummary(d,now).streaks[0].streak,1);
});
test('An entirely unrecorded rehearsal is pending, not an absence',()=>{
 assert.equal(absenceSummary(fixture(['Absent',null,'Absent']),now).streaks[0].streak,2);
});
test('Extra, cancelled, and future rehearsals do not alter regular streaks',()=>{
 const d=fixture(['Absent','Present','Present','Absent','Present']);
 d.rehearsals[1].kind='Extra';d.rehearsals[2].cancelled=true;d.rehearsals[4].date='2026-12-01';
 const result=absenceSummary(d,now);assert.equal(result.streaks[0].streak,2);assert.equal(result.rehearsals.length,2);
});
test('Inactive members remain in historical absence lists, but not current review list',()=>{
 const d=fixture(['Absent']);d.members=[{...member,status:'Inactive'}];
 const result=absenceSummary(d,now);assert.equal(result.streaks.length,0);assert.equal(result.rehearsals[0].absent.length,1);
});
test('Joined date excludes earlier absences and time comparisons use Manila',()=>{
 const d=fixture(['Absent','Absent','Absent']);d.members=[{...member,joined:'2026-09-03'}];
 assert.equal(absenceSummary(d,now).streaks[0].streak,1);
 assert.equal(rehearsalStarted({date:'2026-10-01',time:'20:01'},now),false);
 assert.equal(rehearsalStarted({date:'2026-10-01',time:'20:00:00'},now),true);
});
test('Correcting a previous absent mark recalculates the review flag',()=>{
 const d=fixture(['Absent','Absent','Absent','Absent']);d.attendance[2].status='Excused';
 assert.equal(absenceSummary(d,now).streaks[0].streak,1);
});
