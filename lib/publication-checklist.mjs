export function publicationChecklist(data) {
  const items = [
    { key: 'documentoDni', label: data.operacion === 'alquiler' ? 'Archivo del DNI del arrendador' : 'Archivo del DNI del vendedor o de su gerente', complete: Boolean(data.documentoDni) },
    { key: 'archivoTasacion', label: 'Archivo de tasación', complete: Boolean(data.archivoTasacion) },
    { key: 'fotosVisita', label: 'Fotos de una visita completada', complete: Boolean(data.fotosVisita) },
    { key: 'texto', label: 'Texto para publicar', complete: Boolean(data.texto?.trim()) && data.textoRealizado !== false },
  ];
  return { items, complete: items.every(item => item.complete), missing: items.filter(item => !item.complete).map(item => item.label) };
}
