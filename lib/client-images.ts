export const IMAGE_ACCEPT = '.jpg,.jpeg,.png,.webp';
export function isImageFile(file: File) {
  return /\.(jpe?g|png|webp)$/i.test(file.name);
}
export async function compressImage(file: File): Promise<File> {
  if (!isImageFile(file)) throw new Error('Selecciona imágenes JPG, PNG o WebP.');
  if (file.size > 100 * 1024 * 1024) throw new Error('La imagen original debe pesar como máximo 100 MB.');
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > 40000000) throw new Error('La imagen supera las dimensiones permitidas.');
    const ratio = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No se pudo preparar la imagen.');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('No se pudo comprimir la imagen.')), 'image/webp', 0.82));
    if (blob.size > 4 * 1024 * 1024) throw new Error('La imagen comprimida supera 4 MB.');
    const extension = blob.type === 'image/webp' ? 'webp' : 'png';
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '').slice(0, 200)}.${extension}`, { type: blob.type });
  } finally { bitmap.close(); }
}
