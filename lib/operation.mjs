export function operation(value = 'venta') {
  if (value !== 'venta' && value !== 'alquiler') throw new Error('Selecciona Venta o Alquiler.');
  return value;
}
export const operationLabel = value => value === 'alquiler' ? 'Alquiler' : 'Venta';
export const priceLabel = value => value === 'alquiler' ? 'Renta mensual' : 'Precio de salida';
export const referenceLabel = value => value === 'alquiler' ? 'Renta mensual de referencia' : 'Tasación de Inmobiliaria';
export const targetLabel = value => value === 'alquiler' ? 'Renta mensual objetivo' : 'Precio de cierre aceptado por propietario';
