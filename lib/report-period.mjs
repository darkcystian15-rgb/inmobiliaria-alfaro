export function reportPeriodField(report) {
  if (report === 'Alertas de actividades') return 'fechaLimite';
  if (report.includes('→')) return 'fechaInicioFlujo';
  if (report === 'Alquilados') return 'fechaAlquiler';
  if (report === 'Vendidos') return 'fechaVenta';
  if (['Retirados / cancelados', 'Motivos de liberación', 'Histórico de inmuebles'].includes(report)) return 'fechaSalida';
  if (report === 'Visitas realizadas') return 'fechaVisita';
  if (report === 'Tasaciones realizadas') return 'fechaTasacion';
  if (report === 'Difusión completada' || report === 'Publicados') return 'fechaPublicacion';
  if (report === 'Posición ocupada') return 'fechaInicioPosicion';
  return 'fechaRegistro';
}
export function validCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function inReportPeriod(value, from, to, calendarDate = false) {
  if (!from && !to) return true;
  if (!value) return false;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return false;
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const part = type => parts.find(p => p.type === type)?.value;
  const day = calendarDate ? (typeof value === 'string' ? value.slice(0, 10) : date.toISOString().slice(0, 10)) : `${part('year')}-${part('month')}-${part('day')}`;
  return (!from || day >= from) && (!to || day <= to);
}
