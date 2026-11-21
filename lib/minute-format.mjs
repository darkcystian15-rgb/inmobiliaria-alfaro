/** @typedef {import('./minute-document').MinuteDocument} MinuteDocument */
/** @typedef {import('./minute-document').MinuteFormat} MinuteFormat */
/** @typedef {import('./minute-document').MinuteTextStyle} MinuteTextStyle */
const styleKeys = /** @type {const} */ (['bold', 'underline', 'size', 'italic', 'font', 'color']);
export const MINUTE_FONT_SIZES = [10, 11, 11.5, 12, 14, 16, 18, 20, 24];

/** @param {MinuteDocument} data @param {number} start @param {number} end @param {MinuteTextStyle|null} patch @param {number} limit */
export function formatMinuteRange(data, start, end, patch, limit = 200) {
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start || end > data.text.length) throw Error('Selecciona primero las palabras o frases que deseas cambiar.');
  const old = data.formats || [];
  const boundaries = [...new Set([start, end, ...old.flatMap(mark => [mark.start, mark.end])])].sort((a, b) => a - b);
  /** @type {MinuteFormat[]} */
  const formats = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const a = boundaries[i], b = boundaries[i + 1];
    const original = old.find(mark => mark.start <= a && mark.end >= b);
    const styleFields = styleKeys.filter(key => original?.[key] !== undefined);
    let style = /** @type {MinuteTextStyle} */ (Object.fromEntries(styleFields.map(key => [key, original?.[key]])));
    if (a >= start && b <= end) style = patch === null ? {} : { ...style, ...patch };
    if (!Object.keys(style).length) continue;
    const last = formats.at(-1);
    if (last && last.end === a && styleKeys.every(key => last[key] === style[key])) last.end = b;
    else formats.push({ start: a, end: b, ...style });
  }
  if (formats.length > limit) throw Error(`El documento admite hasta ${limit} fragmentos con formato.`);
  return { ...data, formats };
}

/** @param {MinuteDocument} data @param {number} start @param {number} end @param {{bold?:boolean,underline?:boolean,size?:number}} defaults
 * @returns {Array<{start:number,end:number,text:string,bold:boolean,underline:boolean,size:number,italic?:boolean,font?:string,color?:string,background?:'highlight'|'shade'}>} */
export function minuteRuns(data, start = 0, end = data.text.length, defaults = {}) {
  const formats = (data.formats || []).filter(mark => mark.end > start && mark.start < end);
  const highlights = (data.highlights || []).filter(mark => mark.end > start && mark.start < end);
  const boundaries = [...new Set([start, end, ...[...formats, ...highlights].flatMap(mark => [Math.max(start, mark.start), Math.min(end, mark.end)])])].sort((a, b) => a - b);
  return boundaries.slice(0, -1).map((a, i) => {
    const b = boundaries[i + 1], format = formats.find(mark => mark.start <= a && mark.end >= b), highlight = highlights.find(mark => mark.start <= a && mark.end >= b);
    return { start: a, end: b, text: data.text.slice(a, b), bold: format?.bold ?? defaults.bold ?? false, underline: format?.underline ?? defaults.underline ?? false, size: format?.size ?? defaults.size ?? (data.layout === 'word-model' ? 11 : 11.5), ...(format?.italic !== undefined ? { italic: format.italic } : {}), ...(format?.font ? { font: format.font } : {}), ...(format?.color ? { color: format.color } : {}), ...(highlight ? { background: highlight.style } : {}) };
  });
}

/** Paragraph ranges include empty paragraphs and remain tied to the editable text.
 * @param {MinuteDocument} data @param {number} start @param {number} end */
export function minuteParagraphs(data, start = 0, end = data.text.length) {
  let offset = start;
  return data.text.slice(start, end).split('\n').map(text => {
    const from = offset; offset += text.length + 1;
    const style = data.paragraphs?.find(p => p.start <= from && p.end >= from);
    return { start: from, end: from + text.length, text, align: style?.align ?? 'left', indent: style?.indent ?? 0, firstLine: style?.firstLine ?? 0, before: style?.before ?? 0, after: style?.after ?? 8, line: style?.line ?? 1.08 };
  });
}
