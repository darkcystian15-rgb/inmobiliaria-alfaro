"use client";

import { useEffect, useRef, useState } from 'react';
import JSZip from 'jszip';
import { editWordLines, type WordEditorLine } from '@/lib/word-editor-lines';
import { readWordContent, WORD_NS, writeWordRunFormats } from '@/lib/word-contract-format';
import type { MinuteDocument } from '@/lib/minute-document';
import MinuteContentEditor from './MinuteContentEditor';
const WORD_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const BODY = 'word/document.xml';

function paragraphs(document: Document) {
  return Array.from(document.getElementsByTagNameNS(WORD_NS, 'p'))
    .map(paragraph => ({ paragraph, runs: Array.from(paragraph.getElementsByTagNameNS(WORD_NS, 't'))
      .filter(node => {
        let parent = node.parentElement;
        while (parent && (parent.localName !== 'p' || parent.namespaceURI !== WORD_NS)) parent = parent.parentElement;
        return parent === paragraph;
      }) }))
    .filter(({ runs }) => runs.length > 0);
}

// Keep runs before and after the changed text so their original formatting survives.
function updateParagraph(runs: Element[], original: string, value: string) {
  if (original === value) return;
  let start = 0;
  while (start < original.length && start < value.length && original[start] === value[start]) start++;
  let end = original.length;
  let valueEnd = value.length;
  while (end > start && valueEnd > start && original[end - 1] === value[valueEnd - 1]) {
    end--;
    valueEnd--;
  }
  let offset = 0;
  let inserted = false;
  for (const run of runs) {
    const text = run.textContent || '';
    const next = offset + text.length;
    if (next >= start && offset <= end) {
      const before = text.slice(0, Math.max(0, start - offset));
      const after = text.slice(Math.max(0, end - offset));
      run.textContent = before + (inserted ? '' : value.slice(start, valueEnd)) + after;
      run.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:space', 'preserve');
      inserted = true;
    }
    offset = next;
  }
}

function updateDocument(document: Document, originals: string[], lines: WordEditorLine[], content: MinuteDocument) {
  const entries = paragraphs(document);
  const retained = new Set<number>();
  let anchor: Element | undefined;
  let offset = 0;
  for (const line of lines) {
    const start = offset;
    offset += line.text.length + 1;
    if (line.paragraph !== undefined) {
      const entry = entries[line.paragraph];
      retained.add(line.paragraph);
      updateParagraph(entry.runs, originals[line.paragraph], line.text);
      writeWordRunFormats(entry.runs, content, start);
      anchor = entry.paragraph;
      continue;
    }
    const paragraph = document.createElementNS(WORD_NS, 'w:p');
    const run = document.createElementNS(WORD_NS, 'w:r');
    const text = document.createElementNS(WORD_NS, 'w:t');
    text.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:space', 'preserve');
    text.textContent = line.text;
    run.append(text);
    paragraph.append(run);
    if (anchor) anchor.after(paragraph);
    else entries[0].paragraph.before(paragraph);
    writeWordRunFormats([text], content, start);
    anchor = paragraph;
  }

  entries.forEach(({ paragraph, runs }, index) => {
    if (retained.has(index)) return;
    const structuralContent = Array.from(paragraph.getElementsByTagNameNS(WORD_NS, '*'))
      .some(node => ['drawing', 'pict', 'object', 'sectPr', 'fldChar', 'instrText', 'bookmarkStart', 'bookmarkEnd'].includes(node.localName));
    const parent = paragraph.parentElement;
    const onlyCellParagraph = parent?.localName === 'tc' && !Array.from(parent.children)
      .some(child => child !== paragraph && child.localName === 'p');
    if (structuralContent || onlyCellParagraph) updateParagraph(runs, originals[index], '');
    else paragraph.remove();
  });
}

