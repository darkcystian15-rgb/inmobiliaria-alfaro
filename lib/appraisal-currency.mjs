import { parseCurrency } from './prices.mjs';
export const appraisalAmountFields = ['valorReferencia', 'precioObjetivo', 'precioVenta'];
// An empty selection means preserve an existing mixed record, never pick a currency silently.
export function commonAppraisalCurrency(values) {
  const currencies = appraisalAmountFields.map(field => values[`${field}Moneda`] ?? 'PEN');
  return currencies.every(value => value === currencies[0]) ? currencies[0] : '';
}
export function applyAppraisalCurrency(values, currency) {
  if (!parseCurrency(currency)) throw new Error('Selecciona soles o dólares.');
  return { ...values, ...Object.fromEntries(appraisalAmountFields.map(field => [`${field}Moneda`, currency])) };
}
