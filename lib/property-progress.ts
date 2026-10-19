export type PropertyProgressData = {
  estado: string;
  visitaRealizada: boolean;
  tasacionRegistrada: boolean;
  situacionTasacion: string | null;
  publicado: boolean;
  expedienteCompleto?: boolean;
};

export function propertyProgress(data: PropertyProgressData) {
  const historical = data.estado.toLowerCase() !== "activo";
  const completed = [true, data.visitaRealizada, data.tasacionRegistrada, Boolean(data.expedienteCompleto), data.publicado];
  const firstPending = completed.findIndex(value => !value);
  const labels = ["Registro", "Visita", "Tasación", "Expediente", "Publicación"];
  const steps = labels.map((label, index) => ({ label,
    state: completed[index] ? "complete" as const : !historical && !data.publicado && index === firstPending ? "current" as const : "pending" as const,
  }));
  let next = firstPending;
  if (data.publicado) next = -1;
  return { steps, historical,
    next: historical ? "Inmueble histórico · Consulta de los avances registrados." : next === -1 ? data.expedienteCompleto === false ? "Publicación completada. El expediente tiene requisitos pendientes; revisa la ficha." : "Publicación completada. Puedes revisar la ficha y el material." : ["", "Registrar la visita del inmueble.", "Registrar la tasación y los precios acordados con el propietario.", "Adjuntar DNI, archivo de tasación, fotos de la visita y texto.", "Confirmar la publicación del inmueble."][next],
    href: historical || next === -1 ? null : [null, "/registrar-visitas", "/registrar-tasaciones", "/tasaciones-textos-pendientes#material", "/tasaciones-textos-pendientes#material"][next],
  };
}
