import { useState, type KeyboardEvent } from 'react';
import { liquidationCellStyle, liquidationFonts, rowHasAmount, rowValue, totals, type LiquidationCell, type LiquidationFont, type LiquidationFormat, type LiquidationSection, type LiquidationRow, type LiquidationData } from '@/lib/liquidation';

const cell = 'w-full min-w-0 border-0 bg-transparent px-3 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-inset focus:ring-red-600 disabled:text-slate-400';
const money = (n: number) => n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const action = 'min-h-9 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-800 disabled:opacity-40';

export default function LiquidationSheet({ section, common, operation, sectionIndex, onEdit, onRows }: {
  section: LiquidationSection; common: LiquidationData['common']; operation: string; sectionIndex: number;
  onEdit: (id: string, patch: Partial<LiquidationRow>) => void; onRows: (rows: LiquidationRow[]) => void;
}) {
  const [selection, setSelection] = useState<{ id: string; key: LiquidationCell } | null>(null);
  const [options, setOptions] = useState<string | null>(null);
  const selected = section.rows.find(r => r.id === selection?.id);
  const format = selected && selection ? selected.formats?.[selection.key] : undefined;
  const summary = totals({ sections: [section] }, common);
  function apply(patch: LiquidationFormat, clear = false) {
    if (!selected || !selection) return;
    onEdit(selected.id, { formats: { ...selected.formats, [selection.key]: clear ? {} : { ...format, ...patch } } });
  }
  function navigate(event: KeyboardEvent<HTMLTableElement>) {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing || !(event.target instanceof HTMLInputElement)) return;
    const current = event.target.closest('td');
    const row = current?.parentElement as HTMLTableRowElement | null;
    const next = event.shiftKey ? row?.previousElementSibling : row?.nextElementSibling;
    const target = next?.children[current?.cellIndex ?? 0]?.querySelector<HTMLInputElement>('input:not(:disabled)');
    if (target) { event.preventDefault(); target.focus(); target.select(); }
  }
  function move(index: number, direction: number) {
    const rows = [...section.rows], target = index + direction;
    if (target < 0 || target >= rows.length) return;
    [rows[index], rows[target]] = [rows[target], rows[index]]; onRows(rows);
  }
  const selectedLabel = selection && selected ? `${section.rows.indexOf(selected) + 1} · ${{ label: 'Concepto', USD: 'US$', PEN: 'S/', note: 'Observación' }[selection.key]}` : 'Selecciona una celda';
  return <div className="min-w-0">
    <div role="toolbar" aria-label={`Formato de celdas de sección ${sectionIndex + 1}`} className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white p-3">
      <span className="mr-1 text-xs text-slate-500" aria-live="polite">{selectedLabel}</span>
      <button type="button" title="Negrita" aria-label="Negrita" aria-pressed={Boolean(format?.bold)} disabled={!selected} className={`${action} font-bold ${format?.bold ? 'bg-red-50 ring-1 ring-red-500' : ''}`} onClick={() => apply({ bold: !format?.bold })}>N</button>
      <button type="button" aria-label="Cursiva" aria-pressed={Boolean(format?.italic)} disabled={!selected} className={`${action} italic`} onClick={() => apply({ italic: !format?.italic })}>C</button>
      <label className="flex items-center gap-1 text-xs">Tipografía
        <select className={action} disabled={!selected} value={format?.font ?? 'helvetica'} onChange={event => apply({ font: event.target.value as LiquidationFont })}>
          {Object.entries(liquidationFonts).map(([key, font]) => <option key={key} value={key}>{font.label}</option>)}
        </select>
      </label>
      <label className="flex items-center gap-1 text-xs">Tamaño<select aria-label="Tamaño de texto" className={action} disabled={!selected} value={format?.size ?? 11} onChange={e => apply({ size: Number(e.target.value) })}>{Array.from({ length: 17 }, (_, i) => i + 8).map(size => <option key={size}>{size}</option>)}</select></label>
      <button type="button" aria-label="Resaltar celda" aria-pressed={format?.background === 'highlight'} disabled={!selected} className={`${action} border-yellow-300 bg-yellow-100`} onClick={() => apply({ background: format?.background === 'highlight' ? 'none' : 'highlight' })}>Resaltar</button>
      <button type="button" aria-label="Sombrear celda" aria-pressed={format?.background === 'shade'} disabled={!selected} className={`${action} bg-slate-200`} onClick={() => apply({ background: format?.background === 'shade' ? 'none' : 'shade' })}>Sombrear</button>
      <button type="button" aria-label="Limpiar formato de celda" disabled={!selected} className={action} onClick={() => apply({}, true)}>Limpiar</button>
    </div>
    <div className="max-w-full overflow-x-auto overscroll-x-contain">
      <table aria-label={`Hoja de cálculo · ${section.title}`} className="w-full min-w-[740px] table-fixed border-collapse text-sm" onKeyDown={navigate}>
        <caption className="bg-white px-4 py-2 text-left text-xs text-slate-500">Tab: siguiente celda · Enter: siguiente fila</caption>
        <colgroup>{[40, 230, 115, 115, 220, 112].map((width, i) => <col key={i} style={{ width }} />)}</colgroup>
        <thead className="bg-slate-100 text-xs text-slate-600"><tr>{['', 'A · Concepto', 'B · US$', 'C · S/', 'D · Observación', ''].map((title, i) => <th scope="col" key={i} className="border border-slate-200 px-3 py-2 text-left">{title}</th>)}</tr></thead>
        <tbody>{section.rows.map((row, ri) => {
          const monetary = row.kind !== 'text', calculated = monetary && row.kind !== 'amount';
          const selectedCell = (key: LiquidationCell) => ({ style: liquidationCellStyle(row.formats?.[key]), onFocus: () => setSelection({ id: row.id, key }), 'data-cell': key });
          return <tr key={row.id} className="divide-x divide-slate-200 border-b border-slate-200">
            <th scope="row" className="bg-slate-100 text-xs font-normal text-slate-500">{ri + 1}</th>
            <td {...selectedCell('label')}><input aria-label="Concepto" className={cell} style={liquidationCellStyle(row.formats?.label)} maxLength={200} value={row.label} onChange={e => onEdit(row.id, { label: e.target.value })} /></td>
            {(['USD', 'PEN'] as const).map(currency => (
              <td key={currency} {...selectedCell(currency)} className="text-right">
                {monetary && !calculated && (
                  <input aria-label={row.currency === currency ? 'Importe' : `Importe en ${currency}`}
                    type="number" min="0" step="any" inputMode="decimal"
                    className={`${cell} text-right tabular-nums`} style={liquidationCellStyle(row.formats?.[currency])}
                    value={row.currency === currency ? row.amount : ''}
                    onChange={event => {
                      if (currency !== row.currency && row.amount && !window.confirm(`¿Cambiar el importe de esta fila a ${currency}?`)) return;
                      onEdit(row.id, { currency, amount: event.target.value });
                    }} />
                )}
                {calculated && row.currency === currency && (
                  <button type="button" aria-label={`Importe calculado ${currency}`} className={`${cell} text-right tabular-nums text-blue-900`}
                    style={liquidationCellStyle(row.formats?.[currency])} onClick={() => setOptions(row.id)}>
                    {rowHasAmount(row, common) ? money(rowValue(row, common)) : 'Editar cálculo'}
                  </button>
                )}
              </td>
            ))}
            <td {...selectedCell('note')}><input aria-label={monetary ? 'Observación (opcional)' : 'Contenido de la nota'} className={cell} style={liquidationCellStyle(row.formats?.note)} maxLength={500} value={row.note} onChange={e => onEdit(row.id, { note: e.target.value })} /></td>
            <td className="text-center">
              <div className="flex flex-wrap justify-center gap-1 p-1">
                <button type="button" className={action} aria-label={`Subir concepto ${ri + 1} de sección ${sectionIndex + 1}`} disabled={ri === 0} onClick={() => move(ri, -1)}>↑</button>
                <button type="button" className={action} aria-label={`Bajar concepto ${ri + 1} de sección ${sectionIndex + 1}`} disabled={ri === section.rows.length - 1} onClick={() => move(ri, 1)}>↓</button>
                <button type="button" aria-label={`Opciones de fila ${ri + 1} de sección ${sectionIndex + 1}`} aria-expanded={options === row.id} className={action} onClick={() => setOptions(options === row.id ? null : row.id)}>···</button>
              </div>
            </td>
          </tr>;
        })}</tbody>
        <tfoot className="bg-slate-100 font-bold"><tr><th scope="row" colSpan={2} className="px-4 py-3 text-left">Total de gastos</th><td className="px-3 text-right tabular-nums">{money(summary.USD.expenses)}</td><td className="px-3 text-right tabular-nums">{money(summary.PEN.expenses)}</td><td colSpan={2} /></tr></tfoot>
      </table>
    </div>
    {section.rows.filter(row => row.id === options).map(row => {
      const ri = section.rows.indexOf(row);
      return <div key={row.id} aria-label={`Opciones de fila ${ri + 1}`} className="flex flex-wrap items-end gap-3 border-t border-slate-200 bg-slate-50 p-3 text-xs">
        <label>Tipo<select aria-label="Tipo de fila" className={`${action} ml-1`} value={row.kind} onChange={e => { const kind = e.target.value as LiquidationRow['kind']; onEdit(row.id, { kind, effect: kind === 'text' ? 'none' : row.effect === 'none' ? 'expense' : row.effect, currency: ['renta', 'alcabala'].includes(kind) ? 'PEN' : row.currency, amount: kind === 'amount' && row.kind !== 'amount' ? (rowHasAmount(row, common) ? String(rowValue(row, common)) : '') : row.amount }); }}><option value="amount">Importe manual</option><option value="percent">Porcentaje</option><option value="text">Texto / nota</option>{operation !== 'alquiler' && <><option value="renta">Cálculo de renta</option><option value="alcabala">Cálculo de alcabala</option></>}</select></label>
        {row.kind !== 'text' && <><label>Moneda<select aria-label="Moneda" className={`${action} ml-1`} disabled={['renta', 'alcabala'].includes(row.kind)} value={row.currency} onChange={e => onEdit(row.id, { currency: e.target.value as LiquidationRow['currency'] })}><option value="PEN">S/</option><option value="USD">US$</option></select></label><label>Tratamiento<select aria-label="Tratamiento" className={`${action} ml-1`} value={row.effect} onChange={e => onEdit(row.id, { effect: e.target.value as LiquidationRow['effect'] })}><option value="expense">Gasto</option><option value="credit">Abono</option><option value="none">Informativo</option></select></label><label className="flex min-h-9 items-center gap-2"><input aria-label="Ya pagado" type="checkbox" checked={row.paid} onChange={e => onEdit(row.id, { paid: e.target.checked })} />Pagado</label></>}
        {row.kind === 'percent' && <><label>Base<input aria-label="Base para este porcentaje" type="number" min="0" step="any" className={`${action} ml-1 w-28`} value={row.base} onChange={e => onEdit(row.id, { base: e.target.value })} /></label><label>%<input aria-label="Porcentaje (%)" type="number" min="0" step="any" className={`${action} ml-1 w-20`} value={row.rate} onChange={e => onEdit(row.id, { rate: e.target.value })} /></label></>}
        <button type="button" className={action} aria-label={`Duplicar concepto ${ri + 1} de sección ${sectionIndex + 1}`} onClick={() => onRows([...section.rows.slice(0, ri + 1), { ...structuredClone(row), id: crypto.randomUUID() }, ...section.rows.slice(ri + 1)])}>Duplicar</button><button type="button" className={action} aria-label={`Quitar concepto ${ri + 1} de sección ${sectionIndex + 1}`} onClick={() => { if (window.confirm('¿Quitar este concepto?')) { onRows(section.rows.filter(r => r.id !== row.id)); setOptions(null); } }}>Quitar</button>
      </div>;
    })}
  </div>;
}
