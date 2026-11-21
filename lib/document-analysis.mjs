// Node-only document reader. Documents and OCR stay on the application server.
import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { needsDocumentOcr, reviewPage, reviewWorkbook } from './document-review.mjs';
import { registryHeader } from './intermediation.mjs';

// Webpack freezes import.meta.url to the build machine's path. Resolve assets
// from the deployed application's cwd instead, where traced node_modules live.
const require = createRequire(`${process.cwd()}/package.json`);
export const DOCUMENT_BATCH_PAGES = 4;
export const MAX_DOCUMENT_BYTES = 12 * 1024 * 1024;
export const SUPPORTED_DOCUMENT_MIMES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/png', 'image/jpeg'];
let pdfRuntime;
async function loadPdfRuntime() {
  if (!pdfRuntime) pdfRuntime = (async () => {
    const canvas = await import('@napi-rs/canvas');
    Object.assign(globalThis, { DOMMatrix: canvas.DOMMatrix, Path2D: canvas.Path2D, ImageData: canvas.ImageData });
    const unpdf = await import('unpdf');
    await unpdf.definePDFJSModule(() => import('pdfjs-dist/legacy/build/pdf.mjs'));
    return unpdf;
  })();
  return pdfRuntime;
}

async function rereadRegistryLine(worker, input, { x0, y0, x1, y1 }) {
  const { default: sharp } = await import('sharp');
  const { PSM } = await import('tesseract.js');
  const line = sharp(input);
  const { width, height } = await line.metadata();
  const left = Math.max(0, x0 - 4);
  const top = Math.max(0, y0 - 3);
  const cropWidth = Math.min(width, x1 + 4) - left;
  const cropHeight = Math.min(height, y1 + 3) - top;
  const enlarged = await line.extract({ left, top, width: cropWidth, height: cropHeight })
    .resize({ height: cropHeight * 3 }).extend({ top: 10, bottom: 10, left: 10, right: 10, background: '#ffffff' })
    .png().toBuffer();
  const { data } = await worker.recognize(enlarged, {
    tessedit_pageseg_mode: PSM.SINGLE_LINE, tessedit_char_whitelist: 'P0123456789',
  });
  const number = data.text.trim();
  return /^P\d{8}$/.test(number) ? number : null;
}

