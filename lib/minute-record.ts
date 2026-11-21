import 'server-only';
import { documentEditorConfig, type DocumentEditorKind } from './document-editor';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { inmTimeline } from '@/db/schema';
import { emptyMinute, minuteInput } from './minute-document';
import { intermediationStructureBase } from './minute-template';
import { INTERMEDIATION_STRUCTURE_LEGACY_TITLE } from './intermediation.mjs';

export async function readMinute(propertyId: number, executor: Pick<typeof db, 'select'> = db, operation = 'venta', kind: DocumentEditorKind = 'minute') {
  const config = documentEditorConfig(kind, operation);
  const [row] = await executor.select().from(inmTimeline).where(and(eq(inmTimeline.inmuebleId, propertyId), eq(inmTimeline.evento, config.event))).orderBy(desc(inmTimeline.id)).limit(1);
  const initial = kind === 'intermediation-structure'
    ? intermediationStructureBase(operation)
    : { title: config.title };
  const data = row?.observacion ? minuteInput(JSON.parse(row.observacion)) : { ...emptyMinute(operation), ...initial };
  if (kind === 'intermediation-structure' && data.title === INTERMEDIATION_STRUCTURE_LEGACY_TITLE + '  :') {
    const prefix = data.title + '\n\n\n';
    data.title = config.title;
    data.text = prefix + data.text;
    const shift = <T extends { start: number; end: number }>(mark: T) =>
      ({ ...mark, start: mark.start + prefix.length, end: mark.end + prefix.length });
    data.formats = data.formats?.map(shift);
    data.highlights = data.highlights?.map(shift);
    data.paragraphs = data.paragraphs?.map(shift);
    data.images = data.images?.map(image => ({ ...image, after: image.after + prefix.length }));
  }
  if (kind === 'intermediation-structure' && data.title === INTERMEDIATION_STRUCTURE_LEGACY_TITLE) {
    data.title = config.title;
  }
  return { data, version: row?.id ?? 0 };
}
