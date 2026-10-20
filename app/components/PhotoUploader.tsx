"use client";

import { Feedback } from "./InterfaceFeedback";
import Image from 'next/image';
import { useRef, useState } from 'react';
import { compressImage, IMAGE_ACCEPT } from '@/lib/client-images';
import FileDropZone from './FileDropZone';
export type UploadedPhoto = { id: number; nombre: string; enlace: string };

export default function PhotoUploader({ propertyId, visitaId, photos, onUploaded, onBusyChange, disabled = false, showPreviews = true }: {
  propertyId: number | string; visitaId?: number; photos: UploadedPhoto[]; onUploaded: (photo: UploadedPhoto) => void;
  onBusyChange?: (busy: boolean) => void; disabled?: boolean; showPreviews?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const lock = useRef(false);
  async function upload(files: File[]) {
    if (!files.length || lock.current || disabled) return;
    if (files.length + photos.length > 20) { setError('Puedes adjuntar hasta 20 fotos por carga.'); return; }
    lock.current = true; setBusy(true); onBusyChange?.(true); setError('');
    try {
      for (let i = 0; i < files.length; i++) {
        setProgress(`Subiendo foto ${i + 1} de ${files.length}…`);
        const image = await compressImage(files[i]);
        const form = new FormData();
        form.set('archivo', image); form.set('tipoDocumento', 'FOTO_INMUEBLE');
        if (visitaId !== undefined) form.set('visitaId', String(visitaId));
        form.set('nombre', files[i].name.replace(/\.[^.]+$/, '').slice(0, 255));
        const response = await fetch(`/api/inmuebles/${encodeURIComponent(propertyId)}/archivos`, { method: 'POST', body: form });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'No se pudo subir la foto.');
        onUploaded({ id: data.id, nombre: files[i].name, enlace: `/api/inmuebles/${encodeURIComponent(propertyId)}/archivos/${data.id}` });
      }
      setProgress('Fotos guardadas correctamente.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudieron subir las fotos.'); setProgress('');
    } finally {
      lock.current = false; setBusy(false); onBusyChange?.(false);
      if (input.current) input.current.value = '';
    }
  }
  return <div className="space-y-3">
    <FileDropZone label="Agregar fotografías" accept={IMAGE_ACCEPT} inputRef={input} disabled={busy || disabled}
      help="JPG, PNG o WebP. Hasta 25 MB por imagen original y 20 fotos por carga. Se comprimen automáticamente."
      onFiles={files => { void upload(files); }} onRejected={setError} />
    {progress && <Feedback tone={busy ? "info" : "success"}>{progress}</Feedback>}
    {error && <Feedback tone="error">{error} Las fotos que ya se guardaron siguen disponibles.</Feedback>}
    {showPreviews && photos.length > 0 && <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 2xl:grid-cols-4">{photos.map(photo => <a key={photo.id} href={photo.enlace} target="_blank" rel="noreferrer" className="overflow-hidden rounded-xl border border-slate-200 bg-white"><Image unoptimized src={photo.enlace} alt={photo.nombre} width={240} height={180} className="aspect-[4/3] w-full object-cover" /><p className="truncate px-2 py-2 text-xs text-slate-600">{photo.nombre}</p></a>)}</div>}
  </div>;
}
