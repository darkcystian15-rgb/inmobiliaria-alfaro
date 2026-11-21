import { registrySourceTypes } from './reference-plan.mjs';
export const INTERMEDIATION_TYPE = 'CONTRATO_INTERVENCION_INMOBILIARIA';
export const INTERMEDIATION_STRUCTURE_TYPE = 'ESTRUCTURA_CONTRATO_INTERMEDIACION';
export const INTERMEDIATION_STRUCTURE_LABEL = 'Estructura de Contarto de Intermediación Inmobiliaria';
export const INTERMEDIATION_STRUCTURE_LEGACY_TITLE = 'ESTRUCTURA DE CONTRATO DE INTERMEDIACIÓN INMOBILIARIA';
export const INTERMEDIATION_MIMES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
export const sourceTypes = [
  'DNI_PROPIETARIO', 'VENDEDOR_DNI', 'VENDEDOR_DNI_GERENTE', 'VENDEDOR_FICHA_RUC',
  'VENDEDOR_PODER', 'VENDEDOR_VIGENCIA_PODER', 'VENDEDOR_PODER_GERENTE', 'VENDEDOR_VIGENCIA_GERENTE',
  'ARRENDADOR_DNI', 'ARRENDADOR_PODER', 'ARRENDADOR_VIGENCIA_PODER', 'ARRENDADOR_FICHA_RUC',
  'ARRENDADOR_DNI_GERENTE', 'ARRENDADOR_PODER_GERENTE', 'ARRENDADOR_VIGENCIA_GERENTE',
  ...registrySourceTypes,
];
const field = (text, max = 220) => typeof text === 'string' ? text.replace(/[\x00-\x1f]/g, ' ').trim().slice(0, max) : '';
const value = text => text || 'XXXXX';
export const identityDocument = text => /^\d{8}$/.test(text) ? `DNI N.° ${text}` : /^\d{11}$/.test(text) ? `RUC N.° ${text}` : value(text);

export const registryHeader = /^[ \t]*(P\d{8})(?:[ \t]+(?:\d{8}|PUBLICIDAD[^\r\n]*))?[ \t]*\r?\n(?:[ \t]*PUBLICIDAD[^\r\n]*\r?\n)?[ \t]*DPTO[ \t]*:[^\r\n]*\bPROV[ \t]*:[^\r\n]*\bDIST[ \t]*:/gim;

