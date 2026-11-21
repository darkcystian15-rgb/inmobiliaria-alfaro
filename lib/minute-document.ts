export type MinuteHighlight = { start: number; end: number; style: 'highlight' | 'shade' };
export type MinuteTextStyle = { bold?: boolean; underline?: boolean; size?: number; italic?: boolean; font?: string; color?: string };
export type MinuteFormat = MinuteTextStyle & { start: number; end: number };
export type MinuteImage = { fileId: number; after: number; width: number; height?: number; keepRatio?: boolean; align: 'left' | 'center' | 'right'; caption: string };
export type MinuteParagraph = { start: number; end: number; align: 'left' | 'center' | 'right' | 'justify'; indent: number; firstLine: number; before: number; after: number; line: number };
export type MinuteDocument = { layout?: 'word-model'; paragraphs?: MinuteParagraph[]; imageColumns?: 1 | 2 | 3; images?: MinuteImage[]; watermark?: { enabled: boolean; width: number; opacity: number }; title: string; header: string; footer: string; text: string; highlights?: MinuteHighlight[]; formats?: MinuteFormat[]; footerReference?: string; footerPagination?: string };
export const minuteEvent = 'estructura_minuta_texto';
export const emptyMinute = (operation = 'venta'): MinuteDocument => ({ title: operation === 'alquiler' ? 'Estructura de Contrato de Alquiler' : 'Estructura de Minuta', header: 'Inmobiliaria Alberto Alfaro', footer: 'Documento de trabajo para revisión', text: '' });
export function minuteInput(value: unknown): MinuteDocument {
  if (!value || typeof value !== 'object') throw Error('Contenido no válido.');
  const source = value as Record<string, unknown>;
  const result = {} as MinuteDocument;
  for (const [key, limit] of Object.entries({ title: 160, header: 300, footer: 300, text: 20000 })) {
    const item = source[key];
    if (typeof item !== 'string' || item.length > limit || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(item)) throw Error(`Revisa el campo ${key}.`);
    result[key as 'title' | 'header' | 'footer' | 'text'] = item.replace(/\r\n?/g, '\n');
  }
  if (!result.title.trim()) throw Error('Escribe un título.');
  for (const key of ['footerReference', 'footerPagination'] as const) {
    if (source[key] === undefined) continue;
    if (typeof source[key] !== 'string' || source[key].length > 160 || /[\r\n\u0000-\u001f]/.test(source[key])) throw Error('Revisa los datos del pie de página.');
    result[key] = source[key];
  }
  if (source.highlights !== undefined) {
    if (!Array.isArray(source.highlights) || source.highlights.length > 200) throw Error('Admite hasta 200 fragmentos destacados.');
    let previousEnd = 0;
    result.highlights = source.highlights.map((mark: MinuteHighlight) => {
      if (!mark || !Number.isSafeInteger(mark.start) || !Number.isSafeInteger(mark.end) || mark.start < previousEnd || mark.end <= mark.start || mark.end > result.text.length || !['highlight', 'shade'].includes(mark.style)) throw Error('Revisa los fragmentos destacados.');
      previousEnd = mark.end; return { start: mark.start, end: mark.end, style: mark.style };
    });
  }
  if (source.imageColumns !== undefined) {
    if (![1, 2, 3].includes(source.imageColumns as number)) throw Error('Elige una, dos o tres imágenes por fila.');
    result.imageColumns = source.imageColumns as 1 | 2 | 3;
  }
  if (source.images !== undefined) {
    if (!Array.isArray(source.images) || source.images.length > 8) throw Error('Admite hasta 8 imágenes.');
    result.images = source.images.map((image: MinuteImage) => {
      if (!image || !Number.isSafeInteger(image.fileId) || image.fileId < 1 || !Number.isSafeInteger(image.after) || image.after < 0 || image.after > result.text.length || !Number.isFinite(image.width) || image.width <= 0 || image.width > 160 || !['left', 'center', 'right'].includes(image.align) || typeof image.caption !== 'string' || image.caption.length > 160 || /[\u0000-\u001f]/.test(image.caption)) throw Error('Revisa las imágenes del documento.');
      if ((image.height !== undefined && (!Number.isFinite(image.height) || image.height <= 0 || image.height > 240)) || (image.keepRatio !== undefined && typeof image.keepRatio !== 'boolean')) throw Error('Revisa el alto y la proporción de la imagen.');
      return { ...(image.height !== undefined ? { height: image.height } : {}), ...(image.keepRatio !== undefined ? { keepRatio: image.keepRatio } : {}), fileId: image.fileId, after: image.after, width: image.width, align: image.align, caption: image.caption };
    });
  }
  if (source.watermark !== undefined) {
    const mark = source.watermark as NonNullable<MinuteDocument['watermark']>;
    if (!mark || typeof mark.enabled !== 'boolean' || !Number.isFinite(mark.width) || mark.width < 40 || mark.width > 160 || !Number.isFinite(mark.opacity) || mark.opacity < 0.03 || mark.opacity > 0.25) throw Error('Revisa la marca de agua.');
    result.watermark = { enabled: mark.enabled, width: mark.width, opacity: mark.opacity };
  }
  if (result.title.includes('\n')) throw Error('El título debe ocupar una sola línea de texto.');
  if (source.formats !== undefined) {
    if (!Array.isArray(source.formats) || source.formats.length > 200) throw Error('Admite hasta 200 fragmentos con formato.');
    let previousEnd = 0;
    result.formats = source.formats.map((mark: MinuteFormat) => {
      if (!mark || !Number.isSafeInteger(mark.start) || !Number.isSafeInteger(mark.end) || mark.start < previousEnd || mark.end <= mark.start || mark.end > result.text.length || (mark.bold !== undefined && typeof mark.bold !== 'boolean') || (mark.size !== undefined && ![10, 11, 11.5, 12, 14, 16, 18, 20, 24].includes(mark.size)) || (mark.underline !== undefined && typeof mark.underline !== 'boolean') || (mark.bold === undefined && mark.underline === undefined && mark.size === undefined)) throw Error('Revisa la negrita y el tamaño del texto seleccionado.');
      previousEnd = mark.end;
      return { start: mark.start, end: mark.end, ...(mark.bold !== undefined ? { bold: mark.bold } : {}), ...(mark.underline !== undefined ? { underline: mark.underline } : {}), ...(mark.size !== undefined ? { size: mark.size } : {}) };
    });
  }
  if (source.layout !== undefined) {
    if (source.layout !== 'word-model') throw Error('Diseño de documento no válido.');
    result.layout = source.layout;
  }
  if (source.paragraphs !== undefined) {
    if (!Array.isArray(source.paragraphs) || source.paragraphs.length > 300) throw Error('Admite hasta 300 párrafos con formato.');
    let previousEnd = -1;
    result.paragraphs = source.paragraphs.map((p: MinuteParagraph) => {
      if (!p || !Number.isSafeInteger(p.start) || !Number.isSafeInteger(p.end) || p.start <= previousEnd || p.end < p.start || p.end > result.text.length || (p.start > 0 && result.text[p.start - 1] !== '\n') || (p.end < result.text.length && result.text[p.end] !== '\n') || result.text.slice(p.start, p.end).includes('\n') || !['left', 'center', 'right', 'justify'].includes(p.align) || ![p.indent, p.firstLine, p.before, p.after, p.line].every(Number.isFinite) || p.indent < 0 || p.indent > 100 || Math.abs(p.firstLine) > 100 || p.before < 0 || p.before > 100 || p.after < 0 || p.after > 100 || p.line < 0.5 || p.line > 3) throw Error('Revisa el formato de los párrafos.');
      previousEnd = p.end;
      return { start: p.start, end: p.end, align: p.align, indent: p.indent, firstLine: p.firstLine, before: p.before, after: p.after, line: p.line };
    });
  }
  if ([result.header, result.footer].some(text => text.split('\n').length > 3)) throw Error('El encabezado y el pie admiten hasta tres líneas.');
  if (new TextEncoder().encode(JSON.stringify(result)).length > 60000) throw Error('Reduce el texto antes de guardar.');
  return result;
}

