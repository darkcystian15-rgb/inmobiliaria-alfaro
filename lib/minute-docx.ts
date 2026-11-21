import { readFile } from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import type { MinuteDocument } from './minute-document';
import { minuteRuns } from './minute-format.mjs';

export const WORD_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const word = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const rel = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const drawing = 'http://schemas.openxmlformats.org/drawingml/2006';
const xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const escape = (text: string) => text.replace(/[^\u0009\u000a\u000d\u0020-\ud7ff\ue000-\ufffd\u{10000}-\u{10ffff}]/gu, '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const runText = (text: string) => text.split(/(\t|\n)/).map(part => {
  if (part === '\t') return '<w:tab/>';
  if (part === '\n') return '<w:br/>';
  return `<w:t xml:space="preserve">${escape(part)}</w:t>`;
}).join('');
const run = (text: string) => `<w:r>${runText(text)}</w:r>`;
const paragraph = (content: string, align = 'left') => `<w:p><w:pPr><w:jc w:val="${align}"/></w:pPr>${content}</w:p>`;
const namespaces = `xmlns:w="${word}" xmlns:r="${rel}" xmlns:wp="${drawing}/wordprocessingDrawing" xmlns:a="${drawing}/main" xmlns:pic="${drawing}/picture"`;
const relationships = (rows: [string, string, string][]) =>
  `${xml}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rows.map(([id, type, target]) =>
    `<Relationship Id="${id}" Type="${rel}/${type}" Target="${target}"/>`).join('')}</Relationships>`;

function footerRuns(text: string) {
  return text.split(/(\{pagina\}|\{total\})/).map(part => {
    if (part === '{pagina}' || part === '{total}') {
      return `<w:fldSimple w:instr="${part === '{pagina}' ? 'PAGE' : 'NUMPAGES'}"><w:r><w:t>1</w:t></w:r></w:fldSimple>`;
    }
    return run(part);
  }).join('');
}

