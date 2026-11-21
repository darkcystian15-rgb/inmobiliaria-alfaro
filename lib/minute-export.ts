import { jsPDF, GState } from 'jspdf';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { DocumentEditorKind } from './document-editor';
import type { MinuteDocument, MinuteParagraph } from './minute-document';
import { minuteRuns } from './minute-format.mjs';

export const MINUTE_PDF_DESIGN = 'minute-pdf-v9-word-model-format';
const numberedHeading = /^(?:\d{1,2}(?:\.\d{1,2})?[.)]\s+|[IVX]{1,6}[.)]\s+|(?:PRIMERO|PRIMERA|SEGUNDO|SEGUNDA|TERCERO|TERCERA|CUARTO|CUARTA|QUINTO|QUINTA|SEXTO|SEXTA|SÉPTIMO|SETIMO|SÉPTIMA|OCTAVO|OCTAVA|NOVENO|NOVENA|DÉCIMA)[.\s:—-])/u;
const namedHeading = /^(?:PARTES|DATOS|IDENTIFICACI[ÓO]N|PRECIO|FORMA DE PAGO|ENTREGA|ESTADO DEL INMUEBLE|CARGAS|SANEAMIENTO|GASTOS|IMPUESTOS|ACUERDOS|INFORMACI[ÓO]N|DOCUMENTOS|PUNTOS PENDIENTES|OBJETO|ANTECEDENTES|CONDICIONES|OBLIGACIONES|PLAZOS|FIRMAS)\b/u;
function isNamedHeading(text: string) { return text.length <= 100 && text === text.toLocaleUpperCase('es-PE') && !text.includes(':') && namedHeading.test(text); }
function isHeading(text: string) { return text.length <= 160 && (numberedHeading.test(text) || isNamedHeading(text)); }

