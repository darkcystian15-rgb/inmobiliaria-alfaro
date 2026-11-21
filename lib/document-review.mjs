import { extractCommercialProposals, COMMERCIAL_FIELDS } from './publication-document-extraction.mjs';
import { HOUSE_SALE_DISTRIBUTION, UNCONFIRMED } from './publication-text-model.mjs';

export const normalizeDocumentText = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Reject ambiguous decimal/group separators instead of repairing OCR digits.
export function reviewedArea(value) {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 && value <= 9999999999.99 && Math.abs(value * 100 - Math.round(value * 100)) < 0.001 ? value.toFixed(2) : null;
  let raw = String(value ?? '').trim().replace(/\s*(?:m[²2]|metros cuadrados)$/i, '').trim();
  if (/^\d{1,3}(?:,\d{3})+\.\d{1,2}$/.test(raw)) raw = raw.replaceAll(',', '');
  else if (/^\d{1,3}(?:\.\d{3})+,\d{1,2}$/.test(raw)) raw = raw.replaceAll('.', '').replace(',', '.');
  else if (/^\d+(?:[.,]\d{1,2})?$/.test(raw)) raw = raw.replace(',', '.');
  else return null;
  return reviewedArea(Number(raw));
}

export function needsDocumentOcr(text) {
  const body = String(text).replace(/Solicitud[^\n]*|Fecha Impresi[oó]n[^\n]*|p[aá]gina[^\n]*|Partida (?:Registral|Nro)[^\n]*/gi, '').trim();
  return body.length < 500;
}

