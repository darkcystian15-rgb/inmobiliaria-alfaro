import { promiseSourceModel } from './promise-source-model';
import type { MinuteProperty } from './minute-template';
import { documentEditorConfig, promiseEditors } from './document-editor';

export function promiseBase(property: MinuteProperty, kind: keyof typeof promiseEditors) {
  const config = documentEditorConfig(kind, property.operation);
  return kind === 'promise-structure' ? { title: config.title, ...structuredClone(promiseSourceModel) } : { title: config.title, text: '' };
}