export function intermediationProposals(type, text, operation = 'alquiler') {
  const proposals = [];
  const add = (key, matches) => {
    for (const match of matches) {
      const candidate = field(match[1], 350);
      if (candidate && !proposals.some(item => item.key === key && item.value === candidate)) proposals.push({ key, value: candidate });
    }
  };
  if (registrySourceTypes.includes(type)) {
    const headers = [...text.matchAll(registryHeader)];
    const references = /\bPARTIDA(?:[ \t]+(?:REGISTRAL|ELECTR[ÓO]NICA)){0,2}\s*(?:N(?:[ÚU]MERO|RO|O)?[ \t.*°º]*\s*)?[:#-]?\s*([A-Z]?\d{6,12})\b/gi;
    const propertyReferences = [...text.matchAll(references)].filter(match => {
      const before = text.slice(Math.max(0, match.index - 100), match.index);
      const after = text.slice(match.index + match[0].length);
      return !/\b(?:antecedente(?:\s+registral)?|(?:predio|lote)\s+matriz|partida\s+(?:matriz|de\s+origen))\s*(?:[:.,;-]\s*)?(?:(?:es|en)\s+)?(?:(?:de\s+)?la\s+)?$/i.test(before)
        && !/^[ \t]*(?:\([ \t]*)?(?:matriz|de origen|antecedente registral)\b/i.test(after);
    });
    add('partida', headers.length ? headers : propertyReferences);
    add('area', text.matchAll(/(?<![\p{L}\p{N}])(?:[ÁA]REA(?:\s+(?:DE\s+TERRENO|TOTAL))?|SUPERFICIE)\s*[:=]?\s*(\d[\d., ]{0,17}\s*(?:m\s*[²2]|metros cuadrados))/giu));
    const dimensionsRow = /^[ \t]*[ÁA]rea[ \t]+Piso[ \t]+Lado[ \t]+Frente[ \t]+Fondo[ \t]+Derecha[ \t]+Izquierda[^\r\n]*\r?\n[ \t]*(\d+(?:[.,]\d+)?)[ \t]+[A-Z0-9]+(?:[ \t]+[A-Z])?[ \t]+(\d+(?:[.,]\d+)?)[ \t]+(\d+(?:[.,]\d+)?)[ \t]+(\d+(?:[.,]\d+)?)[ \t]+(\d+(?:[.,]\d+)?)(?=[ \t]|\r?$)/gim;
    for (const row of text.matchAll(dimensionsRow)) {
      add('area', [[null, `${row[1]} m²`]]);
      const sides = ['Frente', 'Fondo', 'Derecha', 'Izquierda'];
      add('linderos', [[null, sides.map((side, index) => `${side}: ${row[index + 2]} m`).join('; ')]]);
    }
    add('ubicacion', text.matchAll(/(?:^|\n)\s*(?:UBICACI[ÓO]N|DIRECCI[ÓO]N)\s*:\s*([^\r\n]{4,220})/gi));
    add('linderos', text.matchAll(/(?:^|\n)\s*((?:POR\s+(?:EL|LA)\s+)?(?:FRENTE|FONDO|DERECHA|IZQUIERDA|LINDEROS)\b(?![ \t]+MEDIDA[ \t]+COLINDANCIA\b)\s*[:;,]?\s+[^\r\n]{4,220})/gi));
  } else {
    const representative = /PODER|VIGENCIA|GERENTE/.test(type);
    add(representative ? 'representante' : 'nombre', text.matchAll(/(?:^|\n)\s*(?:NOMBRES?\s+Y\s+APELLIDOS?|APELLIDOS?\s+Y\s+NOMBRES?|NOMBRE\s+COMPLETO|RAZ[ÓO]N\s+SOCIAL|REPRESENTANTE(?:\s+LEGAL)?|APODERADO)\s*:?\s*\n?\s*([\p{L}][\p{L} .,'’&-]{4,125})/giu));
    if (!representative && !proposals.some(item => item.key === 'nombre')) {
      const pieces = [...text.matchAll(/(?:^|\n)\s*(?:PRIMER\s+APELLIDO|SEGUNDO\s+APELLIDO|PRENOMBRES?|APELLIDO\s+PATERNO|APELLIDO\s+MATERNO)\s*:?\s*\n?\s*([\p{L}][\p{L} .'’-]{1,60})/giu)];
      if (pieces.length >= 2) add('nombre', [[null, pieces.map(match => match[1].trim()).join(' ')]]);
    }
    add(representative ? 'representanteDocumento' : 'documento', text.matchAll(/(?:D\.?\s*N\.?\s*I\.?|R\.?\s*U\.?\s*C\.?|DOCUMENTO\s+NACIONAL\s+DE\s+IDENTIDAD)\s*(?:N(?:RO|ÚMERO)?[.°º]*\s*[:.]?\s*|[:#]\s*)?(\d{11}|\d{8})\b/gi));
    if (!representative && !proposals.some(item => item.key === 'documento')) {
      add('documento', [...text.matchAll(/(?:^|\n)\s*(\d{8})\s*(?=\n|$)|I<PER(\d{8})/gi)].map(m => [null, m[1] ?? m[2]]));
    }
    if (operation === 'venta' && !representative) add('domicilio', text.matchAll(/(?:^|\n)\s*(?:DOMICILIO|DIRECCI[ÓO]N)\s*:\s*([^\r\n]{4,220})/gi));
    if (representative) add('poder', text.matchAll(/(?:^|\n)\s*((?:PARTIDA(?:\s+REGISTRAL)?|ASIENTO|FACULTADES)\s*[:.]?\s+[^\r\n]{3,200})/gi));
  }
  return proposals.slice(0, 30);
}

export function normalizeIntermediation(input) {
  const owners = (Array.isArray(input?.owners) ? input.owners : []).slice(0, 20).map(item => ({
    nombre: field(item?.nombre), documento: field(item?.documento, 35),
    domicilio: field(item?.domicilio, 350), representante: field(item?.representante), representanteDocumento: field(item?.representanteDocumento, 35), poder: field(item?.poder, 350),
  })).filter(item => Object.values(item).some(Boolean));
  const plots = (Array.isArray(input?.plots) ? input.plots : []).slice(0, 20).map(item => ({
    partida: field(item?.partida, 50), ubicacion: field(item?.ubicacion, 350), area: field(item?.area, 75), linderos: field(item?.linderos, 900),
  })).filter(item => Object.values(item).some(Boolean));
  const term = typeof input?.term === 'string' && /^\d{1,3}$/.test(input?.term) && Number(input.term) > 0 ? String(Number(input.term)) : '';
  const rent = typeof input?.rent === 'string' && /^\d{1,10}(?:[.,]\d{1,2})?$/.test(input?.rent) && Number(input.rent.replace(',', '.')) > 0 ? Number(input.rent.replace(',', '.')) : null;
  const validCurrency = ['PEN', 'USD'].includes(input?.currency);
  const date = typeof input?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.date) ? new Date(input.date + 'T12:00:00Z') : null;
  const dateText = date && Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === input.date
    ? new Intl.DateTimeFormat('es-PE', { dateStyle: 'long', timeZone: 'UTC' }).format(date) : '';
  return { owners, plots, term: value(term),
    rent: rent !== null && validCurrency ? `${input.currency === 'USD' ? 'US$' : 'S/'} ${new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(rent)}` : 'XXXXX',
    commission: typeof input?.commission === 'string' && /^\d{1,3}(?:[.,]\d{1,2})?$/.test(input.commission) && Number(input.commission.replace(',', '.')) > 0 && Number(input.commission.replace(',', '.')) <= 100
      ? new Intl.NumberFormat('es-PE', { maximumFractionDigits: 2 }).format(Number(input.commission.replace(',', '.'))) + ' %' : 'XXXXX %',
    date: value(dateText), city: value(field(input?.city)),
  };
}

export const blankOwner = { nombre: '', documento: '', domicilio: '', representante: '', representanteDocumento: '', poder: '' };
export const blankPlot = { partida: '', ubicacion: '', area: '', linderos: '' };
export function describeOwner(owner, operation = 'alquiler') {
  const proxy = owner.representante || owner.representanteDocumento || owner.poder;
  return `${value(owner.nombre)}, identificado con ${identityDocument(owner.documento)}${proxy ? `, representado por ${value(owner.representante)}, identificado con ${identityDocument(owner.representanteDocumento)}, según ${value(owner.poder)}` : ''}${operation === 'venta' ? `, con domicilio en ${value(owner.domicilio)}` : ''}`;
}
export const describePlot = plot => `Partida registral N.° ${value(plot.partida)}. Ubicación: ${value(plot.ubicacion)}. Área: ${value(plot.area)}. Linderos: ${value(plot.linderos)}.`;
export const contractFilename = item => `Contrato de Intermediación Inmobiliaria ${[item.tipo, item.direccion, item.contacto].filter(Boolean).join(' ')}`.replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 180);

export function intermediationPrompt(draft, item, operation = 'alquiler') {
  const data = normalizeIntermediation(draft);
  const sale = operation === 'venta';
  const identity = sale ? 'venta exclusiva' : 'alquiler con exclusividad';
  const templateInstructions = sale
    ? 'Conserva las seis cláusulas con numeración correlativa, el logo institucional arriba a la derecha, la marca de agua y los bloques de firmas.'
    : 'Mantén sus siete cláusulas, orden y formato, el logotipo institucional y los bloques de firmas.';
  const price = sale ? `Primer precio de venta de cierre: ${data.rent}. Las ofertas y contraofertas se canalizan por la inmobiliaria.` : `Renta mensual mínima de cierre: ${data.rent}, más impuesto a la renta según el modelo.`;
  const fee = sale ? `Contraprestación de éxito: ${data.commission} del precio final de venta más IGV. Se paga el 100 % al firmar la escritura de compraventa.`
    : 'Contraprestación de éxito: una renta mensual del precio final de alquiler más IGV. Se paga al firmar el arrendamiento.';
  const protection = sale ? 'cuatro (4) meses para clientes presentados por la inmobiliaria durante la vigencia.' : 'cuatro (4) meses para clientes presentados, contactados o captados durante la vigencia.';
  return `Genera un archivo Word (.docx) del contrato de intermediación inmobiliaria de ${identity} usando como plantilla el Word adjunto. ${templateInstructions} Sustituye todos los datos del inmueble y propietarios del ejemplo por estos datos revisados. Escribe XXXXX cuando falte un dato. Usa el número de propietarios y de predios indicado. No completes los datos pendientes por inferencia.

Inmueble: ${value(item.tipo)} · ${value(item.direccion)} · Zona ${value(item.zona)} · N.° ${item.numero ?? 'XXXXX'}
Contacto de la ficha (para el nombre de archivo): ${value(item.contacto)}

Propietarios y representación:
${(data.owners.length ? data.owners : [blankOwner]).map(owner => '- ' + describeOwner(owner, operation)).join('\n')}

Predios (para Antecedentes):
${(data.plots.length ? data.plots : [blankPlot]).map(plot => '- ' + describePlot(plot)).join('\n')}

Condiciones del contrato:
- Plazo de vigencia: ${data.term} meses desde la firma.
- ${price}
- ${fee}
- Periodo posterior al vencimiento: ${protection}
- Firma: ${data.date}, en ${data.city}.

Nombre de archivo: ${contractFilename(item)}.docx`;
}