export function reviewPage(text, { page = 1, method = 'native', confidence = null } = {}) {
  const normalized = normalizeDocumentText(text);
  const warnings = [];
  if (method === 'ocr') warnings.push('Cotejar cifras, decimales y unidades con la página original.');
  if (method === 'ocr' && (confidence == null || confidence < 75)) warnings.push('Lectura de baja calidad; necesita revisión visual.');
  if (/referencias de mercado|comparables|homologacion|predio matriz|terreno matriz/.test(normalized)) warnings.push('La página incluye comparables o un predio matriz. Comprueba a qué unidad pertenece el dato.');
  if (/rectifica|modificacion de fabrica|acumulaci|independiz/.test(normalized)) warnings.push('Hay antecedentes o cambios registrales. Verifica partida, lote y asiento.');
  const proposals = extractCommercialProposals([text]).map(item => ({ ...item, page, method, confidence, warnings: [...warnings, ...(item.field === 'areaParcial' ? ['Identifica si es un área total, por piso, matriz o comparable antes de asignarla.'] : [])] }));
  // SUNARP and tabular summaries use labels or units before the number.
  const patterns = [
    ['areaTerreno', /(?:TERRENO\s+[AÁ]rea|[AÁ]REA\s+(?:TOTAL\s+)?(?:DEL?\s+)?TERRENO)\s*[:=]?\s*(?:\(m[²2]\)|TOTAL\s+m[²2])?\s*[:=]?\s*([\d][\d.,]*)\s*(?:m[²2]|m[?*”"])?/giu],
    ['areaConstruida', /(?:[AÁ]REA\s+TECHADA\s+TOTAL|TOTAL\s+[AÁ]REA\s+TECHADA|[AÁ]REA\s+(?:CONSTRUIDA|DE\s+TECHADA)\s+TOTAL)\s*[:=]?\s*(?:\(?m[²2]\)?)?\s*[:=]?\s*([\d][\d.,]*)/giu],
    ['superficie', /(?:CON\s+UN\s+[AÁ]REA\s+DE|^[AÁ]REA\s*:)\s*([\d][\d.,]*)\s*m[²2?*”"]/gimu],
  ];
  for (const [field, pattern] of patterns) for (const match of text.matchAll(pattern)) {
    const value = `${match[1]} m²`;
    if (proposals.some(item => item.field === field && item.value === value)) continue;
    const destination = field.startsWith('area') && /comparables?|referencias de mercado|predio matriz|terreno matriz/.test(normalized) ? 'areaParcial' : field;
    proposals.push({ field: destination, label: COMMERCIAL_FIELDS[destination] || 'Superficie de parcela / lote', value, page, evidence: text.slice(Math.max(0, match.index - 150), match.index + match[0].length + 250).trim(), method, confidence, warnings: [...warnings, ...(field === 'superficie' ? ['Identifica parcela, lote y tipo de superficie antes de usarla.'] : [])] });
  }
  return { proposals: proposals.slice(0, 40), warnings: [...warnings, ...(String(text).trim().length < 200 ? ['No se recuperó suficiente contenido. Revisa la página original.'] : [])] };
}

function excelValue(cell) {
  const value = cell.value;
  if (!value || typeof value !== 'object') return value;
  if ('result' in value) return value.result;
  if ('richText' in value) return value.richText.map(item => item.text).join('');
  return 'text' in value ? value.text : null;
}

export function reviewWorkbook(workbook) {
  const proposals = [], warnings = [];
  for (const sheet of workbook.worksheets) {
    if (sheet.rowCount > 2000 || sheet.columnCount > 100) { warnings.push(`${sheet.name}: hoja demasiado grande para la lectura integrada.`); continue; }
    const rows = [];
    sheet.eachRow({ includeEmpty: false }, row => {
      const cells = [];
      row.eachCell({ includeEmpty: false }, (cell, col) => { const value = excelValue(cell); if (value != null && String(value).trim()) cells.push({ col, address: cell.address, value }); });
      rows.push({ number: row.number, cells, text: cells.map(cell => `${cell.address}: ${cell.value}`).join(' | ') });
    });
    const add = (field, cell, evidence) => {
      const area = reviewedArea(cell.value);
      if (!area || proposals.some(p => p.sheet === sheet.name && p.cell === cell.address && p.field === field)) return;
      proposals.push({ field, label: COMMERCIAL_FIELDS[field], value: `${area} m²`, page: 0, sheet: sheet.name, cell: cell.address, evidence: evidence.slice(0, 1500), method: 'excel', confidence: null, warnings: ['Comprueba que la fila corresponde al inmueble tasado.'] });
    };
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i], name = normalizeDocumentText(row.text);
      if (/terreno valuado|inmueble valuado/.test(name)) {
        const header = rows.slice(0, i).reverse().find(r => r.cells.some(c => /area/.test(normalizeDocumentText(c.value)) && /m2|m²|terreno/.test(normalizeDocumentText(c.value))));
        const areaColumn = header?.cells.find(c => /area/.test(normalizeDocumentText(c.value)) && !/precio|construid/.test(normalizeDocumentText(c.value)))?.col;
        const cell = row.cells.find(c => c.col === areaColumn);
        if (cell) add('areaTerreno', cell, `${header.text}\n${row.text}`);
      }
      // Read literal commercial label/value pairs without flattening the whole sheet.
      const commercialLabels = { direccion: /^(?:ubicacion|direccion)(?: del (?:predio|inmueble))?\s*:?$/,
        distribucion: /^distribucion(?: de ambientes| del inmueble)?\s*:?$/,
        antiguedad: /^antiguedad\s*:?$/, conservacion: /^estado de conservacion\s*:?$/,
        medidas: /^(?:medidas perimetricas|linderos y medidas perimetricas)\s*:?$/ };
      if (!/comparable|referencia de mercado|predio matriz/.test(name)) for (const label of row.cells) {
        const field = Object.keys(commercialLabels).find(key => commercialLabels[key].test(normalizeDocumentText(label.value).trim()));
        const value = row.cells.find(cell => cell.col === label.col + 1);
        if (field && value && String(value.value).trim() && typeof value.value !== 'number') proposals.push({ field, label: COMMERCIAL_FIELDS[field], value: String(value.value).trim().slice(0, 1000), page: 0, sheet: sheet.name, cell: value.address, evidence: row.text.slice(0, 1500), method: 'excel', confidence: null, warnings: ['Comprueba que la fila corresponde al inmueble y conserva solo información comercial.'] });
      }
      // A market-comparison or per-floor table heading is not a total-area label.
      if (/descripcion|referencia|ubicacion|estructura|comparable|predio matriz|piso|nivel/.test(name)) continue;
      for (const label of row.cells.filter(c => /^(?:area de terreno|area del terreno|area construida)(?:\s|\(|$)/.test(normalizeDocumentText(c.value)))) {
        const field = /construida/.test(normalizeDocumentText(label.value)) ? 'areaConstruida' : 'areaTerreno';
        const sameRow = row.cells.find(c => c.col === label.col + 1 && reviewedArea(c.value));
        if (sameRow) { add(field, sameRow, row.text); continue; }
        // Read the value below its exact column, never the neighbouring price/m².
        for (const next of rows.slice(i + 1, i + 3)) {
          if (/piso|comparable|referencia|cochera|caseta/.test(normalizeDocumentText(next.text))) break;
          const cell = next.cells.find(c => c.col === label.col && reviewedArea(c.value));
          if (cell) { add(field, cell, `${row.text}\n${next.text}`); break; }
        }
      }
    }
  }
  return { proposals: proposals.slice(0, 80), warnings };
}

export function documentConflicts(proposals) {
  const fields = new Map();
  for (const proposal of proposals) {
    const values = fields.get(proposal.field) || new Set();
    values.add(proposal.field.startsWith('area') ? reviewedArea(proposal.value) || proposal.value : proposal.value);
    fields.set(proposal.field, values);
  }
  return [...fields].filter(([, values]) => values.size > 1).map(([field]) => field);
}

export function applyReviewedToDraft(text, proposals, { replaceExisting = false } = {}) {
  const headings = { areaTerreno: 'ÁREA DE TERRENO', areaConstruida: 'ÁREA CONSTRUIDA', medidas: 'MEDIDAS (', distribucion: 'DISTRIBUCIÓN', antiguedad: 'ANTIGÜEDAD', conservacion: 'ESTADO DE CONSERVACIÓN', direccion: 'UBICACIÓN' };
  let next = text, applied = 0;
  const seen = new Set();
  for (const proposal of proposals) {
    if (seen.has(proposal.field)) throw new Error('Selecciona un solo valor por campo para incorporarlo al texto.');
    seen.add(proposal.field);
    const heading = headings[proposal.field];
    if (!heading) continue;
    const lines = next.split('\n'), at = lines.findIndex(line => line.includes(heading));
    if (at < 0) continue;
    const target = lines[at].includes(UNCONFIRMED) || lines[at].includes(':') ? at : at + 1;
    if (proposal.field === 'distribucion' && lines.slice(target, target + HOUSE_SALE_DISTRIBUTION.split('\n').length).join('\n') === HOUSE_SALE_DISTRIBUTION) { lines.splice(target, HOUSE_SALE_DISTRIBUTION.split('\n').length, proposal.value); next = lines.join('\n'); applied++; }
    else if (lines[target]?.includes(UNCONFIRMED)) { lines[target] = lines[target].replace(UNCONFIRMED, proposal.value); next = lines.join('\n'); applied++; }
    else if (replaceExisting && (lines[at].includes(':') || target < lines.length) && proposal.field !== 'distribucion') {
      if (lines[at].includes(':') && proposal.field !== 'direccion') lines[at] = `${lines[at].split(':')[0]}: ${proposal.value}`;
      else lines[target] = proposal.value;
      next = lines.join('\n'); applied++;
    }
  }
  if (next.length > 20000) throw new Error('El texto supera los 20 000 caracteres.');
  return { text: next, applied };
}
