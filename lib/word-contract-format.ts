import type { MinuteDocument, MinuteFormat, MinuteHighlight, MinuteTextStyle } from './minute-document';
import { minuteRuns } from './minute-format.mjs';

export const WORD_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const XML_NS = 'http://www.w3.org/XML/1998/namespace';
const paragraphTag = (node: Element, name: string) => node.namespaceURI === WORD_NS && node.localName === name;
const wordChild = (node: Element | null, name: string) => Array.from(node?.children ?? []).find(child => paragraphTag(child, name));
const wordAttribute = (node: Element | undefined, name = 'val') => node?.getAttributeNS(WORD_NS, name) ?? undefined;
const wordElement = (document: Document, name: string) => document.createElementNS(WORD_NS, 'w:' + name);

function propertiesOf(node: Element) {
  return wordChild(node.parentElement, 'rPr');
}

function runStyle(node: Element): MinuteTextStyle & { background?: MinuteHighlight['style'] } {
  const properties = propertiesOf(node);
  const property = (name: string) => wordChild(properties ?? null, name);
  const value = (name: string) => wordAttribute(property(name));
  const enabled = (name: string) => Boolean(property(name)) && !['0', 'false', 'off'].includes(value(name) ?? '');
  const size = Number(value('sz')) / 2;
  const rawColor = value('color');
  const fonts = property('rFonts');
  const font = wordAttribute(fonts, 'ascii') ?? wordAttribute(fonts, 'hAnsi');
  const highlight = value('highlight');
  const fill = wordAttribute(property('shd'), 'fill');
  return {
    ...(enabled('b') ? { bold: true } : {}),
    ...(enabled('i') ? { italic: true } : {}),
    ...(value('u') && value('u') !== 'none' ? { underline: true } : {}),
    ...(Number.isFinite(size) && size > 0 ? { size } : {}),
    ...(font ? { font } : {}),
    ...(rawColor && /^[a-f0-9]{6}$/i.test(rawColor) ? { color: '#' + rawColor.toLowerCase() } : {}),
    ...(highlight && highlight !== 'none' ? { background: 'highlight' as const }
      : fill && !['AUTO', 'FFFFFF'].includes(fill.toUpperCase()) ? { background: 'shade' as const } : {}),
  };
}

export function readWordContent(paragraphs: Element[][], title: string): MinuteDocument {
  let offset = 0;
  const formats: MinuteFormat[] = [];
  const highlights: MinuteHighlight[] = [];
  const lines = paragraphs.map(nodes => {
    let line = '';
    for (const node of nodes) {
      const text = node.textContent ?? '';
      if (!text) continue;
      const { background, ...style } = runStyle(node);
      const end = offset + text.length;
      if (Object.keys(style).length) {
        const previous = formats.at(-1);
        if (previous?.end === offset && Object.entries(style).every(([key, value]) => previous[key as keyof MinuteTextStyle] === value)
          && Object.keys(previous).length === Object.keys(style).length + 2) previous.end = end;
        else formats.push({ start: offset, end, ...style });
      }
      if (background) {
        const previous = highlights.at(-1);
        if (previous?.end === offset && previous.style === background) previous.end = end;
        else highlights.push({ start: offset, end, style: background });
      }
      line += text;
      offset = end;
    }
    offset++;
    return line;
  });
  return { title, header: '', footer: '', text: lines.join('\n'), formats, highlights };
}

const propertyOrder = ['rStyle', 'rFonts', 'b', 'bCs', 'i', 'iCs', 'caps', 'smallCaps', 'strike', 'dstrike', 'outline',
  'shadow', 'emboss', 'imprint', 'noProof', 'snapToGrid', 'vanish', 'webHidden', 'color', 'spacing', 'w',
  'kern', 'position', 'sz', 'szCs', 'highlight', 'u', 'effect', 'bdr', 'shd', 'fitText', 'vertAlign',
  'rtl', 'cs', 'em', 'lang', 'eastAsianLayout', 'specVanish', 'oMath', 'rPrChange'];