export function updateMinuteText(data: MinuteDocument, text: string, preserveFormatting = false): MinuteDocument {
  let start = 0;
  while (start < data.text.length && start < text.length && data.text[start] === text[start]) start++;
  let oldEnd = data.text.length, newEnd = text.length;
  while (oldEnd > start && newEnd > start && data.text[oldEnd - 1] === text[newEnd - 1]) { oldEnd--; newEnd--; }
  const delta = newEnd - oldEnd;
  function moveMarks<T extends { start: number; end: number }>(marks: T[] = []) {
    return marks.flatMap(mark => {
      if (mark.end <= start) return [mark];
      if (mark.start >= oldEnd) return [{ ...mark, start: mark.start + delta, end: mark.end + delta }];
      if (!preserveFormatting) return [];
      const from = mark.start <= start ? mark.start : newEnd;
      const to = mark.end > oldEnd ? mark.end + delta : mark.start <= start ? newEnd : from;
      return to > from ? [{ ...mark, start: from, end: to }] : [];
    });
  }
  const highlights = moveMarks(data.highlights);
  const formats = moveMarks(data.formats);
  const images = data.images?.map(image => ({ ...image, after: Math.min(text.length, image.after <= start ? image.after : image.after >= oldEnd ? image.after + delta : newEnd) }));
  const paragraphs: MinuteParagraph[] = [];
  if (data.paragraphs) {
    let offset = 0;
    for (const line of text.split('\n')) {
      const oldOffset = offset <= start ? offset : offset >= newEnd ? offset - delta : start;
      const source = data.paragraphs.find(p => p.start <= oldOffset && p.end >= oldOffset);
      if (source) paragraphs.push({ ...source, start: offset, end: offset + line.length });
      offset += line.length + 1;
    }
  }
  return { ...data, text, highlights, formats, ...(data.paragraphs ? { paragraphs } : {}), ...(images ? { images } : {}) };
}
