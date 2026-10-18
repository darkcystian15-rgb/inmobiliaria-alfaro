"use client";
import { useEffect, useRef } from 'react';
export type ViewableFile = { nombre: string; enlace: string; tipoMime: string | null; almacenamiento: string };

export default function FileViewer({ file, onClose }: { file: ViewableFile; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const image = ['image/jpeg', 'image/png', 'image/webp'].includes(file.tipoMime || '');
  const pdf = file.tipoMime === 'application/pdf';
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  return <dialog ref={dialog} onCancel={event => { event.preventDefault(); onClose(); }} aria-label={`Ver archivo: ${file.nombre}`} className="fixed inset-0 m-auto max-h-[90vh] w-[calc(100%_-_2rem)] max-w-5xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-xl backdrop:bg-slate-950/60">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="min-w-0 break-words font-bold">{file.nombre}</h3><button autoFocus type="button" onClick={onClose} className="aa-button aa-button-secondary">Cerrar vista previa</button></div>
    {image ? /* eslint-disable-next-line @next/next/no-img-element */
      <img src={file.enlace} alt={file.nombre} className="mx-auto max-h-[65vh] max-w-full object-contain" /> : pdf ? <iframe title={file.nombre} src={file.enlace} className="h-[65vh] w-full rounded-xl border" /> : <p className="rounded-xl bg-slate-50 p-6 text-sm">Este formato se abre con Word o Excel. Descarga el archivo para consultarlo en su aplicación.</p>}
    <div className="mt-4 flex flex-wrap gap-3"><a href={file.enlace} target="_blank" rel="noopener noreferrer" className="aa-button aa-button-secondary">Abrir en otra pestaña</a>{file.almacenamiento === 'hosting' && <a href={`${file.enlace}?download=1`} className="aa-button aa-button-primary">Descargar archivo</a>}</div>
  </dialog>;
}