function imageRun(id: number, width: number, height: number) {
  const cx = Math.round(width * 36000), cy = Math.round(height * 36000);
  return `<w:r><w:drawing><wp:inline><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${id}" name="Imagen ${id}"/>
    <a:graphic><a:graphicData uri="${drawing}/picture"><pic:pic>
      <pic:nvPicPr><pic:cNvPr id="0" name="Imagen ${id}"/><pic:cNvPicPr/></pic:nvPicPr>
      <pic:blipFill><a:blip r:embed="rIdImage${id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>
      <pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>
    </pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
}

export async function minuteDocx(data: MinuteDocument, propertyCode: string, images: Record<number, Uint8Array>, plain = false) {
  const zip = new JSZip();
  const aspect = (bytes: Uint8Array) => {
    const dimensions = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return dimensions.getUint32(20) / dimensions.getUint32(16);
  };
  const links: [string, string, string][] = [['rIdStyles', 'styles', 'styles.xml']];
  if (!plain) {
    const logo = await readFile(path.join(process.cwd(), 'public/branding/logo.png'));
    zip.file('word/media/logo.png', logo);
    const logoWidth = Math.min(37, 17 / aspect(logo));
    const header = paragraph(imageRun(1, logoWidth, logoWidth * aspect(logo)) + run(data.header ? '\t' + data.header : ''));
    const footer = [
      paragraph(footerRuns(data.footer), 'center'),
      paragraph(footerRuns(data.footerReference ?? (propertyCode ? `Inmueble: ${propertyCode}` : ''))),
      paragraph(footerRuns(data.footerPagination ?? 'Página {pagina} de {total}'), 'right'),
    ].join('');
    links.push(['rIdHeader', 'header', 'header1.xml'], ['rIdFooter', 'footer', 'footer1.xml']);
    zip.file('word/_rels/header1.xml.rels', relationships([['rIdImage1', 'image', 'media/logo.png']]));
    zip.file('word/header1.xml', `${xml}<w:hdr ${namespaces}>${header}</w:hdr>`);
    zip.file('word/footer1.xml', `${xml}<w:ftr ${namespaces}>${footer}</w:ftr>`);
  }
  const sourceLayout = data.layout === 'word-model';
  const content = plain ? [] : [paragraph(`<w:r><w:rPr><w:b/><w:sz w:val="${sourceLayout ? 22 : 32}"/></w:rPr>${runText(data.title)}</w:r>`, sourceLayout ? 'left' : 'center')];
  function addText(start: number, end: number) {
    let offset = start;
    for (const line of data.text.slice(start, end).split('\n')) {
      const formatted = minuteRuns(data, offset, offset + line.length).map(part => {
        const background = part.background === 'highlight' ? '<w:highlight w:val="yellow"/>' : part.background === 'shade' ? '<w:shd w:val="clear" w:fill="E2E8F0"/>' : '';
        return `<w:r><w:rPr>${part.bold ? '<w:b/>' : ''}${part.underline ? '<w:u w:val="single"/>' : ''}<w:sz w:val="${part.size * 2}"/>${background}</w:rPr>${runText(part.text)}</w:r>`;
      }).join('');
      const p = data.paragraphs?.find(p => p.start <= offset && p.end >= offset);
      if (sourceLayout && p) {
        const ind = p.firstLine < 0 ? `w:hanging="${Math.round(-p.firstLine * 20)}"` : `w:firstLine="${Math.round(p.firstLine * 20)}"`;
        content.push(`<w:p><w:pPr><w:jc w:val="${p.align === 'justify' ? 'both' : p.align}"/><w:ind w:left="${Math.round(p.indent * 20)}" ${ind}/><w:spacing w:before="${Math.round(p.before * 20)}" w:after="${Math.round(p.after * 20)}" w:line="${Math.round(p.line * 240)}" w:lineRule="auto"/></w:pPr>${formatted || '<w:r><w:t></w:t></w:r>'}</w:p>`);
      } else content.push(paragraph(formatted));
      offset += line.length + 1;
    }
  }
  let offset = 0;
  const placements = [...(data.images ?? [])].sort((left, right) => left.after - right.after);
  for (const [index, image] of placements.entries()) {
    if (image.after > offset) addText(offset, image.after);
    offset = image.after;
    const bytes = images[image.fileId];
    if (!bytes) throw Error('No se pudo incorporar una imagen al Word.');
    const id = index + 2, target = `media/imagen-${id}.png`;
    zip.file(`word/${target}`, bytes);
    links.push([`rIdImage${id}`, 'image', target]);
    const height = image.keepRatio === false && image.height ? image.height : image.width * aspect(bytes);
    const scale = Math.min(1, 220 / height);
    content.push(paragraph(imageRun(id, image.width * scale, height * scale), image.align));
    if (image.caption) content.push(paragraph(run(image.caption), image.align));
  }
  if (offset < data.text.length) addText(offset, data.text.length);

  zip.file('[Content_Types].xml', `${xml}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Default Extension="xml" ContentType="application/xml"/>
    <Default Extension="png" ContentType="image/png"/>
    ${Object.entries({ document: 'document.main', ...(!plain ? { header1: 'header', footer1: 'footer' } : {}), styles: 'styles' }).map(([name, type]) =>
      `<Override PartName="/word/${name}.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.${type}+xml"/>`).join('')}
    </Types>`);
  zip.file('_rels/.rels', relationships([['rId1', 'officeDocument', 'word/document.xml']]));
  zip.file('word/_rels/document.xml.rels', relationships(links));
  zip.file('word/styles.xml', `${xml}<w:styles xmlns:w="${word}"><w:docDefaults><w:rPrDefault><w:rPr>
    <w:rFonts w:ascii="${sourceLayout ? 'Calibri' : 'Times New Roman'}" w:hAnsi="${sourceLayout ? 'Calibri' : 'Times New Roman'}"/><w:sz w:val="${sourceLayout ? 22 : 23}"/>
    </w:rPr></w:rPrDefault></w:docDefaults></w:styles>`);
  zip.file('word/document.xml', `${xml}<w:document ${namespaces}><w:body>${content.join('')}<w:sectPr>
    ${plain ? '' : '<w:headerReference w:type="default" r:id="rIdHeader"/><w:footerReference w:type="default" r:id="rIdFooter"/>'}
    <w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="2400" w:right="1360" w:bottom="2000" w:left="1360" w:header="500" w:footer="500" w:gutter="0"/>
    </w:sectPr></w:body></w:document>`);
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}
