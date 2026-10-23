import { validCalendarDate } from './report-period.mjs';
import { parsePrice, parseCurrency } from './prices.mjs';
import { todayInPeru } from './calendar.mjs';
export const activities = ['visita', 'tasacion', 'expediente', 'publicacion', 'documentacion'];
export function trackingInput(body) {
  if (!body || !activities.includes(body.actividad)) throw new Error('Actividad no válida.');
  const responsableId = body.responsableId === null || body.responsableId === '' ? null : Number(body.responsableId);
  if (responsableId !== null && (!Number.isSafeInteger(responsableId) || responsableId < 1)) throw new Error('Responsable no válido.');
  const fechaLimite = body.fechaLimite || null;
  if (fechaLimite && !validCalendarDate(fechaLimite)) throw new Error('Fecha límite no válida.');
  const observacion = typeof body.observacion === 'string' ? body.observacion.trim() : '';
  if (observacion.length > 500) throw new Error('La observación admite hasta 500 caracteres.');
  return { actividad: body.actividad, responsableId, fechaLimite, observacion: observacion || null };
}
export function announcementInput(body) {
  const canal = typeof body?.canal === 'string' ? body.canal.trim() : '';
  const enlace = typeof body?.enlace === 'string' ? body.enlace.trim() : '';
  let url; try { url = new URL(enlace); } catch { throw new Error('Indica un enlace válido del anuncio.'); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || enlace.length > 1000) throw new Error('Enlace del anuncio no válido.');
  if (!canal || canal.length > 80) throw new Error('Indica el canal (máximo 80 caracteres).');
  if (!validCalendarDate(body.fechaPublicacion) || body.fechaPublicacion > todayInPeru()) throw new Error('Indica una fecha de publicación válida que no sea futura.');
  const precioPublicado = parsePrice(body.precioPublicado);
  if (!precioPublicado) throw new Error('Indica un precio publicado mayor que cero.');
  const precioPublicadoMoneda = parseCurrency(body.precioPublicadoMoneda);
  if (!precioPublicadoMoneda) throw new Error("Selecciona soles o dólares para el anuncio.");
  return {canal,enlace,fechaPublicacion:body.fechaPublicacion,precioPublicado,precioPublicadoMoneda};
}
