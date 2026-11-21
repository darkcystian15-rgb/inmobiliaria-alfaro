'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { updateMinuteText, type MinuteDocument, type MinuteHighlight, type MinuteTextStyle } from '@/lib/minute-document';
import { formatMinuteRange, minuteRuns, minuteParagraphs, MINUTE_FONT_SIZES } from '@/lib/minute-format.mjs';

const WORD_FONTS = ['Arial', 'Calibri', 'Cambria', 'Courier New', 'Georgia', 'Tahoma', 'Times New Roman', 'Verdana'];
type Selection = { start: number; end: number };
type Content = Pick<MinuteDocument, 'text' | 'formats' | 'highlights' | 'images' | 'paragraphs' | 'layout'>;
const contentOf = (data: MinuteDocument): Content => ({ text: data.text, formats: data.formats, highlights: data.highlights, images: data.images, paragraphs: data.paragraphs, layout: data.layout });
function plainText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
  if (node instanceof HTMLElement && node.dataset.minuteTail !== undefined) return '';
  if (node.nodeName === 'BR') return '\n';
  let result = '';
  for (const child of node.childNodes) {
    if (['DIV', 'P'].includes(child.nodeName) && result && !result.endsWith('\n')) result += '\n';
    result += plainText(child);
    if (['DIV', 'P'].includes(child.nodeName) && child.nextSibling && !result.endsWith('\n')) result += '\n';
  }
  return result;
}
function restoreSelection(root: HTMLElement, selection: Selection) {
  const nodes: Text[] = [], walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  function point(offset: number): [Node, number] {
    const lastParagraph = root.querySelector('[data-minute-paragraph]:last-of-type');
    if (lastParagraph && offset === plainText(root).length) return [lastParagraph, lastParagraph.childNodes.length - (lastParagraph.lastChild?.nodeName === 'BR' ? 1 : 0)];
    for (const node of nodes) { if (offset <= node.length) return [node, offset]; offset -= node.length; }
    return nodes.length ? [nodes[nodes.length - 1], nodes[nodes.length - 1].length] : [root, 0];
  }
  const range = document.createRange(); range.setStart(...point(selection.start)); range.setEnd(...point(selection.end));
  const selected = window.getSelection(); selected?.removeAllRanges(); selected?.addRange(range);
}
export default function MinuteContentEditor({ data, onChange, label = 'Contenido de la estructura de minuta', disabled = false, word = false }: { word?: boolean; data: MinuteDocument; label?: string; disabled?: boolean; onChange: (data: MinuteDocument) => void }) {
  const editor = useRef<HTMLDivElement>(null), selection = useRef<Selection>({ start: 0, end: 0 });
  const composing = useRef(false), expected = useRef('');
  const history = useRef<{ past: Content[]; future: Content[] }>({ past: [], future: [] });
  const [selected, setSelected] = useState<Selection>({ start: 0, end: 0 });
  const [size, setSize] = useState('11.5'), [notice, setNotice] = useState(''), [revision, setRevision] = useState(0);
  const textLimit = word ? Math.max(100000, data.text.length) : 20000;
  const formatLimit = word ? 10000 : 200;
  const signature = JSON.stringify(contentOf(data));
  useLayoutEffect(() => {
    const root = editor.current; if (!root || composing.current) return;
    if (expected.current !== signature) history.current = { past: [], future: [] };
    expected.current = signature;
    const focused = document.activeElement === root;
    const fragment = document.createDocumentFragment();
    function appendRuns(parent: Node, start: number, end: number) {
      for (const run of minuteRuns(data, start, end)) {
        const span = document.createElement('span'); span.textContent = run.text;
        span.dataset.minuteFormat = '';
        span.style.fontWeight = run.bold ? '700' : '400'; span.style.fontSize = word ? `${run.size}pt` : `${run.size * 16 / 11.5}px`;
        if (run.italic) span.style.fontStyle = 'italic';
        if (run.font) span.style.fontFamily = run.font;
        if (run.color) span.style.color = run.color;
        span.style.textDecoration = run.underline ? 'underline' : 'none';
        if (run.background) span.className = run.background === 'highlight' ? 'bg-yellow-200' : 'bg-slate-200';
        parent.appendChild(span);
      }
    }
    if (data.layout === 'word-model') {
      for (const p of minuteParagraphs(data)) {
        const row = document.createElement('span'); row.dataset.minuteParagraph = ''; 
        row.style.cssText = `display:block;text-align:${p.align};margin-left:${p.indent}pt;text-indent:${p.firstLine}pt;margin-top:${p.before}pt;margin-bottom:${p.after}pt;line-height:${p.line};min-height:${11 * p.line}pt`;
        appendRuns(row, p.start, p.end);
        if (!p.text) { const empty = document.createElement('br'); empty.dataset.minuteTail = ''; row.append(empty); }
        if (p.end < data.text.length) { const newline = document.createElement('span'); newline.textContent = '\n'; newline.style.whiteSpace = 'pre-line'; row.append(newline); }
        fragment.append(row);
      }
    } else appendRuns(fragment, 0, data.text.length);
    const tail = document.createElement('br'); tail.dataset.minuteTail = ''; fragment.append(tail);
    root.replaceChildren(fragment);
    if (focused) restoreSelection(root, { start: Math.min(selection.current.start, data.text.length), end: Math.min(selection.current.end, data.text.length) });
  }, [signature, revision, data, word]);
  function capture() {
    const root = editor.current, current = window.getSelection();
    if (!root || !current?.rangeCount || !root.contains(current.anchorNode) || !root.contains(current.focusNode)) return selection.current;
    const range = current.getRangeAt(0), prefix = document.createRange(); prefix.selectNodeContents(root); prefix.setEnd(range.startContainer, range.startOffset);
    const start = plainText(prefix.cloneContents()).length;
    prefix.setEnd(range.endContainer, range.endOffset);
    const end = plainText(prefix.cloneContents()).length;
    const next = { start: Math.min(start, data.text.length), end: Math.min(end, data.text.length) };
    selection.current = next; setSelected(previous => previous.start === next.start && previous.end === next.end ? previous : next);
    return next;
  }
  useEffect(() => {
    const captureCurrent = () => { capture(); };
    document.addEventListener('selectionchange', captureCurrent);
    return () => document.removeEventListener('selectionchange', captureCurrent);
  });
  function commit(next: MinuteDocument) {
    history.current.past.push(contentOf(data)); history.current.past = history.current.past.slice(-50); history.current.future = [];
    expected.current = JSON.stringify(contentOf(next)); onChange(next);
  }
  function apply(action: MinuteHighlight['style'] | keyof MinuteTextStyle | 'clear', value?: string | number) {
    if (disabled) return;
    const { start, end } = selection.current;
    if (start === end || start < 0 || end > data.text.length) { setNotice('Selecciona el texto que deseas cambiar.'); editor.current?.focus(); return; }
    try {
      let next = data;
      if (action === 'bold' || action === 'underline' || action === 'italic') {
        next = formatMinuteRange(data, start, end, { [action]: !minuteRuns(data, start, end).every(run => run[action]) }, formatLimit);
      }
      if (action === 'size') next = formatMinuteRange(data, start, end, { size: Number(value ?? size) }, formatLimit);
      if (action === 'font' || action === 'color') next = formatMinuteRange(data, start, end, { [action]: String(value) }, formatLimit);
      if (action === 'clear') next = formatMinuteRange(data, start, end, null, formatLimit);
      if (['highlight', 'shade', 'clear'].includes(action)) {
        const highlights = (data.highlights || []).flatMap(mark => mark.end <= start || mark.start >= end ? [mark] : [...(mark.start < start ? [{ ...mark, end: start }] : []), ...(mark.end > end ? [{ ...mark, start: end }] : [])]);
        if (action === 'highlight' || action === 'shade') highlights.push({ start, end, style: action });
        highlights.sort((a, b) => a.start - b.start);
        if (highlights.length > formatLimit) throw Error(`El documento admite hasta ${formatLimit} resaltados.`);
        next = { ...next, highlights };
      }
      commit(next); setNotice('');
      editor.current?.focus(); if (editor.current) restoreSelection(editor.current, selection.current);
    } catch (error) { setNotice(error instanceof Error ? error.message : 'No se pudo aplicar el formato.'); }
  }
  function input() {
    if (composing.current || disabled || !editor.current) return;
    const text = plainText(editor.current).replace(/\r\n?/g, '\n');
    if (text.length > textLimit) { setNotice(`El contenido admite hasta ${textLimit.toLocaleString('es-PE')} caracteres. El último cambio no se incorporó.`); setRevision(value => value + 1); return; }
    const current = window.getSelection();
    if (current?.rangeCount && editor.current.contains(current.anchorNode)) {
      const range = current.getRangeAt(0), prefix = document.createRange(); prefix.selectNodeContents(editor.current); prefix.setEnd(range.endContainer, range.endOffset);
      const offset = plainText(prefix.cloneContents()).length; selection.current = { start: offset, end: offset };
    }
    commit(updateMinuteText(data, text, word));
  }
  function insert(text: string) {
    if (disabled) return;
    capture(); const { start, end } = selection.current;
    const nextText = data.text.slice(0, start) + text + data.text.slice(end);
    if (nextText.length > textLimit) { setNotice(`El contenido admite hasta ${textLimit.toLocaleString('es-PE')} caracteres. El texto pegado no se incorporó.`); return; }
    selection.current = { start: start + text.length, end: start + text.length }; setSelected(selection.current);
    commit(updateMinuteText(data, nextText, word));
  }
  function undo(redo = false) {
    const source = redo ? history.current.future : history.current.past, target = redo ? history.current.past : history.current.future;
    const next = source.pop(); if (!next) return;
    target.push(contentOf(data)); expected.current = JSON.stringify(next); onChange({ ...data, ...next });
    selection.current = { start: Math.min(selection.current.start, next.text.length), end: Math.min(selection.current.end, next.text.length) };
  }
  const selectedRuns = selected.end > selected.start ? minuteRuns(data, selected.start, selected.end) : [];
  const bold = selectedRuns.length > 0 && selectedRuns.every(run => run.bold);
  const underline = selectedRuns.length > 0 && selectedRuns.every(run => run.underline);
  const selectedSizes = [...new Set(selectedRuns.map(run => run.size))];
  const italic = selectedRuns.length > 0 && selectedRuns.every(run => run.italic);
  const fonts = [...new Set(selectedRuns.map(run => run.font))];
  const currentFont = fonts.length === 1 ? fonts[0] ?? '' : '';
  const colors = [...new Set(selectedRuns.map(run => run.color))];
  const currentColor = colors.length === 1 ? colors[0] ?? '#000000' : '#000000';
  const displayedSize = selectedSizes.length > 1 ? '' : selectedSizes.length ? String(selectedSizes[0]) : size;
  return <section className="space-y-2">
    <div className="flex items-center justify-between gap-3"><label id="minute-content-label" className="text-sm font-semibold">Contenido</label><details className="max-w-[85%]"><summary className="min-h-8 cursor-pointer text-right text-xs font-semibold text-slate-500">Ayuda de edición</summary><div id="minute-format-help" className="py-2 text-xs leading-5 text-slate-600">{word
      ? 'Selecciona texto para cambiar su formato. Los cambios se guardan en el Word. Usa Ctrl/Cmd+Z para deshacer.'
      : 'Selecciona texto para aplicar negrita, subrayado, tamaño, amarillo o gris. Los formatos se pueden combinar y se conservan en el PDF. Al reescribir un fragmento, vuelve a aplicar su formato. Usa Ctrl/Cmd+B para negrita y Ctrl/Cmd+Z para deshacer.'}</div></details></div>
    <div role="toolbar" aria-label="Formato del contenido" className="sticky top-0 z-20 flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
      <button type="button" disabled={disabled} aria-label="Negrita" title="Negrita (Ctrl/Cmd+B)" aria-pressed={bold} onMouseDown={event => event.preventDefault()} onClick={() => apply('bold')} className={`flex min-h-11 min-w-11 items-center justify-center rounded-md border text-base font-bold disabled:opacity-50 ${bold ? 'border-red-200 bg-red-50 text-red-800' : 'border-slate-200 bg-white text-slate-900'}`}>N</button>
      <button type="button" disabled={disabled} aria-label="Subrayado" title="Subrayado (Ctrl/Cmd+U)" aria-pressed={underline} onMouseDown={event => event.preventDefault()} onClick={() => apply('underline')} className={`flex min-h-11 min-w-11 items-center justify-center rounded-md border text-base underline disabled:opacity-50 ${underline ? 'border-red-200 bg-red-50 text-red-800' : 'border-slate-200 bg-white text-slate-900'}`}>S</button>
      {word && <>
        <button type="button" disabled={disabled} aria-label="Cursiva" title="Cursiva (Ctrl/Cmd+I)" aria-pressed={italic}
          onMouseDown={event => event.preventDefault()} onClick={() => apply('italic')}
          className={`min-h-11 min-w-11 rounded-md border italic disabled:opacity-50 ${italic ? 'border-red-200 bg-red-50 text-red-800' : 'border-slate-200'}`}>C</button>
        <select aria-label="Tipo de letra" title="Tipo de letra" disabled={disabled} value={currentFont}
          onChange={event => apply('font', event.target.value)} className="min-h-11 rounded-md border border-slate-200 bg-white px-2 text-sm disabled:opacity-50">
          <option value="" disabled>Tipo de letra</option>
          {currentFont && !WORD_FONTS.includes(currentFont) && <option value={currentFont}>{currentFont}</option>}
          {WORD_FONTS.map(font => <option key={font} value={font}>{font}</option>)}
        </select>
        <input aria-label="Color de letra" title="Color de letra" type="color" disabled={disabled} value={currentColor}
          onChange={event => apply('color', event.target.value)} className="h-11 w-11 rounded-md border border-slate-200 bg-white p-1 disabled:opacity-50" />
      </>}
      <select aria-label="Tamaño de letra" title="Tamaño de letra en puntos" disabled={disabled} value={displayedSize} onChange={event => { const value = event.target.value; setSize(value); apply('size', Number(value)); }} className="min-h-11 w-20 rounded-md border border-slate-200 bg-white px-2 text-sm disabled:opacity-50"><option value="" disabled>Mixto</option>{[...new Set([...MINUTE_FONT_SIZES, ...(word ? selectedSizes : [])])].sort((a, b) => a - b).map(value => <option key={value} value={value}>{String(value).replace('.', ',')} pt</option>)}</select>
      <button type="button" disabled={disabled} aria-label="Resaltar selección" title="Resaltar en amarillo" onMouseDown={event => event.preventDefault()} onClick={() => apply('highlight')} className="min-h-11 rounded-md border border-yellow-200 bg-yellow-50 px-2.5 text-xs font-semibold text-slate-900 disabled:opacity-50">Resaltar</button>
      <button type="button" disabled={disabled} aria-label="Sombrear selección" title="Sombrear en gris" onMouseDown={event => event.preventDefault()} onClick={() => apply('shade')} className="min-h-11 rounded-md border border-slate-300 bg-slate-100 px-2.5 text-xs font-semibold text-slate-900 disabled:opacity-50">Sombrear</button>
      <button type="button" disabled={disabled} aria-label="Quitar formato de selección" title="Quitar formato de la selección" onMouseDown={event => event.preventDefault()} onClick={() => apply('clear')} className="min-h-11 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 disabled:opacity-50">Limpiar</button>
    </div>
    {notice && <p role="status" className="text-xs text-amber-800">{notice}</p>}
    <div ref={editor} style={data.layout === 'word-model' ? { fontFamily: 'Carlito, Calibri, sans-serif' } : undefined} role="textbox" aria-label={label} aria-multiline="true" aria-readonly={disabled} aria-describedby="minute-format-help" contentEditable={!disabled} suppressContentEditableWarning tabIndex={0} className="min-h-[52vh] w-full whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-white p-3 font-serif text-base font-normal leading-[1.7] text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-100 sm:p-7" onInput={input} onMouseUp={capture} onKeyUp={capture} onTouchEnd={capture} onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; input(); }} onPaste={event => { event.preventDefault(); insert(event.clipboardData.getData('text/plain').replace(/\r\n?/g, '\n')); }} onKeyDown={event => {
      if (disabled || event.nativeEvent.isComposing) return;
      if (event.key === 'Enter') { event.preventDefault(); insert('\n'); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'u') { event.preventDefault(); capture(); apply('underline'); }
      if (word && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'i') { event.preventDefault(); capture(); apply('italic'); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b') { event.preventDefault(); capture(); apply('bold'); }
      if ((event.ctrlKey || event.metaKey) && ['z', 'y'].includes(event.key.toLowerCase())) { event.preventDefault(); undo(event.shiftKey || event.key.toLowerCase() === 'y'); }
    }} />
    <p className="text-right text-xs text-slate-400">{data.text.length.toLocaleString('es-PE')} / {textLimit.toLocaleString('es-PE')}</p>
  </section>;
}
