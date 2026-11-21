"use client";
import { useEffect, useRef, useState } from 'react';
import PdfPreview from './PdfPreview';
export type ViewableFile = { nombre: string; nombreOriginal?: string | null; enlace: string; tipoMime: string | null; almacenamiento: string };

export default function FileViewer({ file, onClose }: { file: ViewableFile; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [preview, setPreview] = useState<{ url?: string; html?: string; pdfData?: Uint8Array; error?: string }>({});
  const image = ['image/jpeg', 'image/png', 'image/webp'].includes(file.tipoMime || '');
  const pdf = file.tipoMime === 'application/pdf' || /\.pdf$/i.test(file.nombreOriginal || file.nombre);
  const word = file.tipoMime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || /\.docx$/i.test(file.nombreOriginal || file.nombre);
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  useEffect(() => {
    if (!image && !pdf && !word) return;
    const controller = new AbortController();
    setPreview({});
    let objectUrl: string | undefined;
    void (async () => {
      try {
        const response = await fetch(file.enlace, { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw Error('No se pudo cargar la vista previa. Intenta abrir el archivo en otra pestaña.');
        const bytes = await response.arrayBuffer();
        if (controller.signal.aborted) return;
        if (word) {
          const { renderAsync } = await import('docx-preview');
          if (controller.signal.aborted) return;
          const container = document.createElement('div');
          try {
            await renderAsync(bytes, container, undefined, { renderAltChunks: false, useBase64URL: true });
          } catch { throw Error('No se pudo mostrar este Word. Comprueba que sea un DOCX válido y que no esté protegido con contraseña. Puedes descargar el original.'); }
          if (controller.signal.aborted) return;
          if (!container.textContent?.trim() && !container.querySelector('img')) throw Error('No se encontró contenido para mostrar. Descarga el original para consultarlo.');
          setPreview({ html: `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><style>body{margin:0;background:#e2e8f0} .docx-wrapper{padding:16px!important} section.docx{margin:0 auto 16px!important} </style></head><body>${container.innerHTML}</body></html>` });
          return;
        }
        objectUrl = URL.createObjectURL(new Blob([bytes], { type: file.tipoMime || 'application/pdf' }));
        setPreview({ url: objectUrl, ...(pdf ? { pdfData: new Uint8Array(bytes) } : {}) });
      } catch (error) {
        if (!controller.signal.aborted) setPreview({ error: error instanceof Error ? error.message : 'No se pudo cargar la vista previa.' });
      }
    })();
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [file.enlace, file.tipoMime, image, pdf, word]);
  return <dialog ref={dialog} onCancel={event => { event.preventDefault(); onClose(); }} aria-label={`Ver archivo: ${file.nombre}`} className="fixed inset-0 m-auto max-h-[90vh] w-[calc(100%_-_2rem)] max-w-5xl overflow-y-auto [scrollbar-gutter:stable] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl backdrop:bg-slate-950/60">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="min-w-0 break-words font-bold">{file.nombre}</h3><button autoFocus type="button" onClick={onClose} className="aa-button aa-button-secondary">Cerrar vista previa</button></div>
    {preview.error ? <p role="alert" className="rounded-xl bg-red-50 p-5 text-sm text-red-700">{preview.error}</p> : (image || pdf || word) && !preview.url && !preview.html ? <p role="status" className="rounded-xl bg-slate-50 p-6 text-sm">Cargando vista previa…</p> : word ? <div><p className="mb-3 text-sm text-slate-600">Vista de lectura del Word. La distribución puede variar respecto al original.</p><iframe title={`Contenido de ${file.nombre}`} sandbox="" srcDoc={preview.html} className="h-[65vh] w-full rounded-xl border bg-slate-100" /></div> : image ? /* eslint-disable-next-line @next/next/no-img-element */
      <img src={preview.url} alt={file.nombre} className="mx-auto max-h-[65vh] max-w-full object-contain" /> : pdf ? <PdfPreview key={preview.url} data={preview.pdfData!} name={file.nombre} /> : <p className="rounded-xl bg-slate-50 p-6 text-sm">Este formato no tiene vista previa. Para un Word antiguo (.doc), guarda una copia como .docx y súbela para verla aquí. También puedes descargar el original.</p>}
    <div className="mt-4 flex flex-wrap gap-3">{(image || pdf) && <a href={preview.url || file.enlace} target="_blank" rel="noopener noreferrer" className="aa-button aa-button-secondary">Abrir en otra pestaña</a>}{file.almacenamiento === 'hosting' && <a href={`${file.enlace}?download=1`} className="aa-button aa-button-primary">Descargar archivo</a>}</div>
  </dialog>;
}

