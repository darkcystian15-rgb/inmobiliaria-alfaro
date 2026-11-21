import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { rowValue, rowHasAmount, totals, referenceSummary, liquidationFonts, liquidationPage, partyLabel, type Liquidation, type LiquidationData } from './liquidation';
const money = (n: number) => n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export async function liquidationFile(document: Liquidation, common: LiquidationData['common'], propertyCode: string, format: 'xlsx' | 'pdf' | 'docx', operation = 'venta') {
  if (document.grid) { const { liquidationGridFile } = await import('./liquidation-grid-export'); return liquidationGridFile(document.grid, format, { ...liquidationPage(document, propertyCode), title: document.title }); }
  if (format === 'docx') throw Error('Word está disponible para los modelos Excel originales.');
  const logo = await readFile(path.join(process.cwd(), 'public/branding/logo.png'));
  const page = liquidationPage(document, propertyCode);
  const title = document.title.trim() || `Liquidación del ${partyLabel(operation, document.side)}`;
  const summary = totals(document, common);
  const meta = [['Inmueble', propertyCode], ['Dirección', common.address], ['Fecha', document.date], ['Destinatario', document.person], ['Tipo de persona', { juridica: 'Persona jurídica', natural: 'Persona natural', '': '' }[document.personType]], ['DNI / RUC', document.identity], ['Representante', document.representative], ['Propietario / arrendador', common.owner], ['Comprador / arrendatario', common.counterparty], ['Precio / renta de referencia', `${common.currency} ${common.price || 'Sin registrar'}`], ['Tipo de cambio PEN por USD', `${common.exchange || 'Sin conversión'}${common.exchangeDate ? ` · ${common.exchangeDate}` : ''}`]];
  const taxUsed = document.sections.flatMap(s => s.rows).some(r => ['renta','alcabala'].includes(r.kind));
  if (taxUsed) meta.push(['Base de renta revisada (PEN)', common.taxBase], ['Base de alcabala revisada (PEN)', common.transferBase], ['Condición renta', common.taxStatus === 'exonerado' ? 'No paga' : common.taxStatus === 'afecto' ? 'Si paga' : 'Por verificar'], ['Sustento', common.taxNote], ['Costo de adquisición (PEN)', common.purchaseCost], ['Índice de corrección', common.correction], ['Tasa renta (%)', common.incomeRate], ['UIT (PEN)', common.uit], ['Deducción (número de UIT)', common.deduction], ['Tasa alcabala (%)', common.transferRate]);
  const summaryRows: string[][] = [];
  for (const currency of ['PEN','USD'] as const) { const t = summary[currency]; summaryRows.push([`Gastos ${currency}`, money(t.expenses)], [`Abonos / créditos ${currency}`, money(t.credits)], [`Gastos pendientes ${currency}`, money(t.pending)]); }
  if (common.exchange) { const rate = Number(common.exchange); summaryRows.push(['Gastos equivalentes PEN', money(summary.PEN.expenses + summary.USD.expenses * rate)], ['Gastos equivalentes USD', money(summary.USD.expenses + summary.PEN.expenses / rate)]); }
  const reference = referenceSummary(document,common,operation);
  if (reference) summaryRows.push([`${reference.label} (${reference.currency})`, money(reference.value)]);
  if (format === 'pdf') {
    const { jsPDF } = await import('jspdf'), { default: autoTable } = await import('jspdf-autotable'); const pdf = new jsPDF();
    const dimensions = pdf.getImageProperties(`data:image/png;base64,${logo.toString('base64')}`);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    const titleLines = pdf.splitTextToSize(title, 126);
    const top = Math.max(38, 15 + titleLines.length * 6);
    const margin = { top, bottom: 22, left: 14, right: 14 };
    autoTable(pdf, { startY: top, margin, body: meta.filter(([, v]) => v), theme: 'plain', styles: { fontSize: 9, overflow: 'linebreak' }, columnStyles: { 0: { cellWidth: 59, fontStyle: 'bold' } } });
    let y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;
    for (const section of document.sections) {
      autoTable(pdf, { startY: y, margin, head: [[{ content: section.title, colSpan: 5 }], ['Concepto','US$','S/','Tratamiento','Observación']], body: section.rows.map(r => [r.label, r.kind !== 'text' && r.currency === 'USD' ? rowHasAmount(r, common) ? money(rowValue(r, common)) : '' : '', r.kind !== 'text' && r.currency === 'PEN' ? rowHasAmount(r, common) ? money(rowValue(r, common)) : '' : '', r.kind === 'text' ? '' : `${r.effect === 'expense' ? 'Gasto' : r.effect === 'credit' ? 'Abono' : 'Informativo'}${r.paid ? ' · Pagado' : ''}`, `${r.kind === 'percent' ? `${r.rate}% de ${r.base}. ` : ''}${r.note}`]), headStyles: { fillColor: [153,27,27] }, styles: { fontSize: 11, overflow: 'linebreak', cellPadding: 3 },
        didParseCell: cell => {
          if (cell.section !== 'body') return;
          const row = section.rows[cell.row.index];
          const key = cell.column.index === 0 ? 'label' : cell.column.index === 1 ? 'USD' : cell.column.index === 2 ? 'PEN' : cell.column.index === 4 ? 'note' : undefined;
          const format = key ? row.formats?.[key] : undefined;
          if (!format) return;
          cell.cell.styles.font = format.font ?? 'helvetica';
          cell.cell.styles.fontStyle = format.bold && format.italic ? 'bolditalic' : format.bold ? 'bold' : format.italic ? 'italic' : 'normal';
          cell.cell.styles.fontSize = format.size ?? 11;
          if (format.background === 'highlight') cell.cell.styles.fillColor = [254,240,138];
          if (format.background === 'shade') cell.cell.styles.fillColor = [226,232,240];
        }
      });
      y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;
    }
    autoTable(pdf, { startY: y, margin, head: [['Resumen', 'Importe']], body: summaryRows, headStyles: { fillColor: [30,41,59] }, styles: { fontSize: 9 } });
    if (document.notes) autoTable(pdf, { startY: (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7, margin, body: [['Observaciones', document.notes]], theme: 'plain', styles: { fontSize: 9 } });
    for (let i = 1; i <= pdf.getNumberOfPages(); i++) {
      pdf.setPage(i);
      if (page.logo) pdf.addImage(new Uint8Array(logo), 'PNG', 14, 9, 40, Math.min(21, 40 * dimensions.height / dimensions.width));
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(13); pdf.setTextColor(153,27,27); pdf.text(titleLines, 63, 16);
      pdf.setDrawColor(153,27,27); pdf.line(14, top - 4, 196, top - 4);
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(100);
      pdf.line(14, 280, 196, 280);
      if (page.footer) pdf.text(pdf.splitTextToSize(page.footer, 155), 14, 286);
      if (page.numbers) pdf.text(`${i}/${pdf.getNumberOfPages()}`, 196, 286, { align: 'right' });
    }
    return Buffer.from(pdf.output('arraybuffer'));
  }
  const { default: ExcelJS } = await import('exceljs'); const workbook = new ExcelJS.Workbook(); workbook.creator = 'Inmobiliaria Alberto Alfaro';
  const sheet = workbook.addWorksheet('Liquidación', { pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  sheet.columns = [{ width: 43 }, { width: 18 }, { width: 18 }, { width: 23 }, { width: 48 }];
  if (page.logo) {
    const image = workbook.addImage({ buffer: logo as unknown as import('exceljs').Buffer, extension: 'png' }); sheet.addImage(image, { tl: { col: 0, row: 0 }, ext: { width: 165, height: 55 } });
  }
  sheet.getRow(1).height = 48; sheet.mergeCells('B1:E1'); sheet.getCell('B1').value = title; sheet.getCell('B1').font = { bold: true, size: 17, color: { argb: 'FF991B1B' } };
  for (const [label,value] of meta.filter(([,v]) => v)) { const row = sheet.addRow([label,value]); sheet.mergeCells(row.number, 2, row.number, 5); row.getCell(1).font = { bold: true }; }
  sheet.addRow([]);
  const expenseRefs: Record<string,string[]> = { PEN: [], USD: [] }, creditRefs: Record<string,string[]> = { PEN: [], USD: [] }, pendingRefs: Record<string,string[]> = { PEN: [], USD: [] };
  for (const section of document.sections) { const heading = sheet.addRow([section.title]); sheet.mergeCells(heading.number,1,heading.number,5); heading.font = { bold: true, color: { argb: 'FFFFFFFF' } }; heading.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF991B1B' } };
    sheet.addRow(['Concepto','US$','S/','Tratamiento','Observación']).font = { bold: true };
    for (const r of section.rows) {
      const value = rowValue(r, common);
      const amount = rowHasAmount(r, common)
        ? r.kind === 'percent' ? { formula: `ROUND(${r.base}*${r.rate}/100,2)`, result: value } : value
        : null;
      const treatment = { expense: 'Gasto', credit: 'Abono', none: 'Informativo' }[r.effect];
      const row = sheet.addRow([r.label, r.currency === 'USD' ? amount : null, r.currency === 'PEN' ? amount : null,
        r.kind === 'text' ? '' : treatment + (r.paid ? ' · Pagado' : ''), r.note]);
      for (const [column, key] of [[1, 'label'], [2, 'USD'], [3, 'PEN'], [5, 'note']] as const) {
        const format = r.formats?.[key]; if (!format) continue;
        const cell = row.getCell(column); cell.font = { name: format.font ? liquidationFonts[format.font].excel : undefined, italic: format.italic, bold: format.bold ?? false, size: format.size ?? 11 };
        if (format.background === 'highlight' || format.background === 'shade') cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: format.background === 'highlight' ? 'FFFEF08A' : 'FFE2E8F0' } };
      }
      row.getCell(2).numFmt = '#,##0.00'; row.getCell(3).numFmt = '#,##0.00'; const ref = `${r.currency === 'USD' ? 'B' : 'C'}${row.number}`; if (r.kind !== 'text' && r.effect === 'expense') { expenseRefs[r.currency].push(ref); if (!r.paid) pendingRefs[r.currency].push(ref); } if (r.kind !== 'text' && r.effect === 'credit') creditRefs[r.currency].push(ref); }
    sheet.addRow([]);
  }
  for (const currency of ['PEN','USD'] as const) { for (const [label, refs, value] of [[`Gastos ${currency}`, expenseRefs[currency], summary[currency].expenses], [`Abonos / créditos ${currency}`, creditRefs[currency], summary[currency].credits], [`Gastos pendientes ${currency}`, pendingRefs[currency], summary[currency].pending]] as [string,string[],number][]) { const r = sheet.addRow([label, currency, { formula: refs.length ? `ROUND(SUM(${refs.join(',')}),2)` : '0', result: value }]); r.font = { bold: true }; r.getCell(3).numFmt = '#,##0.00'; } }
  for (const row of summaryRows.slice(6)) sheet.addRow([row[0], '', Number(row[1].replaceAll(',',''))]).getCell(3).numFmt = '#,##0.00';
  if (document.notes) { const row = sheet.addRow(['Observaciones', document.notes]); sheet.mergeCells(row.number,2,row.number,5); }
  sheet.eachRow(row => { row.alignment = { vertical: 'top', wrapText: true }; if (row.number > 1) { let length = 0; row.eachCell(c => { length = Math.max(length, String(c.text).length); }); row.height = Math.max(23, Math.ceil(length / 45) * 15); } });
  sheet.headerFooter.oddHeader = '&CInmobiliaria Alberto Alfaro'; sheet.headerFooter.oddFooter = '&L' + page.footer.replaceAll('&', '&&') + (page.numbers ? '&RPágina &P de &N' : '');
  sheet.views = [{ state: 'frozen', ySplit: 1 }]; sheet.pageSetup.printArea = `A1:E${sheet.rowCount}`;
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
