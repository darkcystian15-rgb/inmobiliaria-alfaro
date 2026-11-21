import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';
import { blankOwner, blankPlot, describeOwner, describePlot, identityDocument, normalizeIntermediation } from './intermediation.mjs';

export const INTERMEDIATION_WORD_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export async function intermediationWord(input: unknown, operation: 'venta' | 'alquiler' = 'alquiler') {
  const data = normalizeIntermediation(input);
  const zip = await JSZip.loadAsync(await readFile(`assets/intermediacion/${operation}.docx`));
  const xml = await zip.file('word/document.xml')!.async('string');
  const owners: (typeof blankOwner)[] = data.owners.length ? data.owners : [blankOwner];
  const plots: (typeof blankPlot)[] = data.plots.length ? data.plots : [blankPlot];
  const substitute = (source: string, fields: Record<string, string>) => source.replace(/\[\[([A-Z_]+)\]\]/g, (token, key) =>
    Object.hasOwn(fields, key) ? fields[key].replace(/[^\u0020-\ud7ff\ue000-\ufffd\u{10000}-\u{10ffff}]/gu, '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;') : token);
  const rows = owners.filter((_, index) => index % 2 === 0);
  const document = substitute(xml, {
    OWNERS: owners.map(owner => describeOwner(owner, operation)).join('; ') + ', en adelante «LOS PROPIETARIOS»',
    RENT: data.rent, COMMISSION: data.commission, TERM: data.term, DATE: data.date, CITY: data.city,
  }).replace(/<!--PREDIO_START-->([\s\S]*?)<!--PREDIO_END-->/, (_, paragraph) =>
    plots.map(plot => substitute(paragraph, { PREDIO: describePlot(plot) })).join('')
  ).replace(/<!--SIGN_START-->([\s\S]*?)<!--SIGN_END-->/, (_, row) =>
    rows.map((left, index) => {
      const right = owners[index * 2 + 1];
      return substitute(row, {
        LEFT_NAME: left.representante || left.nombre || 'XXXXX',
        LEFT_ID: identityDocument(left.representante ? left.representanteDocumento : left.documento),
        LEFT_ROLE: left.representante ? 'Por ' + (left.nombre || 'XXXXX') : 'LOS PROPIETARIOS',
        RIGHT_LINE: right ? '______________________________' : '',
        RIGHT_NAME: right ? right.representante || right.nombre || 'XXXXX' : '',
        RIGHT_ID: right ? identityDocument(right.representante ? right.representanteDocumento : right.documento) : '',
        RIGHT_ROLE: right ? right.representante ? 'Por ' + (right.nombre || 'XXXXX') : 'LOS PROPIETARIOS' : '',
      });
    }).join('')
  );
  zip.file('word/document.xml', document);
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}
