"use client";

import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';

export default function PdfPreview({ data, name }: { data: Uint8Array; name: string }) {
  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [width, setWidth] = useState(0);
  const [rendering, setRendering] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(entries => {
      const nextWidth = Math.max(1, Math.floor(entries[0].contentRect.width));
      setWidth(current => current === nextWidth ? current : nextWidth);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let loading: ReturnType<typeof import('pdfjs-dist')['getDocument']> | undefined;
    void (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        if (cancelled) return;
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';
        loading = pdfjs.getDocument({ data: data.slice(), cMapUrl: '/pdfjs/cmaps/', cMapPacked: true, standardFontDataUrl: '/pdfjs/standard_fonts/', wasmUrl: '/pdfjs/wasm/' });
        const next = await loading.promise;
        if (!cancelled) { setDocument(next); setPage(1); }
      } catch {
        if (!cancelled) setError('No se pudo leer el PDF. Comprueba que no esté dañado o protegido con contraseña.');
      }
    })();
    return () => { cancelled = true; void loading?.destroy(); };
  }, [data]);

  useEffect(() => {
    if (!document || !width) return;
    let cancelled = false;
    let task: RenderTask | undefined;
    setRendering(true);
    setError('');
    void (async () => {
      try {
        const pdfPage = await document.getPage(page);
        if (cancelled || !canvas.current) return;
        const base = pdfPage.getViewport({ scale: 1 });
        const scale = Math.min(width, 1000) / base.width * zoom;
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = pdfPage.getViewport({ scale: scale * ratio });
        const element = canvas.current;
        element.width = Math.floor(viewport.width);
        element.height = Math.floor(viewport.height);
        element.style.width = `${viewport.width / ratio}px`;
        element.style.height = `${viewport.height / ratio}px`;
        task = pdfPage.render({ canvas: element, viewport });
        await task.promise;
        if (!cancelled) setRendering(false);
      } catch {
        if (!cancelled) { setRendering(false); setError('No se pudo mostrar esta página del PDF.'); }
      }
    })();
    return () => { cancelled = true; task?.cancel(); };
  }, [document, page, zoom, width]);

  return <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-2" aria-label="Controles del PDF">
      <button type="button" className="aa-button aa-button-secondary" disabled={!document || page === 1} onClick={() => setPage(current => current - 1)}>Anterior</button>
      <span className="text-sm" aria-live="polite">Página {page} de {document?.numPages || '…'}</span>
      <button type="button" className="aa-button aa-button-secondary" disabled={!document || page === document.numPages} onClick={() => setPage(current => current + 1)}>Siguiente</button>
      <label className="text-sm">Zoom <select className="rounded-lg border p-2" value={zoom} onChange={event => setZoom(Number(event.target.value))}>{[0.75, 1, 1.25, 1.5, 2].map(value => <option key={value} value={value}>{value === 1 ? 'Ajustar al ancho' : `${value * 100}%`}</option>)}</select></label>
    </div>
    <div className="min-h-6 text-sm" aria-live="polite">
      {error ? <p role="alert" className="text-red-800">{error}</p> : rendering ? <p role="status" className="text-slate-600">Mostrando página del PDF…</p> : null}
    </div>
    <div ref={container} className="h-[65vh] min-w-0 overflow-auto rounded-xl border bg-slate-100 p-3 [scrollbar-gutter:stable]" aria-busy={rendering && !error}>
      <canvas ref={canvas} role="img" aria-label={`${name}, página ${page}`} className="mx-auto block max-w-none bg-white shadow" />
    </div>
  </div>;
}