export async function analyzeDocument(bytes, mime, startPage = 1, { forceOcr = false, includeText = false, refineRegistryHeader = false } = {}) {
  if (!SUPPORTED_DOCUMENT_MIMES.includes(mime)) throw new Error('Formato no compatible. Se admiten PDF, Excel XLSX, JPG y PNG.');
  if (bytes.byteLength > MAX_DOCUMENT_BYTES) throw new Error('La lectura admite hasta 12 MB por documento.');
  if (!Number.isSafeInteger(startPage) || startPage < 1) throw new Error('Página no válida.');
  if (mime.includes('spreadsheet')) {
    if (startPage !== 1) throw new Error('Página no válida para Excel.');
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error('El archivo no es un Excel XLSX válido.');
    const { default: ExcelJS } = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(bytes));
    return { ...reviewWorkbook(workbook), totalPages: 1, nextPage: null, pages: [] };
  }
  let pdf, worker;
  async function ocr(image) {
    if (!worker) {
      const { createWorker } = await import('tesseract.js');
      worker = await createWorker('spa', 1, {
        langPath: require('@tesseract.js-data/spa').langPath,
        workerPath: require.resolve('tesseract.js/src/worker-script/node/index.js'),
        corePath: dirname(require.resolve('tesseract.js-core/package.json')),
        cachePath: tmpdir(),
      });
    }
    const input = Buffer.from(image);
    const { data } = await worker.recognize(input, { rotateAuto: true }, { blocks: refineRegistryHeader });
    if (refineRegistryHeader && data.blocks?.length && !data.rotateRadians) {
      const lines = data.blocks.flatMap(block => block.paragraphs.flatMap(paragraph => paragraph.lines));
      const headers = [...data.text.matchAll(registryHeader)];
      for (const header of headers.reverse()) {
        const matches = lines.filter(line => line.text.trim() === header[1]);
        if (matches.length !== 1) continue;
        const refined = await rereadRegistryLine(worker, input, matches[0].bbox).catch(() => null);
        if (!refined) continue;
        const offset = header.index + header[0].indexOf(header[1]);
        data.text = data.text.slice(0, offset) + refined + data.text.slice(offset + header[1].length);
      }
    }
    return { text: data.text, confidence: data.confidence };
  }
  const proposals = [], warnings = [], pages = [];
  try {
    if (mime !== 'application/pdf') {
      if (startPage !== 1) throw new Error('Página no válida para imagen.');
      const sharp = (await import('sharp')).default;
      const image = await sharp(bytes, { limitInputPixels: 25000000 }).rotate().resize({ width: 2500, withoutEnlargement: true }).png().toBuffer();
      const result = await ocr(image);
      const review = reviewPage(result.text, { page: 1, method: 'ocr', confidence: result.confidence });
      return { proposals: review.proposals, warnings: review.warnings, totalPages: 1, nextPage: null, ...(includeText ? { text: result.text.slice(0, 12000) } : {}), pages: [{ page: 1, method: 'ocr', confidence: result.confidence, chars: result.text.trim().length }] };
    }
    if (Buffer.from(bytes).subarray(0, 5).toString() !== '%PDF-') throw new Error('El archivo no contiene un PDF válido.');
    const runtime = await loadPdfRuntime();
    pdf = await runtime.getDocumentProxy(new Uint8Array(bytes), { isEvalSupported: false, useSystemFonts: true, maxImageSize: 25000000 });
    if (pdf.numPages > 150) throw new Error('La lectura admite hasta 150 páginas por documento.');
    if (startPage > pdf.numPages) throw new Error('Página fuera del documento.');
    const last = Math.min(pdf.numPages, startPage + DOCUMENT_BATCH_PAGES - 1);
    for (let number = startPage; number <= last; number++) {
      try {
        const page = await pdf.getPage(number);
        const content = await page.getTextContent();
        let text = content.items.map(part => 'str' in part ? `${part.str}${part.hasEOL ? '\n' : ' '}` : '').join('').slice(0, 100000);
        const viewport = page.getViewport({ scale: 1 });
        const renderScale = Math.min(2.5, Math.sqrt(12000000 / Math.max(1, viewport.width * viewport.height)));
        page.cleanup();
        const nativeReview = forceOcr ? reviewPage(text, { page: number, method: 'native' }) : null;
        let method = 'native', confidence = null;
        if (forceOcr || needsDocumentOcr(text)) {
          const png = await runtime.renderPageAsImage(pdf, number, { canvasImport: () => import('@napi-rs/canvas'), scale: renderScale });
          const result = await ocr(new Uint8Array(png));
          text = result.text.slice(0, 100000); confidence = result.confidence; method = 'ocr';
        }
        const review = reviewPage(text, { page: number, method, confidence });
        const nativeProposals = nativeReview?.proposals || [];
        proposals.push(...nativeProposals, ...review.proposals.filter(item => !nativeProposals.some(native => native.field === item.field && native.value === item.value)));
        warnings.push(...review.warnings.map(warning => `Página ${number}: ${warning}`));
        pages.push({ page: number, method, confidence, chars: text.trim().length, ...(includeText ? { text: text.slice(0, 6000) } : {}) });
      } catch {
        warnings.push(`Página ${number}: no se pudo analizar; revisa el original.`);
        pages.push({ page: number, method: 'error', confidence: null, chars: 0 });
      }
    }
    return { proposals, warnings, totalPages: pdf.numPages, nextPage: last < pdf.numPages ? last + 1 : null, pages, ...(includeText ? { text: pages.map(p => `Página ${p.page}: ${p.text || ''}`).join('\n').slice(0, 12000) } : {}) };
  } finally {
    if (worker) await worker.terminate();
    if (pdf) await pdf.destroy();
  }
}
