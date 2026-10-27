// Send memory-backed bytes instead of asking fetch to reopen a mobile provider URI.
export async function readUploadFile(file) {
  let bytes;
  try {
    bytes = await file.arrayBuffer();
  } catch {
    throw new Error('El navegador no pudo leer el archivo seleccionado. Guarda el PDF en Descargas de tu celular y vuelve a seleccionarlo desde allí.');
  }
  if (bytes.byteLength !== file.size) throw new Error('No se pudo leer el archivo completo. Vuelve a seleccionarlo desde Descargas.');
  return new File([bytes], file.name, { type: file.type, lastModified: file.lastModified });
}
