export function operation(value = 'venta') {
  if (value !== 'venta' && value !== 'alquiler') throw new Error('Selecciona Venta o Alquiler.');
  return value;
}
export const operationLabel = value => value === 'alquiler' ? 'Alquiler' : 'Venta';
const appraisalLabels = {
  price: 'Precio de salida',
  reference: 'Tasación de Inmobiliaria',
  target: 'Precio de cierre aceptado por propietario',
};
const labelsByOperation = { venta: appraisalLabels, alquiler: appraisalLabels };
export const priceLabel = value => (labelsByOperation[value] || appraisalLabels).price;
export const referenceLabel = value => (labelsByOperation[value] || appraisalLabels).reference;
export const targetLabel = value => (labelsByOperation[value] || appraisalLabels).target;