export default function LetterEditor({ source, name, contract = false, uploadReady, onClose, onPending, onAttach, onSave }: {
  source: string; name: string; contract?: boolean; uploadReady: boolean; onClose: () => void;
  onPending: (pending: boolean) => void; onAttach: (file: File) => void; onSave?: (file: File) => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const model = useRef<{ zip: JSZip; xml: string } | null>(null);
  const [originals, setOriginals] = useState<string[]>([]);
  const [values, setValues] = useState<string[]>([]);
  const [filename, setFilename] = useState(name.slice(0, 250));
  const [savedFilename, setSavedFilename] = useState(name.slice(0, 250));
  const [savedText, setSavedText] = useState('');
  const [lines, setLines] = useState<WordEditorLine[]>([]);
  const [content, setContent] = useState<MinuteDocument | null>(null);
  const sourceSignature = useRef('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const isDraft = Boolean(onSave);
  const text = contract ? content ? JSON.stringify(content) : '' : values.join('\n');
  const dirty = filename !== savedFilename || text !== savedText;

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  useEffect(() => { onPending(dirty); }, [dirty, onPending]);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(source, { signal: controller.signal });
        if (!response.ok) throw Error();
        const zip = await JSZip.loadAsync(await response.arrayBuffer());
        const xml = await zip.file(BODY)?.async('string');
        if (!xml) throw Error();
        const document = new DOMParser().parseFromString(xml, 'application/xml');
        const entries = paragraphs(document);
        const originals = entries.map(({ runs }) => runs.map(run => run.textContent).join(''));
        if (!originals.length) throw Error();
        if (controller.signal.aborted) return;
        model.current = { zip, xml };
        const encoded = response.headers.get('Content-Disposition')?.match(/filename\*=UTF-8''(.+)$/i)?.[1];
        if (isDraft && encoded) {
          const loadedName = decodeURIComponent(encoded).replace(/\.docx$/i, '').slice(0, 250);
          setFilename(loadedName);
          setSavedFilename(loadedName);
        }
        setOriginals(originals);
        setValues(originals);
        setLines(originals.map((text, paragraph) => ({ text, paragraph })));
        if (contract) {
          const loaded = readWordContent(entries.map(entry => entry.runs), 'Contrato de intermediación');
          const signature = JSON.stringify(loaded);
          sourceSignature.current = signature;
          setContent(loaded);
          setSavedText(signature);
        } else setSavedText(originals.join('\n'));
      } catch {
        if (!controller.signal.aborted) setError(contract ? 'No se pudo abrir el contrato en formato Word.' : 'No se pudo abrir la carta en formato Word.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [source, contract, isDraft]);

  function close() {
    if (!busy && (!dirty || window.confirm(isDraft ? '¿Cerrar y descartar los cambios sin guardar?' : contract ? '¿Cerrar el contrato y descartar los cambios sin adjuntar?' : '¿Cerrar la carta y descartar los cambios sin adjuntar?'))) onClose();
  }

  async function exportWord(action: 'attach' | 'download' | 'save') {
    if (!model.current || !filename.trim() || busy) return;
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      const { zip, xml } = model.current;
      const document = new DOMParser().parseFromString(xml, 'application/xml');
      if (contract ? text !== sourceSignature.current : text !== originals.join('\n')) {
        if (contract && content) updateDocument(document, originals, lines, content);
        else paragraphs(document).forEach(({ runs }, index) => updateParagraph(runs, originals[index], values[index]));
        zip.file(BODY, new XMLSerializer().serializeToString(document));
      }
      const blob = await zip.generateAsync({ type: 'blob', mimeType: WORD_MIME, compression: 'DEFLATE' });
      const file = new File([blob], filename.trim().replace(/\.docx$/i, '') + '.docx', { type: WORD_MIME });
      if (action === 'save' && onSave) {
        await onSave(file);
        setSavedText(text);
        setSavedFilename(filename);
        setSaved(true);
      } else if (action === 'attach') {
        onAttach(file);
      } else {
        const url = URL.createObjectURL(file);
        const link = window.document.createElement('a');
        link.href = url;
        link.download = file.name;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (cause) {
      setError(action === 'save' && cause instanceof Error ? cause.message : 'No se pudo preparar el archivo Word. Reintenta.');
    } finally {
      model.current?.zip.file(BODY, model.current.xml);
      setBusy(false);
    }
  }

  return (
    <dialog ref={dialog} aria-labelledby="letter-title" onCancel={event => { event.preventDefault(); close(); }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 shadow-xl backdrop:bg-slate-950/40">
      <header className={`flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white p-4 ${contract ? '' : 'sticky top-0 z-10'}`}>
        <h2 id="letter-title" className="font-bold">{contract ? 'Editar contrato de intermediación' : 'Editar carta de propuesta'}</h2>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="aa-button aa-button-secondary" disabled={busy} onClick={close}>Cerrar</button>
          <button type="button" className="aa-button aa-button-secondary" disabled={!values.length || busy || !filename.trim()} onClick={() => void exportWord('download')}>{isDraft ? 'Descargar borrador' : 'Descargar Word'}</button>
          {isDraft && <button type="button" className="aa-button aa-button-primary" disabled={!values.length || busy || !filename.trim() || (saved && !dirty)}
            onClick={() => void exportWord('save')}>Guardar borrador</button>}
          <button type="button" className="aa-button aa-button-primary" disabled={!values.length || busy || !filename.trim() || !uploadReady} onClick={() => void exportWord('attach')}>Preparar para adjuntar</button>
        </div>
      </header>
      <div className={`mx-auto space-y-3 bg-white p-4 sm:p-8 ${contract ? '' : 'max-w-3xl'}`}>
        {loading && <p role="status">{contract ? 'Cargando contrato…' : 'Cargando modelo…'}</p>}
        {saved && !dirty && <p role="status">Borrador guardado.</p>}
        {error && <p role="alert" className="text-red-700">{error}</p>}
        {values.length > 0 && <fieldset disabled={busy} className="space-y-2">
          <label className="block pb-3 text-sm font-semibold">Nombre del archivo
            <input value={filename} onChange={event => setFilename(event.target.value)} maxLength={250} className="mt-1 block w-full rounded border border-slate-300 p-2 font-normal" />
          </label>
          {contract && content ? <MinuteContentEditor word data={content} disabled={busy} label="Texto completo del contrato"
            onChange={next => {
              setLines(previous => editWordLines(previous, next.text));
              setContent(next);
            }} /> : <>
          <p className="pb-2 text-sm text-slate-600">Revisa los datos del destinatario y del inmueble antes de usar el modelo.</p>
          {values.map((value, index) => <textarea key={index} value={value} aria-label={`Párrafo ${index + 1}`}
            onChange={event => {
              const text = event.target.value.replace(/[\r\n]+/g, ' ');
              setValues(previous => previous.map((entry, i) => i === index ? text : entry));
            }}
            rows={Math.max(1, Math.ceil(value.length / 80))}
            className="block w-full resize-y rounded border border-slate-200 p-2 font-serif text-base leading-relaxed focus:border-red-400" />)}
          </>}
        </fieldset>}
      </div>
    </dialog>
  );
}
