import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { gridEvaluator, gridDisplay, gridRowCells, columnName, cellPosition, type LiquidationGrid } from './liquidation-grid';

export type LiquidationGridPage = { title?: string; header?: string; footer?: string; logo?: boolean; numbers?: boolean };
const xml = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

// Reserve four rows for the Excel letterhead, moving references with their cells.
// The source grid and its calculation logic remain unchanged.
function withExcelHeaderRows(grid: LiquidationGrid): LiquidationGrid {
  const shift = (formula: string) => formula.replace(/(\$?[A-Z]+\$?)(\d+)/g, (_, col, row) => col + (Number(row) + 4));
  return { ...grid, rows: grid.rows + 4, cells: Object.fromEntries(Object.entries(grid.cells).map(([address, cell]) => {
    const position = cellPosition(address);
    return [columnName(position.col) + (position.row + 4), { ...cell, ...(cell.f ? { f: shift(cell.f) } : {}), ...(cell.originalFormula ? { originalFormula: shift(cell.originalFormula) } : {}) }];
  })) };
}

export async function liquidationGridFile(source: LiquidationGrid, format: 'xlsx' | 'pdf' | 'docx', settings: LiquidationGridPage = {}) {
  const page = { title: 'Liquidación', header: 'Inmobiliaria Alberto Alfaro', footer: 'Inmobiliaria Alberto Alfaro', logo: true, numbers: true, ...settings };
  const logo = page.logo ? await readFile(path.join(process.cwd(), 'public/branding/logo.png')) : null;
  const logoRatio = logo ? logo.readUInt32BE(20) / logo.readUInt32BE(16) : 1;

  if (format === 'xlsx') {
    const grid = withExcelHeaderRows(source), evaluate = gridEvaluator(grid);
    const { default: ExcelJS } = await import('exceljs');
    const book = new ExcelJS.Workbook();
    book.creator = 'Inmobiliaria Alberto Alfaro';
    book.calcProperties.fullCalcOnLoad = true;
    const sheet = book.addWorksheet('Liquidación', { pageSetup: {
      paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0,
      margins: { left: 0.35, right: 0.35, top: 0.35, bottom: 0.55, header: 0.15, footer: 0.2 },
    } });
    grid.widths.forEach((width, i) => { sheet.getColumn(i + 1).width = width / 7; });
    for (const [address, cellData] of Object.entries(grid.cells)) {
      const cell = sheet.getCell(address), value = evaluate(address), style = grid.styles[cellData.s ?? -1] || {};
      const error = typeof value === 'string' && ['#REF!', '#VALUE!', '#DIV/0!', '#NUM!', '#N/A', '#NAME?', '#NULL!'].includes(value) ? value : '#VALUE!';
      cell.value = cellData.f ? { formula: cellData.f, result: value === 'XXXXX' ? '' : typeof value === 'number' ? value : value.startsWith('#') ? { error: error as import('exceljs').CellErrorValue['error'] } : value } : cellData.v;
      cell.font = { name: style.font === 'times' ? 'Times New Roman' : style.font === 'courier' ? 'Courier New' : 'Calibri', size: style.size || 11, bold: style.bold, italic: style.italic, ...(style.color ? { color: { argb: 'FF' + style.color.slice(1) } } : {}) };
      cell.alignment = { wrapText: !gridRowCells(grid, Number(cell.row)).some(item => item.address === address && item.span > 1), vertical: 'middle', horizontal: style.align === 'center' ? 'center' : style.align === 'right' ? 'right' : 'left' };
      if (style.background) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + style.background.slice(1) } };
      if (style.border) cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      if (style.numFmt) cell.numFmt = style.numFmt;
      const lines = Math.ceil(gridDisplay(grid, address, value).length / Math.max(8, (grid.widths[Number(cell.col) - 1] - 12) / ((style.size || 11) * 0.65)));
      sheet.getRow(Number(cell.row)).height = Math.max(sheet.getRow(Number(cell.row)).height || 16, Math.min(200, Math.max(1, lines) * (style.size || 11) * 1.4));
    }
    if (logo) {
      const image = book.addImage({ buffer: logo as unknown as import('exceljs').Buffer, extension: 'png' });
      sheet.addImage(image, { tl: { col: grid.startCol - 1, row: 0 }, ext: { width: 150, height: Math.min(54, 150 * logoRatio) } });
    }
    const titleColumn = Math.min(grid.startCol + (logo ? 2 : 0), grid.cols);
    sheet.mergeCells(1, titleColumn, 2, grid.cols);
    const titleCell = sheet.getCell(1, titleColumn);
    titleCell.value = page.title;
    titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF991B1B' } };
    titleCell.alignment = { vertical: 'middle', wrapText: true };
    if (titleColumn < grid.cols) sheet.mergeCells(3, titleColumn, 3, grid.cols);
    sheet.getCell(3, titleColumn).value = page.header;
    sheet.getCell(3, titleColumn).font = { name: 'Calibri', size: 11, color: { argb: 'FF475569' } };
    sheet.getCell(3, titleColumn).alignment = { wrapText: true };
    sheet.getRow(1).height = 24; sheet.getRow(2).height = 24; sheet.getRow(3).height = 22; sheet.getRow(4).height = 10;
    sheet.pageSetup.printTitlesRow = '1:4';
    sheet.pageSetup.printArea = `${columnName(grid.startCol)}1:${columnName(grid.cols)}${grid.rows}`;
    // Escape Excel's header/footer control marker in user text.
    sheet.headerFooter.oddFooter = `&L${page.footer.replaceAll('&', '&&')}${page.numbers ? '&RPágina &P de &N' : ''}`;
    return Buffer.from(await book.xlsx.writeBuffer());
  }

  const grid = source, evaluate = gridEvaluator(grid);
  if (format === 'docx') {
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip(), tableWidth = 15400;
    const total = grid.widths.slice(grid.startCol - 1).reduce((a, b) => a + b, 0);
    const width = (col: number) => Math.round(grid.widths[col - 1] / total * tableWidth);
    const runs = (text: string) => text.split('\n').map((line, i) => (i ? '<w:br/>' : '') + `<w:t xml:space="preserve">${xml(line)}</w:t>`).join('');
    const rows = Array.from({ length: grid.rows }, (_, ri) => '<w:tr>' + gridRowCells(grid, ri + 1).map(({ col, address, span }) => {
      const cell = grid.cells[address], style = grid.styles[cell?.s ?? -1] || {}, text = cell ? gridDisplay(grid, address, evaluate(address)) : '';
      const borders = style.border ? '<w:tcBorders>' + ['top', 'left', 'bottom', 'right'].map(k => `<w:${k} w:val="single" w:sz="4" w:color="64748B"/>`).join('') + '</w:tcBorders>' : '';
      return `<w:tc><w:tcPr><w:tcW w:w="${Array.from({ length: span }, (_, i) => width(col + i)).reduce((a, b) => a + b, 0)}" w:type="dxa"/>${span > 1 ? `<w:gridSpan w:val="${span}"/>` : ''}${style.background ? `<w:shd w:fill="${style.background.slice(1)}"/>` : ''}${borders}</w:tcPr><w:p><w:pPr><w:jc w:val="${style.align === 'center' ? 'center' : style.align === 'right' ? 'right' : 'left'}"/><w:spacing w:after="40"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="${(style.size || 11) * 2}"/>${style.bold ? '<w:b/>' : ''}${style.italic ? '<w:i/>' : ''}${style.color ? `<w:color w:val="${style.color.slice(1)}"/>` : ''}</w:rPr>${runs(text)}</w:r></w:p></w:tc>`;
    }).join('') + '</w:tr>').join('');
    const namespaces = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
    const types = 'http://schemas.openxmlformats.org/package/2006/content-types', relationships = 'http://schemas.openxmlformats.org/package/2006/relationships';
    const officeRelationships = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/';
    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="${types}"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${logo ? '<Default Extension="png" ContentType="image/png"/>' : ''}<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>`);
    zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="${relationships}"><Relationship Id="rId1" Type="${officeRelationships}officeDocument" Target="word/document.xml"/></Relationships>`);
    zip.file('word/_rels/document.xml.rels', `<Relationships xmlns="${relationships}"><Relationship Id="rIdHeader" Type="${officeRelationships}header" Target="header1.xml"/><Relationship Id="rIdFooter" Type="${officeRelationships}footer" Target="footer1.xml"/></Relationships>`);
    let drawing = '';
    if (logo) {
      const cx = 1524000, cy = Math.round(Math.min(54, 160 * logoRatio) * 9525);
      zip.file('word/media/logo.png', logo);
      zip.file('word/_rels/header1.xml.rels', `<Relationships xmlns="${relationships}"><Relationship Id="rIdLogo" Type="${officeRelationships}image" Target="media/logo.png"/></Relationships>`);
      drawing = `<w:r><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="1" name="Logo" descr="Inmobiliaria Alberto Alfaro"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="logo.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdLogo"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
    }
    const headerParagraph = `<w:p><w:pPr><w:spacing w:after="80"/></w:pPr><w:r><w:rPr><w:sz w:val="22"/><w:color w:val="475569"/></w:rPr>${runs(page.header)}</w:r></w:p><w:p><w:r><w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="991B1B"/></w:rPr>${runs(page.title)}</w:r></w:p>`;
    zip.file('word/header1.xml', `<w:hdr ${namespaces}><w:tbl><w:tblPr><w:tblW w:w="15400" w:type="dxa"/><w:tblBorders><w:bottom w:val="single" w:sz="8" w:color="991B1B"/></w:tblBorders></w:tblPr><w:tblGrid>${logo ? '<w:gridCol w:w="2700"/>' : ''}<w:gridCol w:w="${logo ? 12700 : 15400}"/></w:tblGrid><w:tr>${logo ? `<w:tc><w:tcPr><w:tcW w:w="2700" w:type="dxa"/></w:tcPr><w:p>${drawing}</w:p></w:tc>` : ''}<w:tc><w:tcPr><w:tcW w:w="${logo ? 12700 : 15400}" w:type="dxa"/></w:tcPr>${headerParagraph}</w:tc></w:tr></w:tbl><w:p/></w:hdr>`);
    zip.file('word/footer1.xml', `<w:ftr ${namespaces}><w:p><w:pPr><w:pBdr><w:top w:val="single" w:sz="4" w:color="94A3B8"/></w:pBdr></w:pPr><w:r><w:rPr><w:sz w:val="18"/></w:rPr>${runs(page.footer)}</w:r></w:p>${page.numbers ? '<w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:t xml:space="preserve">Página </w:t></w:r><w:fldSimple w:instr="PAGE"/><w:r><w:t xml:space="preserve"> de </w:t></w:r><w:fldSimple w:instr="NUMPAGES"/></w:p>' : ''}</w:ftr>`);
    zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8"?><w:document ${namespaces}><w:body><w:tbl><w:tblPr><w:tblW w:w="${tableWidth}" w:type="dxa"/><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${Array.from({ length: grid.cols - grid.startCol + 1 }, (_, i) => `<w:gridCol w:w="${width(i + grid.startCol)}"/>`).join('')}</w:tblGrid>${rows}</w:tbl><w:p/><w:sectPr><w:headerReference w:type="default" r:id="rIdHeader"/><w:footerReference w:type="default" r:id="rIdFooter"/><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="1700" w:right="700" w:bottom="1000" w:left="700" w:header="300" w:footer="300"/></w:sectPr></w:body></w:document>`);
    return zip.generateAsync({ type: 'nodebuffer' });
  }

  const { jsPDF } = await import('jspdf'), { default: autoTable } = await import('jspdf-autotable');
  const pdf = new jsPDF({ orientation: 'landscape', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth(), pageHeight = pdf.internal.pageSize.getHeight();
  const headerX = logo ? 62 : 10, headerWidth = pageWidth - headerX - 10;
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10);
  const headerLines: string[] = page.header ? pdf.splitTextToSize(page.header, headerWidth) : [];
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(14);
  const titleLines: string[] = page.title ? pdf.splitTextToSize(page.title, headerWidth) : [];
  const titleY = 12 + headerLines.length * 4.5;
  const tableTop = Math.max(35, titleY + titleLines.length * 5.5 + 7);
  const cols = Array.from({ length: grid.cols - grid.startCol + 1 }, (_, i) => i + grid.startCol);
  const total = cols.reduce((n, col) => n + grid.widths[col - 1], 0);
  autoTable(pdf, {
    startY: tableTop, margin: { left: 10, right: 10, top: tableTop, bottom: 22 }, theme: 'plain',
    body: Array.from({ length: grid.rows }, (_, ri) => gridRowCells(grid, ri + 1).map(({ address, span }) => {
      const cell = grid.cells[address]; return { content: cell ? gridDisplay(grid, address, evaluate(address)) : '', colSpan: span };
    })),
    styles: { fontSize: 11, cellPadding: 1.5, overflow: 'linebreak', valign: 'middle' },
    columnStyles: Object.fromEntries(cols.map((col, i) => [i, { cellWidth: (pageWidth - 20) * grid.widths[col - 1] / total }])),
    didParseCell: ({ cell, row, column }) => {
      const address = columnName(cols[column.index]) + (row.index + 1), style = grid.styles[grid.cells[address]?.s ?? -1];
      if (!style) return;
      cell.styles.font = style.font || 'helvetica'; cell.styles.fontSize = style.size || 11;
      cell.styles.fontStyle = style.bold && style.italic ? 'bolditalic' : style.bold ? 'bold' : style.italic ? 'italic' : 'normal';
      cell.styles.halign = style.align === 'center' ? 'center' : style.align === 'right' ? 'right' : 'left';
      if (style.background) cell.styles.fillColor = style.background;
      if (style.color) cell.styles.textColor = style.color;
      if (style.border) { cell.styles.lineWidth = 0.15; cell.styles.lineColor = '#64748b'; }
    },
  });
  for (let index = 1; index <= pdf.getNumberOfPages(); index++) {
    pdf.setPage(index);
    if (logo) pdf.addImage(new Uint8Array(logo), 'PNG', 10, 8, 42, Math.min(20, 42 * logoRatio));
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10); pdf.setTextColor('#475569');
    if (headerLines.length) pdf.text(headerLines, headerX, 12);
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(14); pdf.setTextColor('#991b1b');
    if (titleLines.length) pdf.text(titleLines, headerX, titleY);
    pdf.setDrawColor('#991b1b'); pdf.line(10, tableTop - 4, pageWidth - 10, tableTop - 4);
    pdf.setDrawColor('#94a3b8'); pdf.line(10, pageHeight - 18, pageWidth - 10, pageHeight - 18);
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor('#64748b');
    if (page.footer) pdf.text(pdf.splitTextToSize(page.footer, pageWidth - 55), 10, pageHeight - 12);
    if (page.numbers) pdf.text(`${index}/${pdf.getNumberOfPages()}`, pageWidth - 10, pageHeight - 12, { align: 'right' });
  }
  return Buffer.from(pdf.output('arraybuffer'));
}
