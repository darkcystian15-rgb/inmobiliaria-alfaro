export const deadlineStages: Record<string, { label: string; description: string }> = {
  visita: { label: 'Visita', description: 'Tiempo para realizar y registrar la visita inicial al inmueble.' },
  tasacion: { label: 'Tasación', description: 'Tiempo para registrar los valores de tasación del inmueble.' },
  expediente: { label: 'Texto comercial', description: 'Tiempo para preparar y guardar el texto del anuncio.' },
  publicacion: { label: 'Publicación', description: 'Tiempo para registrar la publicación del inmueble.' },
  documentacion: { label: 'Expediente documental', description: 'Tiempo para completar los documentos y requisitos de la operación.' },
};
