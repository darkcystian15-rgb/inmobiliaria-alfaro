import test from 'node:test';
import assert from 'node:assert/strict';
import {taskAgenda} from '../lib/task-agenda.mjs';
import {workflowDeadline} from '../lib/workflow-deadline.mjs';
const now=new Date('2026-10-18T18:00:00Z');
const task=(id,date)=>({id,inicio:'2026-10-18',...workflowDeadline('2026-10-18',2,date,now)});
test('totals cover all overdue tasks, pages do not overlap, oldest effective deadline comes first',()=>{
 const tasks=Array.from({length:14},(_,i)=>task(i+1,`2026-10-${String(i+1).padStart(2,'0')}`));
 const a=taskAgenda(tasks,new URLSearchParams('estado=vencidos&limite=10'),now);
 const b=taskAgenda(tasks,new URLSearchParams('estado=vencidos&limite=10&pagina=2'),now);
 assert.equal(a.total,14);assert.equal(a.resumen.vencidos,14);assert.equal(a.items.length,10);assert.equal(b.items.length,4);
 assert.deepEqual(a.items.map(t=>t.id),[1,2,3,4,5,6,7,8,9,10]);assert.equal(b.items[0].id,11);
});
test('extending a particular deadline removes the task from overdue and updates the counters',()=>{
 const before=taskAgenda([task(1,'2026-10-17')],new URLSearchParams('estado=vencidos'),now);
 const after=taskAgenda([task(1,'2026-10-20')],new URLSearchParams('estado=vencidos'),now);
 assert.equal(before.total,1);assert.equal(after.total,0);assert.equal(after.resumen.vencidos,0);assert.equal(after.resumen.proximos,1);
});
test('today and next two Peru days are separate, and later dates are excluded from upcoming',()=>{
 const tasks=[task(1,'2026-10-18'),task(2,'2026-10-19'),task(3,'2026-10-20'),task(4,'2026-10-21')];
 const agenda=taskAgenda(tasks,new URLSearchParams(),now);
 assert.deepEqual(agenda.resumen,{vencidos:0,hoy:1,proximos:2});
 assert.equal(taskAgenda(tasks,new URLSearchParams('estado=hoy'),now).items[0].id,1);
});
test('priority view falls back from overdue to today, upcoming, then remaining pending tasks',()=>{
 const params=new URLSearchParams('estado=prioridad&limite=10');
 const tasks=[task(1,'2026-10-17'),task(2,'2026-10-18'),task(3,'2026-10-20'),task(4,'2026-10-25')];
 for(let start=0;start<tasks.length;start++)assert.deepEqual(taskAgenda(tasks.slice(start),params,now).items.map(t=>t.id),[start+1]);
});