type Run = ReturnType<typeof minuteRuns>[number];

function changeRunFormat(node: Element, original: ReturnType<typeof runStyle>, desired: Run) {
  const parent = node.parentElement;
  if (!parent || !paragraphTag(parent, 'r')) return;
  const run: Element = parent;
  function set(name: string, attrs: Record<string, string> | null) {
    const property = wordChild(run, 'rPr') ?? run.insertBefore(wordElement(run.ownerDocument, 'rPr'), run.firstChild);
    wordChild(property, name)?.remove();
    if (!attrs) return;
    const element = wordElement(run.ownerDocument, name);
    for (const [key, value] of Object.entries(attrs)) element.setAttributeNS(WORD_NS, 'w:' + key, value);
    const position = propertyOrder.indexOf(name);
    const following = Array.from(property.children).find(child => propertyOrder.indexOf(child.localName) > position);
    property.insertBefore(element, following ?? null);
  }
  if (Boolean(original.bold) !== desired.bold) set('b', { val: desired.bold ? '1' : '0' });
  if (Boolean(original.italic) !== Boolean(desired.italic)) set('i', { val: desired.italic ? '1' : '0' });
  if (Boolean(original.underline) !== desired.underline) set('u', { val: desired.underline ? 'single' : 'none' });
  if ((original.size ?? 11.5) !== desired.size) set('sz', { val: String(Math.round(desired.size * 2)) });
  if (original.font !== desired.font) set('rFonts', desired.font
    ? { ascii: desired.font, hAnsi: desired.font, eastAsia: desired.font, cs: desired.font } : null);
  if (original.color !== desired.color) set('color', desired.color ? { val: desired.color.slice(1).toUpperCase() } : null);
  if (original.background !== desired.background) {
    set('highlight', desired.background === 'highlight' ? { val: 'yellow' } : null);
    set('shd', desired.background === 'shade' ? { val: 'clear', color: 'auto', fill: 'E2E8F0' } : null);
  }
}

function isolateText(node: Element) {
  const run = node.parentElement;
  if (!run || !paragraphTag(run, 'r')) return;
  const children = Array.from(run.childNodes).filter(child => child !== wordChild(run, 'rPr'));
  if (children.length === 1) return;
  const index = children.indexOf(node);
  const cloneRun = (nodes: Node[]) => {
    const clone = run.cloneNode(false) as Element;
    const properties = wordChild(run, 'rPr');
    if (properties) clone.append(properties.cloneNode(true));
    clone.append(...nodes);
    return clone;
  };
  if (index > 0) run.before(cloneRun(children.slice(0, index)));
  if (index + 1 < children.length) run.after(cloneRun(children.slice(index + 1)));
}

export function writeWordRunFormats(nodes: Element[], data: MinuteDocument, start: number) {
  let offset = start;
  for (const node of nodes) {
    const length = node.textContent?.length ?? 0;
    if (!length) continue;
    const parts = minuteRuns(data, offset, offset + length);
    const original = runStyle(node);
    const differs = (part: Run) => Boolean(original.bold) !== part.bold || Boolean(original.italic) !== Boolean(part.italic)
      || Boolean(original.underline) !== part.underline || (original.size ?? 11.5) !== part.size
      || original.font !== part.font || original.color !== part.color || original.background !== part.background;
    offset += length;
    if (!parts.some(differs)) continue;

    isolateText(node);
    const originalRun = node.parentElement;
    if (!originalRun || !paragraphTag(originalRun, 'r')) continue;
    for (const part of parts) {
      const run = originalRun.cloneNode(true) as Element;
      const text = wordChild(run, 't');
      if (!text) continue;
      text.setAttributeNS(XML_NS, 'xml:space', 'preserve');
      text.textContent = part.text;
      if (differs(part)) changeRunFormat(text, original, part);
      originalRun.before(run);
    }
    originalRun.remove();
  }
}
