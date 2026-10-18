import { todayInPeru } from './calendar.mjs';
import { validCalendarDate } from './report-period.mjs';

// start is the Peru calendar day when a pending task entered the system.
// Historical visit/appraisal dates remain the dates of the actual activities.
/** @param {string | null} start
 * @param {number} days
 * @param {string | null} assigned
 * @param {Date} now */
export function workflowDeadline(start, days = 2, assigned = null, now = new Date()) {
  const today = todayInPeru(now);
  const validStart = validCalendarDate(start);
  const interval = Number.isInteger(Number(days)) && Number(days) >= 1 && Number(days) <= 365 ? Number(days) : 2;
  let deadline = validCalendarDate(assigned) ? assigned : null;
  if (!deadline && validStart) {
    const date = new Date(`${start}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + interval);
    deadline = date.toISOString().slice(0, 10);
  }
  const age = validStart ? Math.max(0, Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${start}T12:00:00Z`)) / 86400000)) : 0;
  return {
    fechaLimite: deadline,
    dias: age,
    vencida: Boolean(deadline && deadline < today),
    estadoPlazo: !deadline ? 'sin_plazo' : deadline < today ? 'vencido' : deadline === today ? 'vence_hoy' : 'en_plazo',
  };
}
