import { parseCurrency } from './prices.mjs';
import { commonAppraisalCurrency } from './appraisal-currency.mjs';

// Existing mixed appraisals remain unresolved until the user explicitly chooses.
/** @param {{moneda?: string|null}} property @param {Record<string, unknown>|null} appraisal */
export function propertyCurrency(property = {}, appraisal = null) {
  if (parseCurrency(property.moneda) && property.moneda != null) return property.moneda;
  return appraisal ? commonAppraisalCurrency(appraisal) : 'PEN';
}
/** @param {Record<string, unknown>} body @param {{moneda?: string|null}} property @param {Record<string, unknown>|null} appraisal */
export function selectedPropertyCurrency(body, property, appraisal = null) {
  const selected = body.moneda ?? body.precioVentaMoneda ?? body.precioObjetivoMoneda ?? body.valorReferenciaMoneda ?? propertyCurrency(property, appraisal);
  if (typeof selected !== 'string' || !parseCurrency(selected)) throw new Error('Selecciona una moneda común para todos los importes del inmueble.');
  for (const key of ['valorReferenciaMoneda','precioObjetivoMoneda','precioVentaMoneda']) {
    if (body[key] !== undefined && body[key] !== selected) throw new Error('Los importes del inmueble deben usar la misma moneda.');
  }
  return selected;
}
