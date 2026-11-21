import WordExtractor from 'word-extractor';

export async function extractMinuteWord(bytes: Buffer) {
  const zip = bytes[0] === 0x50 && bytes[1] === 0x4b;
  const ole = bytes.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
  if (!zip && !ole) throw Error('El archivo no es un Word DOC o DOCX legible. Abre el original en Word y guárdalo como DOCX.');
  let document;
  try { document = await new WordExtractor().extract(bytes); } catch { throw Error('No se pudo leer este Word. Comprueba que no esté dañado o protegido con contraseña.'); }
  const clean = (text: string) => text.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim();
  const additional = [document.getFootnotes(), document.getEndnotes(), document.getTextboxes({ includeHeadersAndFooters: false })].map(clean).filter(Boolean);
  const text = [clean(document.getBody()), ...additional].filter(Boolean).join('\n\n');
  if (!text) throw Error('No se encontró texto editable. Si el Word contiene solo imágenes, copia el contenido manualmente.');
  if (text.length > 20000) throw Error('El documento supera los 20 000 caracteres del editor de prueba. Copia el contenido por partes desde el original.');
  const header = clean(document.getHeaders({ includeFooters: false })).replace(/\s+/g, ' ');
  const footer = clean(document.getFooters()).replace(/\s+/g, ' ');
  if (header.length > 300 || footer.length > 300) throw Error('El encabezado o pie original supera los 300 caracteres. Simplifícalo en una copia del Word antes de extraer.');
  return { text, header, footer, warnings: ['Revisa el contenido con el original: se extrae texto, sin conservar tablas, imágenes ni estilos de Word.', ...(additional.length ? ['Las notas y los cuadros de texto se incorporaron al final del contenido.'] : [])] };
}
