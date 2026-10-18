import test from 'node:test';
import assert from 'node:assert/strict';
import { workflowDeadline } from '../lib/workflow-deadline.mjs';

const now = new Date('2026-10-18T18:00:00Z');
test('a task registered today gets its own deadline, independently of historical activity dates', () => {
  assert.equal(workflowDeadline('2026-10-18',3,null,now).fechaLimite,'2026-10-21');
  assert.equal(workflowDeadline('2026-10-18',3,null,now).dias,0);
  assert.equal(workflowDeadline('2026-10-18',3,null,now).vencida,false);
});
test('deadline day is due today and becomes overdue on the following Peru day', () => {
  const due = workflowDeadline('2026-10-16',2,null,now);
  assert.equal(due.fechaLimite,'2026-10-18');
  assert.equal(due.estadoPlazo,'vence_hoy');assert.equal(due.vencida,false);
  assert.equal(workflowDeadline('2026-10-15',2,null,now).estadoPlazo,'vencido');
  assert.equal(workflowDeadline('2026-10-16',2,null,new Date('2026-10-19T02:00:00Z')).estadoPlazo,'vence_hoy');
  assert.equal(workflowDeadline('2026-10-16',2,null,new Date('2026-10-19T05:00:00Z')).estadoPlazo,'vencido');
});
test('explicitly assigned deadlines take precedence, including old deadlines', () => {
  assert.equal(workflowDeadline('2026-10-18',3,'2025-06-20',now).fechaLimite,'2025-06-20');
  assert.equal(workflowDeadline('2026-10-18',3,'2025-06-20',now).estadoPlazo,'vencido');
  assert.equal(workflowDeadline(null,3,'2026-10-20',now).estadoPlazo,'en_plazo');
});
test('calendar intervals handle year boundaries, leap days and missing start dates', () => {
  assert.equal(workflowDeadline('2026-12-30',3).fechaLimite,'2027-01-02');
  assert.equal(workflowDeadline('2028-02-28',2).fechaLimite,'2028-03-01');
  assert.equal(workflowDeadline(null,3,null,now).fechaLimite,null);
  assert.equal(workflowDeadline('2026-02-30',3,null,now).estadoPlazo,'sin_plazo');
});
