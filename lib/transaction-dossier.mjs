// One seller and one buyer per property. These rules also apply to rentals.
export const dossierDefaults = () => ({ vendedorTipo: '', compradorAsignado: false, compradorTipo: '', vendedorBusquedaNota: '', compradorBusquedaNota: '', renta: 'pendiente', cargas: false });
export function dossierInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw Error('Configuración no válida.');
  const result = dossierDefaults();
  for (const key of ['vendedorTipo', 'compradorTipo']) {
    if (!['', 'natural', 'juridica'].includes(body[key])) throw Error('Selecciona persona natural o jurídica.');
    result[key] = body[key];
  }
  for (const key of ['compradorAsignado', 'cargas']) {
    if (typeof body[key] !== 'boolean') throw Error('Revisa las condiciones del expediente.');
    result[key] = body[key];
  }
  if (result.compradorAsignado && !result.compradorTipo) throw Error('Selecciona el tipo de persona del comprador.');
  if (!['pendiente', 'afecto', 'exonerado'].includes(body.renta)) throw Error('Indica si corresponde el impuesto a la renta.');
  result.renta = body.renta;
  for (const key of ['vendedorBusquedaNota', 'compradorBusquedaNota']) {
    if (typeof body[key] !== 'string' || body[key].trim().length > 2000) throw Error('La nota de búsqueda nacional admite hasta 2000 caracteres.');
    result[key] = body[key].trim();
  }
  return result;
}
const doc = (key, label, section, required = true, party = 'inmueble', person = '') => ({ key, label, section, required, party, person });
export const dossierDocuments = [
  ...['vendedor', 'comprador'].flatMap(party => {
    const prefix = party.toUpperCase();
    return [
      doc(`${prefix}_DNI`, 'DNI', 'identificacion', true, party, 'natural'),
      doc(`${prefix}_PODER`, 'Poder', 'identificacion', false, party, 'natural'),
      doc(`${prefix}_VIGENCIA_PODER`, 'Vigencia de poder', 'identificacion', false, party, 'natural'),
      doc(`${prefix}_SEPARACION_PATRIMONIAL`, 'Separación patrimonial', 'identificacion', false, party, 'natural'),
      doc(`${prefix}_BUSQUEDA_NACIONAL`, 'Búsqueda nacional', 'identificacion', false, party, 'natural'),
      doc(`${prefix}_FICHA_RUC`, 'Ficha RUC', 'identificacion', true, party, 'juridica'),
      doc(`${prefix}_DNI_GERENTE`, 'DNI del gerente', 'identificacion', true, party, 'juridica'),
      doc(`${prefix}_VIGENCIA_GERENTE`, 'Vigencia de poder del gerente', 'identificacion', true, party, 'juridica'),
    ];
  }),
  doc('COPIA_LITERAL_CRI', 'Copia literal o CRI-PU', 'inmueble'),
  doc('HR_VENTA', 'HR del año de la venta', 'inmueble'),
  doc('TITULO_ULTIMA_TRANSFERENCIA', 'Título archivado de la última transferencia', 'inmueble'),
  doc('PROMESA_ARRAS', 'Promesa de venta con arras', 'contratos', false),
  doc('MINUTA_COMPRAVENTA', 'Minuta de compraventa', 'contratos'),
  doc('ESCRITURA_PUBLICA', 'Escritura pública', 'contratos'),
  doc('VENDEDOR_LIQUIDACION', 'Liquidación del vendedor', 'impuestos', true, 'vendedor'),
  doc('VENDEDOR_FORMULARIO_RENTA', 'Formulario de pago del impuesto a la renta', 'impuestos', true, 'vendedor'),
  doc('VENDEDOR_VOUCHER_RENTA', 'Voucher de pago del impuesto a la renta', 'impuestos', true, 'vendedor'),
  doc('VENDEDOR_LIQUIDACION_MUNICIPAL', 'Liquidación de autoavalúo y arbitrios municipales', 'impuestos', true, 'vendedor'),
  doc('VENDEDOR_PAGO_MUNICIPAL', 'Comprobante de pago de impuestos municipales', 'impuestos', true, 'vendedor'),
  doc('COMPRADOR_LIQUIDACION', 'Liquidación del comprador', 'impuestos', true, 'comprador'),
  doc('COMPRADOR_ALCABALA', 'Comprobante de pago de alcabala', 'impuestos', true, 'comprador'),
  ...[['LUZ', 'luz'], ['AGUA', 'agua'], ['GAS', 'gas'], ['INTERNET', 'internet']].map(([key, label]) => doc(`VENDEDOR_RECIBO_${key}`, `Recibo de ${label}`, 'servicios', true, 'vendedor')),
  doc('LEVANTAMIENTO_CARGAS', 'Levantamiento de cargas', 'cargas'),
  doc('TASACION_EXPRESS', 'Tasación express', 'tasaciones'),
  doc('TASACION_PROPIETARIO', 'Tasaciones del propietario', 'tasaciones', false),
];
export const legacyDossierTypes = { DNI_PROPIETARIO: 'VENDEDOR_DNI', COPIA_LITERAL: 'COPIA_LITERAL_CRI', TASACION: 'TASACION_EXPRESS' };
export const dossierSections = [
  ['identificacion', '1. DNI y poderes'], ['inmueble', '2. Documentos del inmueble'], ['contratos', '3. Contratos'],
  ['impuestos', '4. Impuestos y constancias'], ['servicios', '5. Recibos y pagos de servicios'], ['cargas', '6. Levantamiento de cargas'], ['tasaciones', '7. Tasaciones'],
];
export function documentApplies(definition, config) {
  if (definition.party === 'comprador' && !config.compradorAsignado) return false;
  if (definition.person && config[`${definition.party}Tipo`] !== definition.person) return false;
  if (['VENDEDOR_FORMULARIO_RENTA', 'VENDEDOR_VOUCHER_RENTA'].includes(definition.key) && config.renta === 'exonerado') return false;
  if (definition.section === 'cargas' && !config.cargas) return false;
  return true;
}
export function dossierStatus(configuration, files = []) {
  const config = { ...dossierDefaults(), ...configuration };
  const alerts = [];
  if (!config.vendedorTipo) alerts.push('Seleccionar el tipo de persona del vendedor.');
  if (!config.compradorAsignado) alerts.push('Comprador pendiente de asignar al cerrar la operación.');
  else if (!config.compradorTipo) alerts.push('Seleccionar el tipo de persona del comprador.');
  if (config.renta === 'pendiente') alerts.push('Definir si el vendedor está afecto o exonerado del impuesto a la renta.');
  const items = dossierDocuments.map(definition => {
    const applies = documentApplies(definition, config);
    const documents = files.filter(file => (legacyDossierTypes[file.tipoDocumento] ?? file.tipoDocumento) === definition.key);
    const uploaded = documents.some(file => file.almacenamiento === 'hosting');
    const note = definition.key.endsWith('_BUSQUEDA_NACIONAL') ? config[`${definition.party}BusquedaNota`] : '';
    const required = definition.required || definition.key.endsWith('_BUSQUEDA_NACIONAL');
    const complete = uploaded || Boolean(note);
    const state = !applies ? 'no_aplica' : complete ? 'completo' : required ? 'pendiente' : 'opcional';
    return { ...definition, required, applies, state, complete, note, documents };
  });
  const required = items.filter(item => item.applies && item.required);
  const completed = required.filter(item => item.complete).length;
  const sections = dossierSections.map(([key, label]) => ({ key, label, pending: items.filter(item => item.section === key && item.state === 'pendiente').length, completed: items.filter(item => item.section === key && item.applies && item.required && item.complete).length, total: items.filter(item => item.section === key && item.applies && item.required).length }));
  return { items, sections, alerts, completed, total: required.length, percent: required.length ? Math.round(completed / required.length * 100) : 0, complete: !alerts.length && required.every(item => item.complete) };
}
