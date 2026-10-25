// Persisted seller/buyer configuration remains compatible; rental requirements are operation-specific.
export const dossierDefaults = () => ({ vendedorTipo: '', vendedorPropietarios: 'pendiente', vendedorRegimen: 'pendiente', vendedorRepresentante: 'pendiente', compradorAsignado: false, compradorTipo: '', vendedorBusquedaNota: '', compradorBusquedaNota: '', renta: 'pendiente', rentaObservacion: '', cargas: false });
export function dossierInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw Error('Configuración no válida.');
  const result = dossierDefaults();
  for (const [key, values] of Object.entries({ vendedorPropietarios: ['pendiente', 'uno', 'matrimonio', 'varios'], vendedorRegimen: ['pendiente', 'comunes', 'separados'], vendedorRepresentante: ['pendiente', 'si', 'no'] })) {
    const value = body[key] ?? 'pendiente';
    if (!values.includes(value)) throw Error('Revisa las condiciones de propietarios y representación del vendedor.');
    result[key] = value;
  }
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
  const rentaObservacion = body.rentaObservacion ?? '';
  if (typeof rentaObservacion !== 'string' || rentaObservacion.trim().length > 2000) throw Error('La observación del impuesto a la renta admite hasta 2000 caracteres.');
  result.rentaObservacion = rentaObservacion.trim();
  if (result.renta === 'afecto' && !result.rentaObservacion) throw Error('Escribe una observación sustentando por qué el vendedor paga impuesto a la renta.');
  for (const key of ['vendedorBusquedaNota', 'compradorBusquedaNota']) {
    if (typeof body[key] !== 'string' || body[key].trim().length > 2000) throw Error('La nota de búsqueda nacional admite hasta 2000 caracteres.');
    result[key] = body[key].trim();
  }
  return result;
}
const doc = (key, label, section, required = true, party = 'inmueble', person = '') => ({ key, label, section, required, party, person });
const saleDocuments = [
  ...['vendedor', 'comprador'].flatMap(party => {
    const prefix = party.toUpperCase();
    return [
      doc(`${prefix}_DNI`, 'DNI', 'identificacion', true, party, 'natural'),
      ...(party === 'vendedor' ? [doc('VENDEDOR_PARTIDA_MATRIMONIAL', 'Partida matrimonial', 'identificacion', false, party, 'natural')] : []),
      doc(`${prefix}_PODER`, 'Poder', 'identificacion', false, party, 'natural'),
      doc(`${prefix}_VIGENCIA_PODER`, 'Vigencia de poder', 'identificacion', false, party, 'natural'),
      doc(`${prefix}_SEPARACION_PATRIMONIAL`, 'Separación patrimonial', 'identificacion', false, party, 'natural'),
      doc(`${prefix}_BUSQUEDA_NACIONAL`, 'Búsqueda nacional', 'identificacion', false, party, 'natural'),
      doc(`${prefix}_FICHA_RUC`, 'Ficha RUC', 'identificacion', true, party, 'juridica'),
      doc(`${prefix}_DNI_GERENTE`, 'DNI del gerente', 'identificacion', true, party, 'juridica'),
      doc(`${prefix}_VIGENCIA_GERENTE`, 'Vigencia de poder del gerente', 'identificacion', true, party, 'juridica'),
    ];
  }),
  doc('COPIA_LITERAL_CRI', 'Copia literal o CRI', 'inmueble'),
  doc('HR_VENTA', 'HR y PU del año de la venta', 'inmueble'),
  doc('TITULO_ULTIMA_TRANSFERENCIA', 'Título archivado de la última transferencia', 'inmueble'),
  doc('CONTRATO_ALQUILER', 'Contrato de alquiler', 'contratos', false),
  doc('PROMESA_ARRAS', 'Promesa de venta con arras', 'contratos', false),
  doc('MINUTA_COMPRAVENTA', 'Minuta de compraventa', 'contratos'),
  doc('ESCRITURA_PUBLICA', 'Escritura pública', 'contratos'),
  doc('VENDEDOR_LIQUIDACION', 'Liquidación del vendedor', 'impuestos', true, 'vendedor'),
  doc('VENDEDOR_FORMULARIO_RENTA', 'Formulario de impuesto a la renta', 'impuestos', true, 'vendedor'),
  doc('VENDEDOR_VOUCHER_RENTA', 'Voucher de pago del impuesto a la renta', 'impuestos', true, 'vendedor'),
  doc('VENDEDOR_EXONERACION_RENTA', 'Exoneración del impuesto a la renta', 'impuestos', true, 'vendedor'),
  doc('VENDEDOR_LIQUIDACION_MUNICIPAL', 'Liquidación de autovalúo y arbitrios municipales', 'impuestos', true, 'vendedor'),
  doc('VENDEDOR_PAGO_MUNICIPAL', 'Voucher de Pago de Impuestos Municipales, autovalúo y arbitrios', 'impuestos', true, 'vendedor'),
  doc('VENDEDOR_CONSTANCIA_NO_ADEUDO_MUNICIPAL', 'Constancia de no adeudo de autovalúo y arbitrios', 'impuestos', true, 'vendedor'),
  doc('COMPRADOR_LIQUIDACION', 'Liquidación de alcabala', 'impuestos', true, 'comprador'),
  doc('COMPRADOR_ALCABALA', 'Voucher de pago de alcabala', 'impuestos', true, 'comprador'),
  doc('COMPRADOR_FORMULARIO_ALCABALA', 'Formulario de cancelación de alcabala', 'impuestos', true, 'comprador'),
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
const rentalDocuments = [
  ...['arrendador', 'arrendatario'].flatMap(party => [
    doc(`${party.toUpperCase()}_DNI`, 'DNI', 'identificacion', true, party),
    doc(`${party.toUpperCase()}_PODER`, 'Poder', 'identificacion', true, party),
  ]),
  doc('COPIA_LITERAL_CRI', 'Copia literal o CRI', 'inmueble'),
  doc('CONTRATO_ALQUILER', 'Contratos de alquiler', 'contratos'),
  doc('RECIBO_SERVICIO', 'Recibos de servicios', 'servicios'),
  doc('PAGO_SERVICIO', 'Pagos de servicios', 'servicios'),
  doc('TASACION_EXPRESS', 'Tasación express', 'tasaciones'),
  doc('TASACION_PROPIETARIO', 'Otras tasaciones', 'tasaciones', false),
];
export const dossierDocuments = [...new Map([...saleDocuments, ...rentalDocuments].map(item => [item.key, item])).values()];
export const documentsForOperation = operation => operation === 'alquiler' ? rentalDocuments : saleDocuments;
export const sectionsForOperation = operation => operation === 'alquiler' ? [
  ['identificacion', '1. DNI y poderes'], ['inmueble', '2. Documentos del inmueble'],
  ['contratos', '3. Contratos'], ['servicios', '4. Recibos y pagos de servicios'], ['tasaciones', '5. Tasaciones'],
] : dossierSections;
export function dossierDocumentType(type, operation = 'venta') {
  const normalized = legacyDossierTypes[type] ?? type;
  if (operation !== 'alquiler') return normalized;
  const rentalAliases = {
    VENDEDOR_DNI: 'ARRENDADOR_DNI', VENDEDOR_DNI_GERENTE: 'ARRENDADOR_DNI',
    COMPRADOR_DNI: 'ARRENDATARIO_DNI', COMPRADOR_DNI_GERENTE: 'ARRENDATARIO_DNI',
    VENDEDOR_PODER: 'ARRENDADOR_PODER', COMPRADOR_PODER: 'ARRENDATARIO_PODER',
    CONTRATO: 'CONTRATO_ALQUILER',
    VENDEDOR_RECIBO_LUZ: 'RECIBO_SERVICIO', VENDEDOR_RECIBO_AGUA: 'RECIBO_SERVICIO',
    VENDEDOR_RECIBO_GAS: 'RECIBO_SERVICIO', VENDEDOR_RECIBO_INTERNET: 'RECIBO_SERVICIO',
  };
  return rentalAliases[normalized] ?? normalized;
}
export function documentApplies(definition, config, operation = 'venta') {
  if (!documentsForOperation(operation).some(item => item.key === definition.key)) return false;
  if (operation === 'alquiler') return true;
  if (definition.party === 'comprador' && !config.compradorAsignado) return false;
  const sustentoNoPago = definition.key === 'VENDEDOR_BUSQUEDA_NACIONAL' && config.renta === 'exonerado';
  if (definition.person && !sustentoNoPago && config[`${definition.party}Tipo`] !== definition.person) return false;
  if (definition.key === 'VENDEDOR_PARTIDA_MATRIMONIAL' && config.vendedorPropietarios !== 'matrimonio') return false;
  if (definition.key === 'VENDEDOR_SEPARACION_PATRIMONIAL' && (config.vendedorPropietarios !== 'matrimonio' || config.vendedorRegimen !== 'separados')) return false;
  if (['VENDEDOR_PODER', 'VENDEDOR_VIGENCIA_PODER'].includes(definition.key) && config.vendedorRepresentante !== 'si') return false;
  if (definition.key === 'VENDEDOR_EXONERACION_RENTA' && config.renta !== 'exonerado') return false;
  if (['VENDEDOR_FORMULARIO_RENTA', 'VENDEDOR_VOUCHER_RENTA'].includes(definition.key) && config.renta === 'exonerado') return false;
  if (definition.section === 'cargas' && !config.cargas) return false;
  return true;
}
export function dossierStatus(configuration, files = [], operation = 'venta') {
  const config = { ...dossierDefaults(), ...configuration };
  const alerts = [];
  if (operation !== 'alquiler') {
    if (!config.vendedorTipo) alerts.push('Seleccionar el tipo de persona del vendedor.');
    if (config.vendedorTipo === 'natural') {
      if (config.vendedorPropietarios === 'pendiente') alerts.push('Verificar los propietarios del inmueble.');
      if (config.vendedorPropietarios === 'matrimonio' && config.vendedorRegimen === 'pendiente') alerts.push('Verificar el régimen patrimonial del matrimonio.');
      if (config.vendedorRepresentante === 'pendiente') alerts.push('Verificar si algún propietario firma mediante representante.');
    }
    if (!config.compradorAsignado) alerts.push('Comprador pendiente de asignar al cerrar la operación.');
    else if (!config.compradorTipo) alerts.push('Seleccionar el tipo de persona del comprador.');
    if (config.renta === 'pendiente') alerts.push('Definir si el vendedor paga o no paga impuesto a la renta.');
    if (config.renta === 'afecto' && !config.rentaObservacion?.trim()) alerts.push('Escribir una observación sustentando por qué el vendedor paga impuesto a la renta.');
  }
  const items = documentsForOperation(operation).map(definition => {
    const applies = documentApplies(definition, config, operation);
    const documents = files.filter(file => dossierDocumentType(file.tipoDocumento, operation) === definition.key);
    const uploaded = documents.some(file => file.almacenamiento === 'hosting');
    const sustentoNoPago = operation !== 'alquiler' && definition.key === 'VENDEDOR_BUSQUEDA_NACIONAL' && config.renta === 'exonerado';
    const note = !sustentoNoPago && definition.key.endsWith('_BUSQUEDA_NACIONAL') ? config[`${definition.party}BusquedaNota`] : '';
    const required = definition.required || definition.key.endsWith('_BUSQUEDA_NACIONAL');
    const complete = uploaded || Boolean(note);
    const state = !applies ? 'no_aplica' : complete ? 'completo' : required ? 'pendiente' : 'opcional';
    return { ...definition, section: sustentoNoPago ? 'impuestos' : definition.section, required, applies, state, complete, note, documents };
  });
  const required = items.filter(item => item.applies && item.required);
  const completed = required.filter(item => item.complete).length;
  const sections = sectionsForOperation(operation).map(([key, label]) => ({ key, label, pending: items.filter(item => item.section === key && item.state === 'pendiente').length, completed: items.filter(item => item.section === key && item.applies && item.required && item.complete).length, total: items.filter(item => item.section === key && item.applies && item.required).length }));
  return { items, sections, alerts, completed, total: required.length, percent: required.length ? Math.round(completed / required.length * 100) : 0, complete: !alerts.length && required.every(item => item.complete) };
}
