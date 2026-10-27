"use client";

import { useId, useRef, useState, type DragEvent, type RefObject } from 'react';

export default function FileDropZone({ label, accept, help, subdued = false, disabled = false, inputRef, onFiles, onRejected }: {
  label: string; accept: string; help: string; subdued?: boolean; disabled?: boolean;
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
    className={`rounded-2xl border-2 border-dashed p-4 transition-colors ${disabled ? 'border-slate-200 bg-slate-100 opacity-60' : dragging ? 'border-red-500 bg-red-50 ring-2 ring-red-100' : subdued ? 'border-slate-200 bg-white' : 'border-red-200 bg-red-50/30'}`}>
    <p className="text-sm font-semibold text-slate-700">{dragging && !disabled ? 'Suelta los archivos aquí' : 'Arrastra y suelta los archivos aquí'}</p>
    <p id={helpId} className="mt-1 text-xs leading-5 text-slate-500">{help} También puedes seleccionarlos con el botón.</p>
    <label className="mt-3 block text-sm font-semibold text-slate-700">{label}<input ref={inputRef} type="file" multiple accept={accept} disabled={disabled} aria-describedby={helpId}
      // Keep the selection alive until the next picker opens: some mobile
      // providers revoke access to the file when the input is cleared.
      onClick={event => { event.currentTarget.value = ''; }}
      onChange={event => { select(Array.from(event.target.files || [])); }}
      className={`mt-2 block w-full min-w-0 text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:font-semibold ${subdued ? 'file:text-slate-700' : 'file:text-red-700'} disabled:cursor-not-allowed`} /></label>
  </div>;
}
