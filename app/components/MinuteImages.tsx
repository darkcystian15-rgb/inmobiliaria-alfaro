'use client';

import { useState } from 'react';
import { zoneUrl } from '@/lib/zone-url';
import type { MinuteDocument, MinuteImage } from '@/lib/minute-document';

const control = 'min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white p-2 text-sm';
export default function MinuteImages({ data, propertyId, disabled, uploadReady, onChange, onUpload }: {
  data: MinuteDocument; propertyId: number; disabled: boolean; uploadReady: boolean;
  onChange: (data: MinuteDocument) => void; onUpload: (file: File) => void;
}) {
  const [failed, setFailed] = useState<number[]>([]);
  const [ratios, setRatios] = useState<Record<number, number>>({});
  const images = data.images || [];
  const paragraphs: { end: number; label: string }[] = [];
  let offset = 0;
  for (const line of data.text.split('\n')) {
    if (line.trim()) paragraphs.push({ end: offset + line.length, label: line.trim().slice(0, 70) });
    offset += line.length + 1;
  }
  function update(index: number, patch: Partial<MinuteImage>) {
    onChange({ ...data, images: images.map((image, i) => i === index ? { ...image, ...patch } : image) });
  }
  function resize(index: number, axis: 'width' | 'height', value: number) {
    const image = images[index], ratio = ratios[image.fileId];
    const keepRatio = image.keepRatio !== false;
    let width = image.width, height = image.height ?? (ratio ? width / ratio : undefined);
    const size = Math.max(0.01, Math.min(axis === 'width' ? 160 : 240, value || 0.01));
    if (axis === 'width') { width = size; if (keepRatio && ratio) height = width / ratio; }
    else { height = size; if (keepRatio && ratio) width = height * ratio; }
    if (keepRatio && height && (width > 160 || height > 240)) {
      const factor = Math.min(160 / width, 240 / height); width *= factor; height *= factor;
    }
    update(index, { width, height, keepRatio });
  }
  return <section aria-label="Imágenes del documento" className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
    <h3 className="text-sm font-semibold">Imágenes del documento</h3>
    <p className="mt-1 text-xs leading-5 text-slate-600">Hasta 8 imágenes. Elige después de qué párrafo aparecerán en el PDF. Quitar una imagen del contenido conserva su archivo en el expediente.</p>
    <fieldset disabled={disabled} className="mt-3 space-y-4">
      <label className="block text-sm font-semibold">Distribución de imágenes<select aria-label="Distribución de imágenes" className={`${control} mt-2`} value={data.imageColumns || 1} onChange={event => onChange({ ...data, imageColumns: Number(event.target.value) as 1 | 2 | 3 })}><option value={1}>Una por fila</option><option value={2}>Dos por fila</option><option value={3}>Tres por fila</option></select></label>
      <p className="text-xs text-slate-600">Ancho y alto se expresan en milímetros. El PDF reduce el tamaño si supera el espacio de la fila o página. Para agrupar comprobantes, elige la misma ubicación en cada imagen. Se ordenan según aparecen aquí y se ajustan al ancho de la fila.</p>
      {images.map((image, index) => <div key={`${image.fileId}-${index}`} className="rounded-lg border border-slate-200 p-3">
        <p className="mb-2 text-sm font-semibold">Imagen {index + 1}</p>
        {/* Private authenticated images are served without the Next.js image optimizer. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={zoneUrl(`/api/inmuebles/${propertyId}/archivos/${image.fileId}`)} alt={image.caption || `Imagen ${index + 1} del documento`} className="max-h-52 max-w-full rounded object-contain" onLoad={event => { const node = event.currentTarget; if (node.naturalWidth && node.naturalHeight) { const ratio = node.naturalWidth / node.naturalHeight; setRatios(previous => previous[image.fileId] === ratio ? previous : { ...previous, [image.fileId]: ratio }); } }} onError={() => setFailed(previous => previous.includes(image.fileId) ? previous : [...previous, image.fileId])} />
        {failed.includes(image.fileId) && <p role="alert" className="mt-2 text-sm text-red-800">No se pudo mostrar esta imagen. Comprueba su archivo antes de generar.</p>}
        <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
          <label className="min-w-0 text-xs font-semibold">Ubicación de imagen {index + 1}<select className={control} value={image.after} onChange={event => update(index, { after: Number(event.target.value) })}>
            <option value={0}>Antes del primer párrafo</option>
            {paragraphs.map(paragraph => <option key={paragraph.end} value={paragraph.end}>Después de: {paragraph.label}</option>)}
            {image.after !== 0 && !paragraphs.some(paragraph => paragraph.end === image.after) && <option value={image.after}>Después del párrafo actual</option>}
            {data.text.length > 0 && !paragraphs.some(paragraph => paragraph.end === data.text.length) && <option value={data.text.length}>Al final del contenido</option>}
          </select></label>
          <label className="text-xs font-semibold">Ancho de imagen {index + 1} (mm)<input type="number" min={0.01} max={160} step="any" className={control} value={Math.round(image.width * 100) / 100} onChange={event => resize(index, 'width', Number(event.target.value))} /></label>
          <label className="text-xs font-semibold">Alto de imagen {index + 1} (mm)<input type="number" min={0.01} max={240} step="any" disabled={!ratios[image.fileId] && image.height === undefined} className={control} value={image.height !== undefined ? Math.round(image.height * 100) / 100 : ratios[image.fileId] ? Math.round(image.width / ratios[image.fileId] * 100) / 100 : ''} placeholder="Cargando…" onChange={event => resize(index, 'height', Number(event.target.value))} /></label>
          <label className="flex min-h-11 items-center gap-2 text-xs font-semibold"><input type="checkbox" aria-label={`Mantener proporción de imagen ${index + 1}`} disabled={!ratios[image.fileId]} checked={image.keepRatio !== false} onChange={event => { const keepRatio = event.target.checked, ratio = ratios[image.fileId]; if (keepRatio) { const width = Math.min(image.width, 240 * ratio); update(index, { keepRatio, width, height: width / ratio }); } else update(index, { keepRatio, height: image.height ?? image.width / ratio }); }} />Mantener proporción</label>
          <label className="text-xs font-semibold">Alineación de imagen {index + 1}<select className={control} value={image.align} onChange={event => update(index, { align: event.target.value as MinuteImage['align'] })}><option value="left">Izquierda</option><option value="center">Centrada</option><option value="right">Derecha</option></select></label>
          <label className="text-xs font-semibold">Descripción de imagen {index + 1}<input className={control} maxLength={160} value={image.caption} onChange={event => update(index, { caption: event.target.value.replace(/[\r\n]/g, ' ') })} placeholder="Opcional · aparece debajo de la imagen" /></label>
        </div>
        <button type="button" className="mt-2 min-h-11 text-sm font-semibold text-red-800" onClick={() => onChange({ ...data, images: images.filter((_, i) => i !== index) })}>Quitar imagen {index + 1} del contenido</button>
      </div>)}
      <label className="block text-sm font-semibold">Añadir imagen<input type="file" accept=".jpg,.jpeg,.png,.webp" disabled={disabled || !uploadReady || images.length >= 8} className={`${control} mt-2`} onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) onUpload(file); }} /></label>
    </fieldset>
  </section>;
}
