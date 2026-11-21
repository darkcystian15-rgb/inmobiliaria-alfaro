"use client";

import { useId, useRef, useState, type DragEvent, type RefObject } from 'react';

export default function FileDropZone({ label, accept, help, limits, subdued = false, disabled = false, inputRef, onFiles, onRejected }: {
  label: string; accept: string; help: string; limits?: string; subdued?: boolean; disabled?: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onFiles: (files: File[]) => void; onRejected: (message: string) => void;
}) {
  const helpId = useId();
  const depth = useRef(0);
  const [dragging, setDragging] = useState(false);
  function select(files: File[]) {
    if (disabled || !files.length) return;
    const extensions = accept.toLowerCase().split(',');
    const invalid = files.find(file => !extensions.some(extension => file.name.toLowerCase().endsWith(extension)));
    if (invalid) { onRejected(`«${invalid.name}»: formato no permitido. ${help}`); return; }
    onFiles(files);
  }
  function enter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault(); event.stopPropagation();
    if (disabled || !Array.from(event.dataTransfer.types).includes('Files')) return;
    depth.current++; setDragging(true);
  }
  function leave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault(); event.stopPropagation();
    depth.current = Math.max(0, depth.current - 1);
    if (!depth.current) setDragging(false);
  }
  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault(); event.stopPropagation();
    depth.current = 0; setDragging(false);
    if (disabled) return;
    if (Array.from(event.dataTransfer.items).some(item => item.kind === 'file' && item.webkitGetAsEntry?.()?.isDirectory)) {
      onRejected('Arrastra archivos individuales; no carpetas.'); return;
    }
    select(Array.from(event.dataTransfer.files));
  }
  return <div role="group" aria-label={`Carga: ${label}`} aria-disabled={disabled}
    onDragEnter={enter} onDragLeave={leave} onDragOver={event => { event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = disabled ? 'none' : 'copy'; }} onDrop={drop}
    data-file-drop-zone="true" data-dragging={dragging && !disabled ? 'true' : 'false'}
    className={`min-w-0 rounded-xl border border-dashed p-3 transition-colors ${disabled ? 'border-slate-200 bg-slate-100 opacity-60' : dragging ? 'border-red-500 bg-red-50 ring-2 ring-red-100' : subdued ? 'border-slate-200 bg-white' : 'border-red-200 bg-red-50/30'}`}>
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
      <label className={`relative inline-flex min-h-11 shrink-0 items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 focus-within:ring-2 focus-within:ring-red-700 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
        Seleccionar archivos<span className="sr-only">: {label}</span>
        <input ref={inputRef} type="file" multiple accept={accept} disabled={disabled} aria-describedby={helpId}
          onClick={event => { event.currentTarget.value = ''; }}
          onChange={event => { select(Array.from(event.target.files || [])); }}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed" />
      </label>
      <span className="text-xs text-slate-500">{dragging && !disabled ? 'Suelta los archivos aquí' : 'o arrástralos aquí'}</span>
    </div>
    <div id={helpId} className="mt-2 flex flex-wrap items-start gap-x-3 gap-y-1 text-xs text-slate-500">
      {limits && <span className="rounded-md bg-slate-100 px-2 py-1 font-semibold text-slate-700">{limits}</span>}
      <details className="min-w-0">
        <summary className="min-h-8 cursor-pointer py-1 underline decoration-slate-300 underline-offset-4">Formatos y ayuda</summary>
        <p className="max-w-prose pb-1 leading-5">{help}</p>
      </details>
    </div>
  </div>;
}
