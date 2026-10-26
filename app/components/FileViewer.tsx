"use client";
import { useEffect, useRef, useState } from 'react';
export type ViewableFile = { nombre: string; enlace: string; tipoMime: string | null; almacenamiento: string };

export default function FileViewer({ file, onClose }: { file: ViewableFile; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [preview, setPreview] = useState<{ url?: string; error?: string }>({});
  const image = ['image/jpeg', 'image/png', 'image/webp'].includes(file.tipoMime || '');
  const pdf = file.tipoMime === 'application/pdf';
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  useEffect(() => {
    if (!image && !pdf) return;
    const controller = new AbortController();
    let objectUrl: string | undefined;
    void (async () => {
      try {
        const response = await fetch(file.enlace, { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw Error('No se pudo cargar la vista previa. Intenta abrir el archivo en otra pestaña.');
        const bytes = await response.arrayBuffer();
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(new Blob([bytes], { type: file.tipoMime || 'application/pdf' }));
        setPreview({ url: objectUrl });
      } catch (error) {
        if (!controller.signal.aborted) setPreview({ error: error instanceof Error ? error.message : 'No se pudo cargar la vista previa.' });
      }
    })();
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [file.enlace, file.tipoMime, image, pdf]);
  return <dialog ref={dialog} onCancel={event => { event.preventDefault(); onClose(); }} aria-label={`Ver archivo: ${file.nombre}`} className="fixed inset-0 m-auto max-h-[90vh] w-[calc(100%_-_2rem)] max-w-5xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-xl backdrop:bg-slate-950/60">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="min-w-0 break-words font-bold">{file.nombre}</h3><button autoFocus type="button" onClick={onClose} className="aa-button aa-button-secondary">Cerrar vista previa</button></div>
    {preview.error ? <p role="alert" className="rounded-xl bg-red-50 p-5 text-sm text-red-700">{preview.error}</p> : (image || pdf) && !preview.url ? <p role="status" className="rounded-xl bg-slate-50 p-6 text-sm">Cargando vista previa…</p> : image ? /* eslint-disable-next-line @next/next/no-img-element */
      <img src={preview.url} alt={file.nombre} className="mx-auto max-h-[65vh] max-w-full object-contain" /> : pdf ? <object aria-label={file.nombre} data={preview.url} type="application/pdf" className="h-[65vh] w-full rounded-xl border"><p className="p-6 text-sm">Tu navegador no muestra PDF dentro de esta ventana. <a className="font-semibold text-red-700 underline" href={preview.url} target="_blank" rel="noopener noreferrer">Abrir vista previa</a></p></object> : <p className="rounded-xl bg-slate-50 p-6 text-sm">Vista previa no disponible para archivos Word o Excel. Debes descargar el archivo para consultarlo.</p>}
    <div className="mt-4 flex flex-wrap gap-3">{(image || pdf) && <a href={preview.url || file.enlace} target="_blank" rel="noopener noreferrer" className="aa-button aa-button-secondary">Abrir en otra pestaña</a>}{file.almacenamiento === 'hosting' && <a href={`${file.enlace}?download=1`} className="aa-button aa-button-primary">Descargar archivo</a>}</div>
  </dialog>;
}

