// Hints for human review only: a mention can refer to an old amount or a negotiation.
export function observationCurrencyHints(value) {
  const text = String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const mentionsDollars = /\bdolares?\b|\busd\b|us\s*\$/.test(text);
  if (!mentionsDollars || /\bsoles?\b|s\//.test(text)) return {mentionsDollars,fields:[]};
  const fields = [];
  if (/todos? los (?:precios|montos|importes)|tres (?:precios|montos|importes)/.test(text)) return {mentionsDollars,fields:['valorReferencia','precioObjetivo','precioVenta']};
  if (/tasacion|valor de referencia/.test(text)) fields.push('valorReferencia');
  if (/objetivo|cierre aceptado/.test(text)) fields.push('precioObjetivo');
  if (/precio de salida|precio de venta|renta mensual/.test(text)) fields.push('precioVenta');
  return {mentionsDollars,fields};
}
