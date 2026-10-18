import { todayInPeru } from './calendar.mjs';

// The effective deadline already includes any property-specific override.
export function taskAgenda(tasks, params = new URLSearchParams(), now = new Date()) {
  const today = todayInPeru(now);
  const soon = new Date(`${today}T12:00:00Z`); soon.setUTCDate(soon.getUTCDate()+2);
  const through = soon.toISOString().slice(0,10);
  const resumen = {
    vencidos: tasks.filter(t=>t.estadoPlazo==='vencido').length,
    hoy: tasks.filter(t=>t.estadoPlazo==='vence_hoy').length,
    proximos: tasks.filter(t=>t.fechaLimite>today && t.fechaLimite<=through).length,
  };
  const requested = params.get('estado') || 'todos';
  const filter = requested==='prioridad' ? resumen.vencidos?'vencidos':resumen.hoy?'hoy':resumen.proximos?'proximos':'todos' : requested;
  const selected = tasks.filter(t=>filter==='vencidos'?t.estadoPlazo==='vencido':filter==='hoy'?t.estadoPlazo==='vence_hoy':filter==='proximos'?t.fechaLimite>today&&t.fechaLimite<=through:true);
  const oldest = params.get('orden')==='antiguedad';
  selected.sort((a,b)=>String((oldest?a.inicio:a.fechaLimite)||'9999').localeCompare(String((oldest?b.inicio:b.fechaLimite)||'9999'))||a.id-b.id);
  const limit = [2,3,10,20].includes(Number(params.get('limite')))?Number(params.get('limite')):20;
  const page = Math.max(1,Number.parseInt(params.get('pagina')||'1',10)||1);
  const offset = (page-1)*limit;
  return {items:selected.slice(offset,offset+limit),total:selected.length,resumen,pagina:page,limite:limit};
}
