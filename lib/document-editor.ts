import { INTERMEDIATION_STRUCTURE_LABEL, INTERMEDIATION_STRUCTURE_TYPE } from './intermediation.mjs';

export type DocumentEditorKind = 'minute' | 'promise-structure' | 'promise-contract' | 'intermediation-structure';
const intermediationStructureEditor = {
  category: INTERMEDIATION_STRUCTURE_TYPE,
  event: 'estructura_intermediacion_texto',
  label: INTERMEDIATION_STRUCTURE_LABEL,
  title: INTERMEDIATION_STRUCTURE_LABEL,
  filename: 'estructura-contrato-intermediacion-inmobiliaria',
  open: 'Abrir editor de estructura de intermediación',
};
export const promiseEditors = {
  'promise-structure': { category: 'ESTRUCTURA_PROMESA_VENTA', event: 'estructura_promesa_texto', label: 'Estructura de Contrato Promesa-Venta', title: 'ESTRUCTURA DE PROMESA DE COMPRAVENTA PARA NOTARÍA', filename: 'estructura-promesa-venta', open: 'Abrir editor de estructura de promesa' },
  'promise-contract': { category: 'PROMESA_ARRAS', event: 'contrato_promesa_texto', label: 'Contrato de Promesa de Venta', title: 'CONTRATO PRIVADO DE PROMESA DE COMPRAVENTA DE INMUEBLE', filename: 'contrato-promesa-venta', open: 'Abrir editor de contrato de promesa' },
} as const;
export function documentEditorKind(value: string | null): DocumentEditorKind {
  if (value === null || value === 'minute') return 'minute';
  if (value === 'promise-structure' || value === 'intermediation-structure') return value;
  throw Error('Apartado de documento no válido.');
}
export function documentEditorConfig(kind: DocumentEditorKind, operation = 'venta') {
  if (kind === 'intermediation-structure') {
    if (operation === 'alquiler') return intermediationStructureEditor;
    if (operation !== 'venta') throw Error('La estructura de intermediación requiere una operación de venta o alquiler.');
    const title = 'Estructura de Contrato de Intermediación Inmobiliaria';
    return { ...intermediationStructureEditor, event: 'estructura_intermediacion_venta_texto', title, label: title };
  }
  if (kind !== 'minute') {
    if (operation !== 'venta') throw Error('Los documentos de promesa de venta requieren una operación de venta.');
    return promiseEditors[kind];
  }
  const rental = operation === 'alquiler';
  return { category: rental ? 'ESTRUCTURA_CONTRATO_ALQUILER' : 'ESTRUCTURA_MINUTA', event: 'estructura_minuta_texto', label: rental ? 'Estructura de Alquiler' : 'Estructura de Minuta', title: rental ? 'Estructura de Contrato de Alquiler' : 'Estructura de Minuta', filename: rental ? 'estructura-alquiler' : 'estructura-minuta', open: rental ? 'Abrir editor de alquiler' : 'Abrir editor de minuta' };
}
export function documentEditorForCategory(category: string, operation: string): DocumentEditorKind | null {
  if (category === documentEditorConfig('minute', operation).category) return 'minute';
  if ((operation === 'alquiler' || operation === 'venta') && category === INTERMEDIATION_STRUCTURE_TYPE) return 'intermediation-structure';
  if (operation === 'venta') for (const kind of ['promise-structure'] as const) if (promiseEditors[kind].category === category) return kind;
  return null;
}
