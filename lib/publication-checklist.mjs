export function publicationChecklist(data) {
  const items = [
    { key: 'documentoDni', label: 'Archivo del DNI del propietario', complete: Boolean(data.documentoDni) },
    { key: 'archivoTasacion', label: 'Archivo de tasación', complete: Boolean(data.archivoTasacion) },
    { key: 'fotosVisita', label: 'Fotos de una visita completada', complete: Boolean(data.fotosVisita) },
    { key: 'texto', label: 'Texto para publicar', complete: Boolean(data.texto?.trim()) },
  ];
  return { items, complete: items.every(item => item.complete), missing: items.filter(item => !item.complete).map(item => item.label) };
}
