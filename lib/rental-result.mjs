import { parseBusinessDate, todayInPeru } from './calendar.mjs';
import { validCalendarDate } from './report-period.mjs';
import { parsePrice } from './prices.mjs';

export function rentalContractStatus(end, now = new Date()) {
  if (!end) return 'Sin fecha de fin';
  const today = todayInPeru(now);
  const threshold = new Date(`${today}T12:00:00Z`);
  threshold.setUTCDate(threshold.getUTCDate() + 30);
  return end < today ? 'Vencido' : end <= threshold.toISOString().slice(0, 10) ? 'Vence en 30 días' : 'Vigente';
}

function amount(value, optional = false) {
  if (optional && (value === undefined || value === null || value === '')) return null;
  if (/^0{1,13}(\.0{1,2})?$/.test(String(value ?? '').trim())) return '0.00';
  const result = parsePrice(value);
  if (!result) throw new Error('Revisa los importes del alquiler; usa valores no negativos con hasta dos decimales.');
  return result;
}
export function rentalResult(body, now) {
  const signed = parseBusinessDate(body.fechaAlquiler, now);
  const rentaMensual = parsePrice(body.rentaMensual);
  if (!signed || !rentaMensual) throw new Error('Indica una fecha de cierre no futura y una renta mensual mayor que cero.');
  const fechaAlquiler = signed.toISOString().slice(0, 10);
  const fechaInicioAlquiler = body.fechaInicioAlquiler || fechaAlquiler;
  const fechaFinAlquiler = body.fechaFinAlquiler || null;
  if (!validCalendarDate(fechaInicioAlquiler) || (fechaFinAlquiler && (!validCalendarDate(fechaFinAlquiler) || fechaFinAlquiler < fechaInicioAlquiler))) throw new Error('Revisa las fechas del alquiler: el fin debe ser igual o posterior al inicio.');
  return { fechaAlquiler, rentaMensual, comision: amount(body.comision || '0'), garantia: amount(body.garantia, true), adelanto: amount(body.adelanto, true), fechaInicioAlquiler, fechaFinAlquiler };
}