export async function minutePdf(data: MinuteDocument, context: { kind?: DocumentEditorKind; propertyCode?: string; images?: Record<number, Uint8Array> } = {}): Promise<Uint8Array> {
  const pdf = new jsPDF({ format: 'a4', compress: true, putOnlyUsedFonts: true });
  const plain = context.kind === 'intermediation-structure';
  const sourceLayout = data.layout === 'word-model';
  const bodyFamily = sourceLayout ? 'MinuteCalibri' : 'MinuteSerif';
  const [logoBytes, regular, bold, sans] = await Promise.all([
    readFile(path.join(process.cwd(), 'public/branding/logo.png')),
    readFile(path.join(process.cwd(), sourceLayout ? 'assets/pdf-fonts/ModeloSans-Regular.ttf' : 'assets/pdf-fonts/LiberationSerif-Regular.ttf')),
    readFile(path.join(process.cwd(), sourceLayout ? 'assets/pdf-fonts/ModeloSans-Bold.ttf' : 'assets/pdf-fonts/LiberationSerif-Bold.ttf')),
    readFile(path.join(process.cwd(), 'assets/pdf-fonts/LiberationSans-Regular.ttf')),
  ]);
  for (const [file, bytes, family, style] of [
    ['Serif-Regular.ttf', regular, bodyFamily, 'normal'],
    ['Serif-Bold.ttf', bold, bodyFamily, 'bold'],
    ['Sans-Regular.ttf', sans, 'MinuteSans', 'normal'],
  ] as const) { pdf.addFileToVFS(file, bytes.toString('base64')); pdf.addFont(file, family, style); }

  const left = 24, right = 186, width = right - left;
  const logo = new Uint8Array(logoBytes), image = pdf.getImageProperties(logo);
  const logoWidth = Math.min(37, 17 * image.width / image.height), logoHeight = logoWidth * image.height / image.width;
  pdf.setFont('MinuteSans', 'normal'); pdf.setFontSize(8.5);
  const header: string[] = data.header ? pdf.splitTextToSize(data.header, 111) : [];
  const expandFooter = (text: string, page: string, total: string) => text.replaceAll('{pagina}', page).replaceAll('{total}', total);
  const footerReference = data.footerReference ?? (context.propertyCode ? `Inmueble: ${context.propertyCode}` : '');
  const footerPagination = data.footerPagination ?? 'Página {pagina} de {total}';
  // Reserve room using the widest possible page count for this editor's text limit.
  const footer: string[] = data.footer ? pdf.splitTextToSize(expandFooter(data.footer, '999', '999'), width) : [];
  const referenceLines: string[] = footerReference ? pdf.splitTextToSize(expandFooter(footerReference, '999', '999'), 78) : [];
  const paginationLines: string[] = footerPagination ? pdf.splitTextToSize(expandFooter(footerPagination, '999', '999'), 78) : [];
  const runningTitle: string[] = pdf.splitTextToSize(data.title, 111);
  if (header.length > 6 || footer.length > 6) throw Error('Acorta el encabezado o el pie de página.');
  const headerEnd = Math.max(35, 16 + runningTitle.length * 3.8 + (header.length ? 3 : 0) + header.length * 3.6);
  const top = headerEnd + 13;
  const lowerRows = Math.max(referenceLines.length, paginationLines.length);
  const lowerY = 286 - Math.max(0, lowerRows - 1) * 3.5;
  const bottom = Math.min(272, lowerY - 13) - footer.length * 3.5;
  type Piece = { text: string; bold: boolean; underline?: boolean; size: number; background?: 'highlight' | 'shade' };
  type Line = { pieces: Piece[]; width: number; height: number; ascent: number };
  function font(piece: Piece) { pdf.setFont(bodyFamily, piece.bold ? 'bold' : 'normal'); pdf.setFontSize(piece.size); }
  function measure(piece: Piece) { font(piece); return pdf.getTextWidth(piece.text); }
  function append(pieces: Piece[], piece: Piece) {
    const last = pieces[pieces.length - 1];
    if (last && last.bold === piece.bold && last.underline === piece.underline && last.size === piece.size && last.background === piece.background) last.text += piece.text;
    else pieces.push({ ...piece });
  }
  function layout(runs: Piece[], available: number, firstLine = 0, lineSpacing = 1.55): Line[] {
    const tokens: { space: boolean; pieces: Piece[] }[] = [];
    for (const run of runs) for (const part of run.text.replace(/\t/g, ' ').split(/(\s+)/u).filter(Boolean)) {
      const space = /^\s+$/u.test(part), previous = tokens[tokens.length - 1];
      if (previous?.space === space) append(previous.pieces, { ...run, text: part });
      else tokens.push({ space, pieces: [{ ...run, text: part }] });
    }
    const lines: Line[] = []; let pieces: Piece[] = [], occupied = 0;
    function finish() {
      while (pieces.length) { const last = pieces[pieces.length - 1]; last.text = last.text.trimEnd(); if (last.text) break; pieces.pop(); }
      if (pieces.length) {
        const size = Math.max(...pieces.map(piece => piece.size));
        lines.push({ pieces, width: pieces.reduce((sum, piece) => sum + measure(piece), 0), height: Math.max(sourceLayout ? 0 : 5.7, size * 0.352778 * lineSpacing), ascent: size * 0.352778 * 0.85 });
      }
      pieces = []; occupied = 0;
    }
    for (const token of tokens) {
      if (token.space) { if (pieces.length) for (const piece of token.pieces) { append(pieces, piece); occupied += measure(piece); } continue; }
      const tokenWidth = token.pieces.reduce((sum, piece) => sum + measure(piece), 0);
      if (pieces.length && occupied + tokenWidth > available - (lines.length === 0 ? firstLine : 0)) finish();
      if (tokenWidth <= available - (lines.length === 0 ? firstLine : 0)) { for (const piece of token.pieces) append(pieces, piece); occupied += tokenWidth; continue; }
      // Long words are wrapped without splitting UTF-16 surrogate pairs.
      for (const piece of token.pieces) for (const char of piece.text) {
        const fragment = { ...piece, text: char }, width = measure(fragment);
        if (pieces.length && occupied + width > available - (lines.length === 0 ? firstLine : 0)) finish();
        append(pieces, fragment); occupied += width;
      }
    }
    finish(); return lines;
  }
  function draw(line: Line, x: number, topY: number, justify = false, available = width) {
    const spaces = line.pieces.reduce((sum, piece) => sum + (piece.text.match(/ /g) || []).length, 0);
    const extra = justify && spaces ? Math.max(0, (available - line.width) / spaces) : 0;
    const baseline = topY + line.ascent;
    const positioned = line.pieces.map(piece => {
      const origin = x, renderedWidth = measure(piece) + (piece.text.match(/ /g) || []).length * extra;
      x += renderedWidth; return { piece, x: origin, width: renderedWidth };
    });
    for (const segment of positioned) if (segment.piece.background) {
      if (segment.piece.background === 'highlight') pdf.setFillColor(255, 236, 140); else pdf.setFillColor(226, 232, 240);
      const size = segment.piece.size * 0.352778;
      pdf.rect(segment.x, baseline - size * 0.85, segment.width, size * 1.2, 'F');
    }
    if (sourceLayout) pdf.setTextColor(0, 0, 0); else pdf.setTextColor(32, 38, 46);
    for (const segment of positioned) {
      font(segment.piece); let cursor = segment.x;
      if (!extra) pdf.text(segment.piece.text, cursor, baseline);
      else for (const part of segment.piece.text.split(/( +)/u).filter(Boolean)) {
        pdf.text(part, cursor, baseline); cursor += pdf.getTextWidth(part) + (part.match(/ /g) || []).length * extra;
      }
      if (segment.piece.underline) { pdf.setDrawColor(0, 0, 0); pdf.setLineWidth(Math.max(0.15, segment.piece.size * 0.015)); pdf.line(segment.x, baseline + 0.6, segment.x + segment.width, baseline + 0.6); }
    }
  }
  type Block = { after: number; heading: boolean; bullet: boolean; lines: Line[]; gap: number; source?: MinuteParagraph };
  const blocks: Block[] = [];
  let offset = 0, sectionNumber = 0, pendingGap = 0;
  for (const raw of data.text.split('\n')) {
    const paragraph = raw.trimEnd(), text = paragraph.trim(), start = offset;
    offset += raw.length + 1;
    if (sourceLayout || plain) {
      const source = data.paragraphs?.find(p => p.start === start) ?? { start, end: start + raw.length, align: 'left' as const, indent: 0, firstLine: 0, before: 0, after: plain ? 0 : 8, line: 1.08 };
      blocks.push({ after: start + raw.length, heading: false, bullet: false, lines: layout(minuteRuns(data, start, start + raw.length), width - source.indent * 0.352778, source.firstLine * 0.352778, source.line), gap: 0, source });
      continue;
    }
    if (!text) { pendingGap = 2; continue; }
    const heading = isHeading(text), bullet = !heading && /^(?:[-•]|\d{1,2}[.-])\s/.test(text);
    let runs: Piece[];
    if (heading) {
      sectionNumber++;
      const numeric = /^(\d{1,2})[.)]/.exec(text); if (numeric) sectionNumber = Number(numeric[1]);
      runs = minuteRuns(data, start + paragraph.length - paragraph.trimStart().length, start + paragraph.length, { bold: true });
      if (isNamedHeading(text) && context.kind !== 'promise-contract') runs.unshift({ text: `${sectionNumber}. `, bold: true, size: 11.5 });
    } else runs = minuteRuns(data, start, start + paragraph.length);
    blocks.push({ after: start + raw.length, heading, bullet, lines: layout(runs, width - (heading ? 5 : bullet ? 3 : 0)), gap: pendingGap }); pendingGap = 0;
  }

  function watermark() {
    if (!data.watermark?.enabled) return;
    const mark = data.watermark, h = mark.width * image.height / image.width;
    pdf.saveGraphicsState();
    pdf.setGState(new GState({ opacity: mark.opacity }));
    pdf.addImage(logo, 'PNG', (210 - mark.width) / 2, (297 - h) / 2, mark.width, h);
    pdf.restoreGraphicsState();
  }
  watermark();
  let y = top;
  function newPage() { pdf.addPage(); watermark(); y = top; }
  function ensureSpace(height: number) { if (y + height > bottom && y > top) newPage(); }
  if (!plain) {
    pdf.setFont(bodyFamily, 'bold'); pdf.setFontSize(sourceLayout ? 11 : 17); pdf.setTextColor(0, 0, 0);
    const title: string[] = pdf.splitTextToSize(data.title, width - 6);
    for (const line of title) { pdf.text(line, sourceLayout ? left : 105, y, { align: sourceLayout ? 'left' : 'center' }); y += sourceLayout ? 4.2 : 7.2; }
    if (sourceLayout) y += 8 * 0.352778;
    else { y += 3; pdf.setDrawColor(175, 25, 30); pdf.setLineWidth(0.5); pdf.line(96, y, 114, y); y += 10; }
  }

  const pendingImages = [...(data.images || [])].sort((a, b) => a.after - b.after);
  function drawImages(until: number) {
    while (pendingImages.length && pendingImages[0].after <= until) {
      const first = pendingImages.shift()!, columns = data.imageColumns || 1;
      const row = [first];
      while (row.length < columns && pendingImages[0]?.after === first.after) row.push(pendingImages.shift()!);
      const gap = 5, cellWidth = (width - gap * (columns - 1)) / columns;
      const cells = row.map(item => {
        const bytes = context.images?.[item.fileId];
        if (!bytes) throw Error('No se pudo recuperar una imagen del documento.');
        const dimensions = pdf.getImageProperties(bytes);
        pdf.setFont('MinuteSans', 'normal'); pdf.setFontSize(9);
        const caption: string[] = item.caption ? pdf.splitTextToSize(item.caption, cellWidth) : [];
        const captionHeight = caption.length * 4 + (caption.length ? 2 : 0);
        let w = item.width, h = item.height ?? w * dimensions.height / dimensions.width;
        if (item.keepRatio !== false) {
          const factor = Math.min(w / dimensions.width, h / dimensions.height);
          w = dimensions.width * factor; h = dimensions.height * factor;
        }
        if (w > cellWidth) { h *= cellWidth / w; w = cellWidth; }
        const maxHeight = bottom - top - captionHeight - 8;
        if (h > maxHeight) { w *= maxHeight / h; h = maxHeight; }
        return { item, bytes, caption, captionHeight, w, h };
      });
      const height = Math.max(...cells.map(cell => cell.h + cell.captionHeight));
      ensureSpace(height + 8); y += 3;
      cells.forEach((cell, index) => {
        const cellX = left + index * (cellWidth + gap);
        const x = cellX + (cell.item.align === 'left' ? 0 : cell.item.align === 'right' ? cellWidth - cell.w : (cellWidth - cell.w) / 2);
        pdf.addImage(cell.bytes, 'PNG', x, y, cell.w, cell.h);
        pdf.setFont('MinuteSans', 'normal'); pdf.setFontSize(9); pdf.setTextColor(85, 90, 96);
        cell.caption.forEach((line, i) => pdf.text(line, cellX, y + cell.h + 5 + i * 4));
      });
      y += height + 5;
    }
  }
  drawImages(0);
  for (let index = 0; index < blocks.length; index++) {
    const block = blocks[index];
    if (block.source) {
      const p = block.source, pt = 0.352778;
      const available = width - p.indent * pt;
      const blankHeight = block.lines.length ? 0 : 11 * pt * p.line;
      ensureSpace(p.before * pt + blankHeight + (block.lines[0]?.height || 0));
      y += p.before * pt;
      for (const [lineIndex, line] of block.lines.entries()) {
        ensureSpace(line.height);
        const indent = lineIndex === 0 ? p.firstLine * pt : 0;
        const room = available - indent;
        const shift = p.align === 'center' ? (room - line.width) / 2 : p.align === 'right' ? room - line.width : 0;
        draw(line, left + p.indent * pt + indent + shift, y, p.align === 'justify' && lineIndex < block.lines.length - 1, room);
        y += line.height;
      }
      y += blankHeight + p.after * pt;
      drawImages(block.after); continue;
    }
    if (block.heading) {
      const height = block.lines.reduce((sum, line) => sum + line.height, 0);
      let following = 0;
      for (let next = index + 1; next < blocks.length; next++) {
        const candidate = blocks[next];
        following += candidate.lines.slice(0, candidate.heading ? undefined : 2).reduce((sum, line) => sum + line.height, 0) + 5;
        if (!candidate.heading) break;
      }
      ensureSpace(5 + height + Math.min(following, bottom - top - height));
      if (y > top) y += 5;
      pdf.setDrawColor(178, 26, 32); pdf.setLineWidth(0.7); pdf.line(left, y, left, y + height - 1);
      for (const line of block.lines) { ensureSpace(line.height); draw(line, left + 3.5, y); y += line.height; }
      y += 3; drawImages(block.after); continue;
    }
    if (y > top) y += block.gap;
    let start = 0;
    while (start < block.lines.length) {
      let count = 0, height = 0;
      while (start + count < block.lines.length && y + height + block.lines[start + count].height <= bottom) height += block.lines[start + count++].height;
      const remaining = block.lines.length - start;
      if (!count || (count === 1 && remaining > 1 && y > top)) { newPage(); continue; }
      if (remaining - count === 1 && count > 2) count--;
      for (let line = 0; line < count; line++) {
        const current = block.lines[start + line], last = start + line === block.lines.length - 1;
        draw(current, left + (block.bullet ? 3 : 0), y, !last && !block.bullet, width - (block.bullet ? 3 : 0)); y += current.height;
      }
      start += count; if (start < block.lines.length) newPage();
    }
    y += 2.5; drawImages(block.after);
  }
  drawImages(Infinity);

  const pages = pdf.getNumberOfPages();
  for (let page = 1; !plain && page <= pages; page++) {
    pdf.setPage(page); pdf.addImage(logo, 'PNG', left, 15, logoWidth, logoHeight);
    pdf.setFont('MinuteSans', 'normal'); pdf.setFontSize(8.5); pdf.setTextColor(45, 48, 54);
    let headerY = 17;
    for (const line of runningTitle) { pdf.text(line, right, headerY, { align: 'right' }); headerY += 3.8; }
    headerY += 3; pdf.setFontSize(8); pdf.setTextColor(105, 109, 115);
    for (const line of header) { pdf.text(line, right, headerY, { align: 'right' }); headerY += 3.6; }
    pdf.setDrawColor(175, 25, 30); pdf.setLineWidth(0.3); pdf.line(left, headerEnd + 2, right, headerEnd + 2);
    pdf.setDrawColor(210, 213, 217); pdf.setLineWidth(0.2); pdf.line(left, bottom + 6, right, bottom + 6);
    pdf.setFontSize(8); pdf.setTextColor(105, 109, 115);
    if (data.footer) {
      const pageFooter: string[] = pdf.splitTextToSize(expandFooter(data.footer, String(page), String(pages)), width);
      pageFooter.forEach((line, i) => pdf.text(line, left, bottom + 11 + i * 3.5));
    }
    const pageReference: string[] = footerReference ? pdf.splitTextToSize(expandFooter(footerReference, String(page), String(pages)), 78) : [];
    const pagePagination: string[] = footerPagination ? pdf.splitTextToSize(expandFooter(footerPagination, String(page), String(pages)), 78) : [];
    pageReference.forEach((line, i) => pdf.text(line, left, lowerY + i * 3.5));
    pagePagination.forEach((line, i) => pdf.text(line, right, lowerY + i * 3.5, { align: 'right' }));
  }
  pdf.setProperties({ title: data.title, author: 'Inmobiliaria Alberto Alfaro', creator: 'Intranet · Documentos de la operación' });
  return new Uint8Array(pdf.output('arraybuffer'));
}
