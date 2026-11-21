import { planTypes } from './reference-plan.mjs';
import { INTERMEDIATION_STRUCTURE_LABEL, INTERMEDIATION_STRUCTURE_TYPE } from './intermediation.mjs';
import { emptySaneamiento, saneamientoInput } from './saneamiento-folders.mjs';
// Persisted seller/buyer configuration remains compatible; rental requirements are operation-specific.
export const dossierDefaults = () => ({ vendedorTipo: '', vendedorPropietarios: 'pendiente', vendedorRegimen: 'pendiente', vendedorExcepcionConyuge: 'ninguna', vendedorRepresentante: 'pendiente', arrendadorRepresentante: 'pendiente', arrendatarioRepresentante: 'pendiente', arrendadorTipo: '', arrendatarioTipo: '', compradorAsignado: false, compradorTipo: '', compradorComposicion: 'pendiente', compradorRegimen: 'pendiente', compradorRepresentante: 'pendiente', vendedorBusquedaNota: '', compradorBusquedaNota: '', renta: 'pendiente', rentaObservacion: '', cargas: false, planos: false, catalogoDiagnostico: false, saneamiento: emptySaneamiento() });
export function dossierInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw Error('Configuración no válida.');
  const result = dossierDefaults();
  result.saneamiento = saneamientoInput(body.saneamiento);
  for (const [key, values] of Object.entries({ compradorComposicion: ['pendiente', 'uno', 'matrimonio', 'varios'], compradorRegimen: ['pendiente', 'comunes', 'separados'], compradorRepresentante: ['pendiente', 'si', 'no'], vendedorPropietarios: ['pendiente', 'uno', 'matrimonio', 'divorciado', 'viudo', 'varios'], vendedorRegimen: ['pendiente', 'comunes', 'separados'], vendedorRepresentante: ['pendiente', 'si', 'no'], arrendadorRepresentante: ['pendiente', 'si', 'no'], arrendatarioRepresentante: ['pendiente', 'si', 'no'] })) {
    const value = body[key] ?? 'pendiente';
    if (!values.includes(value)) throw Error('Revisa las condiciones de las partes y su representación.');
    result[key] = value;
  }
  const excepcion = body.vendedorExcepcionConyuge ?? 'ninguna';
  if (!['ninguna', 'compra_soltero', 'herencia'].includes(excepcion)) throw Error('Selecciona una excepción de firma del cónyuge válida.');
  result.vendedorExcepcionConyuge = excepcion;
  for (const key of ['vendedorTipo', 'compradorTipo']) {
    if (!['', 'natural', 'juridica'].includes(body[key])) throw Error('Selecciona persona natural o jurídica.');
    result[key] = body[key];
  }
  for (const key of ['arrendadorTipo', 'arrendatarioTipo']) {
    const value = body[key] ?? '';
    if (!['', 'natural', 'juridica'].includes(value)) throw Error('Selecciona persona natural o jurídica para las partes del alquiler.');
    result[key] = value;
  }
  for (const key of ['compradorAsignado', 'cargas']) {
    if (typeof body[key] !== 'boolean') throw Error('Revisa las condiciones del expediente.');
    result[key] = body[key];
  }
  for (const key of ['planos', 'catalogoDiagnostico']) {
    const value = body[key] ?? false;
    if (typeof value !== 'boolean') throw Error('Revisa las condiciones de planos y catálogo y diagnóstico físico legal.');
    result[key] = value;
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
const sectionExtraDocuments = ['identificacion', 'inmueble', 'contratos', 'impuestos', 'servicios', 'cargas', 'tasaciones']
  .map(section => doc(`OTROS_${section.toUpperCase()}`, 'Otros documentos', section, false));
export const isSectionExtraDocument = type => sectionExtraDocuments.some(item => item.key === type);
export function validateExtraDocumentDescription(type, description) {
  if (isSectionExtraDocument(type) && (typeof description !== 'string' || !description.trim() || description.trim().length > 500)) {
    throw Error('Escribe una breve descripción del documento especial (máximo 500 caracteres).');
  }
}
const letterDocument = doc('CARTA', 'Cartas', 'cartas', false);
const planDocuments = [
  doc(planTypes[1], 'Plano de ubicación referencial', 'planos', false),
  doc(planTypes[2], 'Modelo de plano de ubicación referencial', 'planos', false),
];
const saleDocuments = [
  ...['vendedor', 'comprador'].flatMap(party => {
    const prefix = party.toUpperCase();
    return [
      doc(`${prefix}_DNI`, 'DNI', 'identificacion', true, party, 'natural'),
      doc(`${prefix}_PARTIDA_MATRIMONIAL`, 'Partida matrimonial', 'identificacion', false, party, 'natural'),
      doc(`${prefix}_PODER`, 'Poder', 'identificacion', false, party, 'natural'),
      doc(`${prefix}_VIGENCIA_PODER`, 'Vigencia de poder', 'identificacion', false, party, 'natural'),
      doc(`${prefix}_SEPARACION_PATRIMONIAL`, 'Partida registral de separación de bienes', 'identificacion', false, party, 'natural'),
      doc(`${prefix}_BUSQUEDA_NACIONAL`, 'Búsqueda nacional', 'impuestos', false, party, party === 'comprador' ? 'juridica' : 'natural'),
      doc(`${prefix}_FICHA_RUC`, 'Ficha RUC', 'identificacion', true, party, 'juridica'),
      doc(`${prefix}_DNI_GERENTE`, 'DNI del gerente', 'identificacion', true, party, 'juridica'),
      doc(`${prefix}_PODER_GERENTE`, 'Poder del gerente', 'identificacion', true, party, 'juridica'),
      doc(`${prefix}_VIGENCIA_GERENTE`, 'Vigencia de poder del gerente', 'identificacion', true, party, 'juridica'),
    ];
  }),
  doc('VENDEDOR_COMPRA_SOLTERO', 'Sustento de adquisición antes de casarse', 'identificacion', true, 'vendedor', 'natural'),
  doc('VENDEDOR_HERENCIA', 'Sustento de sucesión intestada o herencia', 'identificacion', true, 'vendedor', 'natural'),
  doc('COPIA_LITERAL_CRI', 'Copia literal o CRI', 'inmueble'),
  doc('HR_VENTA', 'HR y PU del año de la venta', 'inmueble'),
  doc('TITULO_ULTIMA_TRANSFERENCIA', 'Título archivado de la última transferencia', 'inmueble'),
  doc('CONTRATO_INTERVENCION_INMOBILIARIA', 'Contrato de Intervención Inmobiliaria', 'contratos'),
  doc(INTERMEDIATION_STRUCTURE_TYPE, 'Estructura de Contrato de Intermediación Inmobiliaria', 'contratos', false),
  doc('ESTRUCTURA_PROMESA_VENTA', '3.3 Estructura de Contrato Promesa Venta', 'contratos', false),
  doc('PROMESA_ARRAS', '3.4 Contrato de Promesa de Venta', 'contratos', false),
  doc('ESTRUCTURA_MINUTA', '3.5 Estructura Minuta', 'contratos'),
  doc('MINUTA_COMPRAVENTA', '3.6 Minuta', 'contratos'),
  doc('ESCRITURA_PUBLICA', '3.7 Escritura Pública', 'contratos'),
  doc('VENDEDOR_LIQUIDACION', 'Liquidación del vendedor', 'impuestos', true, 'vendedor'),
  doc('VENDEDOR_FORMULARIO_RENTA', 'Formulario de impuesto a la renta', 'impuestos', true, 'vendedor'),
  doc('VENDEDOR_VOUCHER_RENTA', 'Voucher de pago del impuesto a la renta', 'impuestos', true, 'vendedor'),
  doc('VENDEDOR_EXONERACION_RENTA', 'Exoneración del impuesto a la renta', 'impuestos', true, 'vendedor'),
  doc('VENDEDOR_LIQUIDACION_MUNICIPAL', 'Liquidación de autovalúo y arbitrios municipales', 'impuestos', true, 'vendedor'),
  doc('VENDEDOR_PAGO_MUNICIPAL', 'Voucher de Pago de Impuestos Municipales, autovalúo y arbitrios', 'impuestos', true, 'vendedor'),
  doc('VENDEDOR_CONSTANCIA_NO_ADEUDO_MUNICIPAL', 'Constancia de no adeudo de autovalúo y arbitrios', 'impuestos', true, 'vendedor'),
  doc('COMPRADOR_LIQUIDACION', 'Liquidación del comprador', 'impuestos', true, 'comprador'),
  doc('COMPRADOR_ALCABALA', 'Voucher de pago de alcabala', 'impuestos', true, 'comprador'),
  doc('COMPRADOR_FORMULARIO_ALCABALA', 'Formulario de cancelación de alcabala', 'impuestos', true, 'comprador'),
  ...[['LUZ', 'luz'], ['AGUA', 'agua'], ['GAS', 'gas'], ['INTERNET', 'internet']].map(([key, label]) => doc(`VENDEDOR_RECIBO_${key}`, `Recibo de ${label}`, 'servicios', true, 'vendedor')),
  doc('LEVANTAMIENTO_CARGAS', 'Saneamiento físico legal', 'cargas'),
  doc('TASACION_EXPRESS', 'Tasación express', 'tasaciones'),
  doc('TASACION_PROPIETARIO', 'Tasaciones del propietario', 'tasaciones', false),
  doc(planTypes[0], 'Plano de distribución', 'planos'),
  ...planDocuments,
  doc('CATALOGO_DIAGNOSTICO_FISICO_LEGAL', 'Catálogo y diagnóstico físico legal', 'catalogo'),
  letterDocument,
  ...sectionExtraDocuments,
];
export const legacyDossierTypes = { DNI_PROPIETARIO: 'VENDEDOR_DNI', COPIA_LITERAL: 'COPIA_LITERAL_CRI', TASACION: 'TASACION_EXPRESS' };
export const dossierSections = [
  ['identificacion', '1. DNI y poderes'], ['inmueble', '2. Documentos del inmueble'], ['contratos', '3. Contratos'],
  ['impuestos', '4. Impuestos y constancias'], ['servicios', '5. Recibos y pagos de servicios'], ['cargas', '6. Saneamiento físico legal'], ['tasaciones', '7. Tasaciones'],
  ['planos', '8. Planos'], ['catalogo', '9. Catálogo y diagnóstico físico legal'], ['cartas', '10. Cartas'],
];
const rentalDocuments = [
  doc('ARRENDADOR_LIQUIDACION', 'Liquidación del arrendador', 'servicios', false, 'arrendador'),
  doc('ARRENDATARIO_LIQUIDACION', 'Liquidación del arrendatario', 'servicios', false, 'arrendatario'),
  ...['arrendador', 'arrendatario'].flatMap(party => [
    doc(`${party.toUpperCase()}_DNI`, 'DNI', 'identificacion', true, party, 'natural'),
    doc(`${party.toUpperCase()}_PODER`, 'Poder', 'identificacion', true, party, 'natural'),
    doc(`${party.toUpperCase()}_VIGENCIA_PODER`, 'Vigencia de poder', 'identificacion', true, party, 'natural'),
    doc(`${party.toUpperCase()}_FICHA_RUC`, 'Ficha RUC', 'identificacion', true, party, 'juridica'),
    doc(`${party.toUpperCase()}_DNI_GERENTE`, 'DNI del gerente', 'identificacion', true, party, 'juridica'),
    doc(`${party.toUpperCase()}_PODER_GERENTE`, 'Poder del gerente', 'identificacion', true, party, 'juridica'),
    doc(`${party.toUpperCase()}_VIGENCIA_GERENTE`, 'Vigencia de poder del gerente', 'identificacion', true, party, 'juridica'),
  ]),
  doc('COPIA_LITERAL_CRI', 'Copia literal o CRI', 'inmueble'),
  doc(INTERMEDIATION_STRUCTURE_TYPE, INTERMEDIATION_STRUCTURE_LABEL, 'contratos', false),
  doc('CONTRATO_INTERVENCION_INMOBILIARIA', 'Contrato de Intervención Inmobiliaria', 'contratos'),
  doc('ESTRUCTURA_CONTRATO_ALQUILER', 'Estructura de Contrato de Alquiler', 'contratos'),
  doc('CONTRATO_ALQUILER', 'Contrato de Alquiler', 'contratos'),
  doc('RECIBO_SERVICIO', 'Recibos de servicios', 'servicios'),
  doc('PAGO_SERVICIO', 'Pagos de servicios', 'servicios'),
  doc('TASACION_EXPRESS', 'Tasación express', 'tasaciones'),
  doc('TASACION_PROPIETARIO', 'Otras tasaciones', 'tasaciones', false),
  doc('LEVANTAMIENTO_CARGAS', 'Saneamiento físico legal', 'cargas', false),
  doc(planTypes[0], 'Plano de distribución', 'planos', false),
  ...planDocuments,
  doc('CATALOGO_DIAGNOSTICO_FISICO_LEGAL', 'Catálogo y diagnóstico físico legal', 'catalogo', false),
  letterDocument,
  ...sectionExtraDocuments,
];
export const dossierDocuments = [...new Map([...saleDocuments, ...rentalDocuments].map(item => [item.key, item])).values()];
export const documentsForOperation = operation => operation === 'alquiler' ? rentalDocuments : saleDocuments;
export const sectionsForOperation = operation => { void operation; return dossierSections; };
export function dossierDocumentType(type, operation = 'venta') {
  const normalized = legacyDossierTypes[type] ?? type;
  if (operation !== 'alquiler') return normalized === 'CONTRATO_ALQUILER' ? 'OTROS_CONTRATOS' : normalized;
  const rentalAliases = {
    VENDEDOR_DNI: 'ARRENDADOR_DNI', VENDEDOR_DNI_GERENTE: 'ARRENDADOR_DNI_GERENTE',
    COMPRADOR_DNI: 'ARRENDATARIO_DNI', COMPRADOR_DNI_GERENTE: 'ARRENDATARIO_DNI_GERENTE',
    VENDEDOR_PODER: 'ARRENDADOR_PODER', COMPRADOR_PODER: 'ARRENDATARIO_PODER',
    VENDEDOR_VIGENCIA_PODER: 'ARRENDADOR_VIGENCIA_PODER', COMPRADOR_VIGENCIA_PODER: 'ARRENDATARIO_VIGENCIA_PODER',
    VENDEDOR_FICHA_RUC: 'ARRENDADOR_FICHA_RUC', COMPRADOR_FICHA_RUC: 'ARRENDATARIO_FICHA_RUC',
    VENDEDOR_PODER_GERENTE: 'ARRENDADOR_PODER_GERENTE', COMPRADOR_PODER_GERENTE: 'ARRENDATARIO_PODER_GERENTE',
    VENDEDOR_VIGENCIA_GERENTE: 'ARRENDADOR_VIGENCIA_GERENTE', COMPRADOR_VIGENCIA_GERENTE: 'ARRENDATARIO_VIGENCIA_GERENTE',
    CONTRATO: 'CONTRATO_ALQUILER',
    VENDEDOR_RECIBO_LUZ: 'RECIBO_SERVICIO', VENDEDOR_RECIBO_AGUA: 'RECIBO_SERVICIO',
    VENDEDOR_RECIBO_GAS: 'RECIBO_SERVICIO', VENDEDOR_RECIBO_INTERNET: 'RECIBO_SERVICIO',
  };
  return rentalAliases[normalized] ?? normalized;
}
export function documentApplies(definition, config, operation = 'venta') {
  if (!documentsForOperation(operation).some(item => item.key === definition.key)) return false;
  if (isSectionExtraDocument(definition.key)) return true;
  if (operation === 'alquiler') {
    if (definition.section === 'cargas' && !config.cargas) return false;
    if (definition.section === 'planos' && !config.planos) return false;
    if (definition.section === 'catalogo' && !config.catalogoDiagnostico) return false;
    if (definition.person && config[`${definition.party}Tipo`] !== definition.person) return false;
    if (definition.key.endsWith('_PODER')) return config[`${definition.party}Representante`] === 'si';
    return true;
  }
  if (definition.party === 'comprador' && !config.compradorAsignado) return false;
  if (definition.key === 'COMPRADOR_PARTIDA_MATRIMONIAL' && config.compradorComposicion !== 'matrimonio') return false;
  if (definition.key === 'COMPRADOR_SEPARACION_PATRIMONIAL' && (config.compradorComposicion !== 'matrimonio' || config.compradorRegimen !== 'separados')) return false;
  if (['COMPRADOR_PODER', 'COMPRADOR_VIGENCIA_PODER'].includes(definition.key) && config.compradorRepresentante !== 'si') return false;
  if (definition.key === 'COMPRADOR_BUSQUEDA_NACIONAL') return false;
  if (definition.key === 'VENDEDOR_BUSQUEDA_NACIONAL') return ['natural', 'juridica'].includes(config.vendedorTipo) && config.renta === 'exonerado';
  if (definition.person && config[`${definition.party}Tipo`] !== definition.person) return false;
  if (definition.key === 'VENDEDOR_COMPRA_SOLTERO' && (config.vendedorPropietarios !== 'matrimonio' || config.vendedorRegimen === 'separados' || config.vendedorExcepcionConyuge !== 'compra_soltero')) return false;
  if (definition.key === 'VENDEDOR_HERENCIA' && (config.vendedorPropietarios !== 'matrimonio' || config.vendedorRegimen === 'separados' || config.vendedorExcepcionConyuge !== 'herencia')) return false;
  if (definition.key === 'VENDEDOR_PARTIDA_MATRIMONIAL' && config.vendedorPropietarios !== 'matrimonio') return false;
  if (definition.key === 'VENDEDOR_SEPARACION_PATRIMONIAL' && (config.vendedorPropietarios !== 'matrimonio' || config.vendedorRegimen !== 'separados')) return false;
  if (['VENDEDOR_PODER', 'VENDEDOR_VIGENCIA_PODER'].includes(definition.key) && config.vendedorRepresentante !== 'si') return false;
  if (definition.key === 'VENDEDOR_EXONERACION_RENTA' && config.renta !== 'exonerado') return false;
  if (['VENDEDOR_FORMULARIO_RENTA', 'VENDEDOR_VOUCHER_RENTA'].includes(definition.key) && config.renta === 'exonerado') return false;
  if (definition.section === 'cargas' && !config.cargas) return false;
  if (definition.section === 'planos' && !config.planos) return false;
  if (definition.section === 'catalogo' && !config.catalogoDiagnostico) return false;
  return true;
}
export function dossierStatus(configuration, files = [], operation = 'venta') {
  const config = { ...dossierDefaults(), ...configuration };
  const alerts = [];
  if (operation === 'alquiler') {
    for (const party of ['arrendador', 'arrendatario']) {
      if (!config[`${party}Tipo`]) alerts.push(`Seleccionar el tipo de persona del ${party}.`);
      if (config[`${party}Tipo`] === 'natural' && config[`${party}Representante`] === 'pendiente') alerts.push(`Verificar si el ${party} firma personalmente o mediante representante.`);
    }
  }
  if (operation !== 'alquiler') {
    if (!config.vendedorTipo) alerts.push('Seleccionar el tipo de persona del vendedor.');
    if (config.vendedorTipo === 'natural') {
      if (config.vendedorPropietarios === 'pendiente') alerts.push('Verificar los propietarios del inmueble.');
      if (config.vendedorPropietarios === 'matrimonio' && config.vendedorRegimen === 'pendiente') alerts.push('Verificar el régimen patrimonial del matrimonio.');
      if (config.vendedorRepresentante === 'pendiente') alerts.push('Verificar si algún propietario firma mediante representante.');
    }
    if (!config.compradorAsignado) alerts.push('Comprador pendiente de asignar al cerrar la operación.');
    else if (!config.compradorTipo) alerts.push('Seleccionar el tipo de persona del comprador.');
    if (config.compradorAsignado && config.compradorTipo === 'natural') {
      if (config.compradorComposicion === 'pendiente') alerts.push('Verificar quiénes compran el inmueble.');
      if (config.compradorComposicion === 'matrimonio' && config.compradorRegimen === 'pendiente') alerts.push('Verificar el régimen patrimonial del comprador.');
      if (config.compradorRepresentante === 'pendiente') alerts.push('Verificar si algún comprador firma mediante representante.');
    }
    if (config.renta === 'pendiente') alerts.push('Definir si el vendedor paga o no paga impuesto a la renta.');
    if (config.renta === 'afecto' && !config.rentaObservacion?.trim()) alerts.push('Escribir una observación sustentando por qué el vendedor paga impuesto a la renta.');
  }
  const referencePlanUploaded = files.some(file => file.tipoDocumento === planTypes[1] && file.almacenamiento === 'hosting');
  const items = documentsForOperation(operation).map(definition => {
    const applies = documentApplies(definition, config, operation);
    const documents = files.filter(file => dossierDocumentType(file.tipoDocumento, operation) === definition.key);
    const uploaded = documents.some(file => file.almacenamiento === 'hosting');
    const sustentoNoPago = operation !== 'alquiler' && definition.key === 'VENDEDOR_BUSQUEDA_NACIONAL' && applies;
    const note = '';
    const required = definition.required || sustentoNoPago;
    const complete = uploaded || (definition.required && definition.key === planTypes[0] && referencePlanUploaded) || Boolean(note);
    const state = !applies ? 'no_aplica' : complete ? 'completo' : required ? 'pendiente' : 'opcional';
    return { ...definition, required, applies, state, complete, note, documents };
  });
  const required = items.filter(item => item.applies && item.required);
  const completed = required.filter(item => item.complete).length;
  const sections = sectionsForOperation(operation).map(([key, label]) => ({ key, label, pending: items.filter(item => item.section === key && item.state === 'pendiente').length, completed: items.filter(item => item.section === key && item.applies && item.required && item.complete).length, total: items.filter(item => item.section === key && item.applies && item.required).length }));
  return { items, sections, alerts, completed, total: required.length, percent: required.length ? Math.round(completed / required.length * 100) : 0, complete: !alerts.length && required.every(item => item.complete) };
}

// Closing requires actual uploads for all applicable mandatory documents, even
// when an interim note was allowed while preparing the transaction.
export function dossierClosureStatus(configuration, files = [], operation = 'venta') {
  const status = dossierStatus(configuration, files, operation);
  const required = status.items.filter(item => item.applies && item.required);
  const missingFiles = required.filter(item => item.key === planTypes[0]
    ? !files.some(file => planTypes.slice(0, 2).includes(file.tipoDocumento) && file.almacenamiento === 'hosting')
    : !item.documents.some(file => file.almacenamiento === 'hosting'));
  const missing = [...status.alerts, ...missingFiles.map(item => `${item.key === planTypes[0] ? 'Plano de distribución o de ubicación referencial' : item.label}${item.party !== 'inmueble' ? ` · ${item.party}` : ''}`)];
  return { complete: missing.length === 0, missing, completed: required.length - missingFiles.length, total: required.length };
}
