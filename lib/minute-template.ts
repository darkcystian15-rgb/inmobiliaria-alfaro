import { intermediationSourceModel, saleIntermediationSourceModel } from './intermediation-source-model';
import { minuteSourceModels } from './minute-source-models';
import { promiseBase } from './promise-template';
import { documentEditorConfig, type DocumentEditorKind } from './document-editor';
import type { MinuteDocument } from './minute-document';

export type MinuteProperty = { operation: 'venta' | 'alquiler'; type?: string; address?: string | null; code?: string };
export const minuteCategory = (operation: string) => operation === 'alquiler' ? 'ESTRUCTURA_CONTRATO_ALQUILER' : 'ESTRUCTURA_MINUTA';
export const minuteTitle = (operation: string) => operation === 'alquiler' ? 'ESTRUCTURA DE CONTRATO DE ALQUILER' : 'ESTRUCTURA DE MINUTA DE COMPRAVENTA';

export function minuteBase(property: MinuteProperty) {
  return { title: minuteTitle(property.operation), ...structuredClone(minuteSourceModels[property.operation]) };
}

export function intermediationStructureBase(operation: string) {
  const { title } = documentEditorConfig('intermediation-structure', operation);
  return { title, ...structuredClone(operation === 'venta' ? saleIntermediationSourceModel : intermediationSourceModel) };
}

export function applyMinuteBase(data: MinuteDocument, property: MinuteProperty, mode: 'replace' | 'append', kind: DocumentEditorKind = 'minute'): MinuteDocument {
  const base: Partial<MinuteDocument> & Pick<MinuteDocument, 'text' | 'title'> = kind === 'minute'
    ? minuteBase(property)
    : kind === 'intermediation-structure'
      ? intermediationStructureBase(property.operation)
      : promiseBase(property, kind);
  const text = mode === 'append' && data.text.trim() ? `${data.text}\n\n${base.text}` : base.text;
  if (text.length > 20000) throw Error('El texto y la estructura superan los 20 000 caracteres. Reduce el contenido o reemplaza el texto.');
  const defaultTitle = ['Estructura de Minuta', 'Estructura de Contrato de Alquiler', minuteTitle('venta'), minuteTitle('alquiler'), documentEditorConfig(kind, property.operation).title, documentEditorConfig(kind, property.operation).label].includes(data.title);
  const shift = mode === 'append' && data.text.trim() ? data.text.length + 2 : 0;
  const formats = [...(shift ? data.formats || [] : []), ...(base.formats || []).map(mark => ({ ...mark, start: mark.start + shift, end: mark.end + shift }))];
  const paragraphs = [...(shift ? data.paragraphs || [] : []), ...(base.paragraphs || []).map(mark => ({ ...mark, start: mark.start + shift, end: mark.end + shift }))];
  return { ...data, layout: base.layout ?? (shift ? data.layout : undefined), paragraphs, ...(mode === 'replace' && data.images ? { images: [] } : {}), text, title: defaultTitle ? base.title : data.title, highlights: mode === 'append' && data.text.trim() ? data.highlights || [] : [], formats };
}
