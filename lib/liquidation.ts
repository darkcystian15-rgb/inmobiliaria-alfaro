import { gridInput, type LiquidationGrid } from './liquidation-grid';
export type Currency = 'PEN' | 'USD';
export type LiquidationCell = 'label' | 'USD' | 'PEN' | 'note';
export const liquidationFonts = { helvetica: { label: "Sans serif", css: "Arial, sans-serif", excel: "Arial" }, times: { label: "Serif", css: "Times New Roman, serif", excel: "Times New Roman" }, courier: { label: "Monoespaciada", css: "Courier New, monospace", excel: "Courier New" } } as const;
export type LiquidationFont = keyof typeof liquidationFonts;
export type LiquidationFormat = { font?: LiquidationFont; italic?: boolean; bold?: boolean; size?: number; background?: 'none' | 'highlight' | 'shade' };
export const liquidationCellStyle = (format?: LiquidationFormat) => ({ fontFamily: format?.font ? liquidationFonts[format.font].css : undefined, fontStyle: format?.italic ? "italic" : undefined, fontWeight: format?.bold ? 700 : 400, fontSize: `${format?.size ?? 11}pt`, backgroundColor: format?.background === 'highlight' ? '#fef08a' : format?.background === 'shade' ? '#e2e8f0' : undefined });
export type LiquidationRow = { id: string; label: string; kind: 'amount' | 'percent' | 'text' | 'renta' | 'alcabala'; currency: Currency; amount: string; base: string; rate: string; effect: 'expense' | 'credit' | 'none'; paid: boolean; note: string; formats?: Partial<Record<LiquidationCell, LiquidationFormat>> };
export type LiquidationSection = { id: string; title: string; rows: LiquidationRow[] };
export type Liquidation = { grid?: LiquidationGrid; id: string; side: 'owner' | 'counterparty'; title: string; date: string; person: string; identity: string; personType: '' | 'natural' | 'juridica'; representative: string; notes: string; page?: { header?: string; footer: string; logo: boolean; numbers: boolean }; sections: LiquidationSection[] };
export type LiquidationData = { common: { address: string; owner: string; counterparty: string; price: string; currency: Currency; exchange: string; exchangeDate: string; taxStatus: 'pendiente' | 'afecto' | 'exonerado'; taxNote: string; taxBase: string; transferBase: string; purchaseCost: string; correction: string; incomeRate: string; uit: string; deduction: string; transferRate: string }; documents: Liquidation[] };
export const roundMoney = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const numeric = (s: string) => s.trim() === '' ? 0 : Number(s);
export function emptyLiquidations(): LiquidationData { return { common: { address: '', owner: '', counterparty: '', price: '', currency: 'USD', exchange: '', exchangeDate: '', taxStatus: 'pendiente', taxNote: '', taxBase: '', transferBase: '', purchaseCost: '', correction: '', incomeRate: '', uit: '', deduction: '', transferRate: '' }, documents: [] }; }
export const partyLabel = (operation: string, side: string) => operation === 'alquiler' ? side === 'owner' ? 'arrendador' : 'arrendatario' : side === 'owner' ? 'vendedor' : 'comprador';
export const liquidationCategory = (operation: string, side: string) => `${operation === 'alquiler' ? side === 'owner' ? 'ARRENDADOR' : 'ARRENDATARIO' : side === 'owner' ? 'VENDEDOR' : 'COMPRADOR'}_LIQUIDACION`;
export function newRow(id: string, label = '', kind: LiquidationRow['kind'] = 'amount', currency: Currency = 'PEN'): LiquidationRow { return { id, label, kind, currency, amount: '', base: '', rate: '', effect: kind === 'text' ? 'none' : 'expense', paid: false, note: '' }; }
export function newLiquidation(id: string, operation: string, side: Liquidation['side'], common: LiquidationData['common'], personType: Liquidation['personType'] = ''): Liquidation {
  const owner = side === 'owner', rental = operation === 'alquiler';
  const labels: [string, LiquidationRow['kind'], Currency][] = rental ? [['Renta del periodo', 'amount', common.currency], ['Garantía', 'amount', common.currency], ['Adelanto', 'amount', common.currency], ['Comisión inmobiliaria', 'percent', common.currency]] : owner ? [['Impuesto a la renta', 'renta', 'PEN'], ['Autovalúo', 'amount', 'PEN'], ['Arbitrios', 'amount', 'PEN'], ['Comisión inmobiliaria', 'percent', common.currency]] : [['Alcabala', 'alcabala', 'PEN'], ['Gastos notariales', 'amount', 'PEN'], ['Gastos registrales', 'amount', 'PEN']];
  return { id, side, title: `Liquidación del ${partyLabel(operation, side)}`, date: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' }), person: owner ? common.owner : common.counterparty, identity: '', personType, representative: '', notes: '', sections: [{ id: `${id}-gastos`, title: rental ? 'Conceptos del alquiler' : 'Gastos de la operación', rows: labels.map(([label, , currency], i) => newRow(`${id}-${i}`, label, 'amount', currency)) }] };
}
export const liquidationPage = (document: Liquidation, code: string) => ({
  header: 'Inmobiliaria Alberto Alfaro', footer: `Inmobiliaria Alberto Alfaro · ${code}`, logo: true, numbers: true, ...document.page,
});

export function rowHasAmount(row: LiquidationRow, common: LiquidationData['common']) {
  switch (row.kind) {
    case 'text': return false;
    case 'amount': return row.amount !== '';
    case 'percent': return row.base !== '' && row.rate !== '';
    case 'renta': return common.taxStatus === 'exonerado' ||
      (common.taxStatus === 'afecto' && [common.taxBase, common.purchaseCost, common.correction, common.incomeRate].every(Boolean));
    case 'alcabala': return [common.transferBase, common.uit, common.deduction, common.transferRate].every(Boolean);
  }
}
export function rowValue(row: LiquidationRow, common: LiquidationData['common']): number {
  if (row.kind === 'text') return 0;
  if (row.kind === 'renta') return common.taxStatus === 'afecto' ? roundMoney(Math.max(0, numeric(common.taxBase) - numeric(common.purchaseCost) * numeric(common.correction)) * numeric(common.incomeRate) / 100) : 0;
  if (row.kind === 'alcabala') return roundMoney(Math.max(0, numeric(common.transferBase) - numeric(common.uit) * numeric(common.deduction)) * numeric(common.transferRate) / 100);
  return roundMoney(row.kind === 'percent' ? numeric(row.base) * numeric(row.rate) / 100 : numeric(row.amount));
}
export function totals(document: Pick<Liquidation, 'sections'>, common: LiquidationData['common']) {
  const result = { PEN: { expenses: 0, credits: 0, pending: 0 }, USD: { expenses: 0, credits: 0, pending: 0 } };
  for (const row of document.sections.flatMap(s => s.rows)) { if (row.effect === 'none' || !rowHasAmount(row, common)) continue; const value = rowValue(row, common), target = result[row.currency]; if (row.effect === 'expense') { target.expenses += value; if (!row.paid) target.pending += value; } else target.credits += value; }
  for (const t of Object.values(result)) { t.expenses = roundMoney(t.expenses); t.credits = roundMoney(t.credits); t.pending = roundMoney(t.pending); } return result;
}
export function generationMissing(document: Liquidation, common: LiquidationData['common']) {
  const missing: string[] = [];
  if (document.grid) return document.title.trim() ? [] : ['Título del documento'];
  if (!document.title.trim()) missing.push('Título del documento'); if (!document.person.trim()) missing.push('Nombre o razón social del destinatario'); if (!document.personType) missing.push('Tipo de persona del destinatario'); if (!common.address.trim()) missing.push('Dirección del inmueble');
  if (!document.sections.some(s => s.rows.length)) missing.push('Al menos un concepto');
  for (const section of document.sections) { if (!section.title.trim()) missing.push('Nombre de sección'); for (const row of section.rows) {
    if (!row.label.trim()) missing.push('Nombre de concepto'); if (row.kind === 'amount' && row.amount === '') missing.push(`Importe: ${row.label}`);
    if (row.kind === 'percent' && (row.base === '' || row.rate === '')) missing.push(`Base y porcentaje: ${row.label}`);
    if (row.kind === 'renta') { if (common.taxStatus === 'pendiente') missing.push('Condición del impuesto a la renta'); if (!common.taxNote.trim()) missing.push('Sustento del impuesto a la renta'); if (common.taxStatus === 'afecto' && [common.taxBase, common.purchaseCost, common.correction, common.incomeRate].some(v => v === '')) missing.push('Base, costo de adquisición, índice y tasa de renta'); }
    if (row.kind === 'alcabala' && [common.transferBase, common.uit, common.deduction, common.transferRate].some(v => v === '')) missing.push('Base, UIT, deducción y tasa de alcabala');
  } } return [...new Set(missing)];
}
export function liquidationInput(value: unknown): LiquidationData {
  if (!value || typeof value !== 'object') throw Error('Liquidación no válida.');
  const input = value as LiquidationData, result = emptyLiquidations();
  const str = (v: unknown, max = 500) => { if (typeof v !== 'string' || v.length > max) throw Error(`Texto no válido (máximo ${max} caracteres).`); return v; };
  const choice = <T extends string>(v: unknown, allowed: T[]): T => { if (!allowed.includes(v as T)) throw Error('Opción de liquidación no válida.'); return v as T; };
  const numberString = (v: unknown) => { const s = str(v, 24); if (s !== '' && (!/^\d+(\.\d{0,6})?$/.test(s) || !Number.isFinite(Number(s)) || Number(s) > 1e12)) throw Error('Usa importes positivos con punto decimal, sin separadores de miles.'); return s; };
  const formats = (value: unknown): LiquidationRow['formats'] => {
    if (value === undefined) return undefined;
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Formato de celda no válido.');
    const result: NonNullable<LiquidationRow['formats']> = {};
    for (const [key, raw] of Object.entries(value)) {
      if (!['label', 'USD', 'PEN', 'note'].includes(key) || !raw || typeof raw !== 'object' || Array.isArray(raw)) throw Error('Formato de celda no válido.');
      const format = raw as LiquidationFormat;
      if (Object.keys(format).some(k => !['bold', 'size', 'background', 'font', 'italic'].includes(k))) throw Error('Formato de celda no válido.');
      const clean: LiquidationFormat = {};
      if (format.font !== undefined) clean.font = choice(format.font, ['helvetica', 'times', 'courier'] as LiquidationFont[]);
      if (format.italic !== undefined) {
        if (typeof format.italic !== 'boolean') throw Error('Cursiva no válida.');
        clean.italic = format.italic;
      }
      if (format.bold !== undefined) { if (typeof format.bold !== 'boolean') throw Error('Negrita no válida.'); clean.bold = format.bold; }
      if (format.size !== undefined) { if (!Number.isInteger(format.size) || format.size < 8 || format.size > 24) throw Error('Usa un tamaño entre 8 y 24.'); clean.size = format.size; }
      if (format.background !== undefined) clean.background = choice<'none' | 'highlight' | 'shade'>(format.background, ['none', 'highlight', 'shade']);
      result[key as LiquidationCell] = clean;
    }
    return result;
  };
  if (!input.common || !Array.isArray(input.documents) || input.documents.length > 12) throw Error('Se admiten hasta 12 documentos por inmueble.');
  for (const key of Object.keys(result.common) as (keyof typeof result.common)[]) { const v = input.common[key]; if (key === 'currency') result.common.currency = choice(v, ['PEN', 'USD']); else if (key === 'taxStatus') result.common.taxStatus = choice(v, ['pendiente', 'afecto', 'exonerado']); else result.common[key] = ['price','exchange','taxBase','transferBase','purchaseCost','correction','incomeRate','uit','deduction','transferRate'].includes(key) ? numberString(v) : str(v, key === 'taxNote' ? 2000 : 500); }
  if (result.common.exchange !== '' && numeric(result.common.exchange) <= 0) throw Error('El tipo de cambio debe ser mayor que cero.');
  if (result.common.correction !== '' && numeric(result.common.correction) <= 0) throw Error('El índice de corrección debe ser mayor que cero.');
  const ids = new Set<string>(); const id = (v: unknown) => { const s = str(v, 80); if (!/^[a-zA-Z0-9_-]+$/.test(s) || ids.has(s)) throw Error('Identificador duplicado o no válido.'); ids.add(s); return s; };
  const page = (value: Liquidation['page']) => {
    if (!value || typeof value.logo !== 'boolean' || typeof value.numbers !== 'boolean') throw Error('Encabezado o pie no válido.');
    return { ...(value.header === undefined ? {} : { header: str(value.header, 150) }), footer: str(value.footer, 100), logo: value.logo, numbers: value.numbers };
  };
  let rowCount = 0;
  result.documents = input.documents.map(d => ({ id: id(d.id), side: choice(d.side, ['owner','counterparty']), title: str(d.title, 150), ...(d.grid === undefined ? {} : { grid: gridInput(d.grid) }), date: str(d.date, 10), person: str(d.person), identity: str(d.identity, 100), personType: choice(d.personType, ['', 'natural','juridica']), representative: str(d.representative), notes: str(d.notes, 2000), ...(d.page === undefined ? {} : { page: page(d.page) }), sections: (() => { if (!Array.isArray(d.sections) || d.sections.length > 15) throw Error('Máximo 15 secciones por documento.'); return d.sections.map(s => ({ id: id(s.id), title: str(s.title, 150), rows: (() => { if (!Array.isArray(s.rows) || (rowCount += s.rows.length) > 150) throw Error('Máximo 150 conceptos por inmueble.'); return s.rows.map(r => ({ id: id(r.id), label: str(r.label, 200), kind: choice(r.kind, ['amount','percent','text','renta','alcabala']), currency: choice(r.currency, ['PEN','USD']), amount: numberString(r.amount), base: numberString(r.base), rate: numberString(r.rate), effect: choice(r.effect, ['expense','credit','none']), paid: (() => { if (typeof r.paid !== 'boolean') throw Error('Estado de pago no válido.'); return r.paid; })(), note: str(r.note), ...(r.formats === undefined ? {} : {formats: formats(r.formats)}) })); })() })); })() }));
  for (const d of result.documents) { if (d.date && (!/^\d{4}-\d{2}-\d{2}$/.test(d.date) || !Number.isFinite(Date.parse(d.date)) || new Date(d.date).toISOString().slice(0,10) !== d.date)) throw Error('Fecha de liquidación no válida.'); for (const r of d.sections.flatMap(s => s.rows)) if (['renta','alcabala'].includes(r.kind) && r.currency !== 'PEN') throw Error('Los cálculos tributarios se expresan en PEN.'); }
  for (const d of result.documents) for (const r of d.sections.flatMap(s => s.rows)) { const amount = rowValue(r,result.common); if (!Number.isFinite(amount) || amount > 1e12) throw Error('El resultado del cálculo supera el importe permitido.'); }
  for (const d of result.documents) for (const t of Object.values(totals(d,result.common))) if (Math.max(t.expenses,t.credits,t.pending) > 1e12) throw Error('El total supera el importe permitido.');
  if (JSON.stringify(result).length > 55000) throw Error('El conjunto de liquidaciones supera el tamaño permitido.'); return result;
}
export function referenceSummary(document: Liquidation, common: LiquidationData['common'], operation: string) {
  if (operation !== 'venta' || common.price === '') return null;
  const t = totals(document, common), other = common.currency === 'PEN' ? t.USD.expenses : t.PEN.expenses;
  if (other !== 0 && (!common.exchange || numeric(common.exchange) <= 0)) return null;
  const expenses = common.currency === 'PEN' ? t.PEN.expenses + t.USD.expenses * numeric(common.exchange) : t.USD.expenses + (t.PEN.expenses ? t.PEN.expenses / numeric(common.exchange) : 0);
  return { currency: common.currency, value: roundMoney(numeric(common.price) + (document.side === 'owner' ? -expenses : expenses)), label: document.side === 'owner' ? 'Precio de referencia menos gastos' : 'Precio de referencia más gastos' };
}
