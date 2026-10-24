export type PropertyProgressData = {
  estado: string;
  visitaRealizada: boolean;
  tasacionRegistrada: boolean;
  situacionTasacion: string | null;
  publicado: boolean;
  textoRealizado?: boolean;
  expedienteCompleto?: boolean;
};

export function propertyProgress(data: PropertyProgressData) {
  const historical = data.estado.toLowerCase() !== "activo";
  const completed = [true, data.visitaRealizada, data.tasacionRegistrada, Boolean(data.textoRealizado), data.publicado];
  const firstPending = completed.findIndex(value => !value);
  const labels = ["Registro", "Visita", "Tasación", "Texto", "Publicación"];
  const steps = labels.map((label, index) => ({ label,
    state: completed[index] ? "complete" as const : !historical && !data.publicado && index === firstPending ? "current" as const : "pending" as const,
  }));
  let next = firstPending;
  if (data.publicado) next = -1;
  return { steps, historical,
    next: historical ? "Inmueble histórico · Consulta de los avances registrados." : next === -1 ? "Publicación registrada. Puedes consultar y editar el texto del inmueble." : ["", "Registrar la visita del inmueble.", "Registrar la tasación y los precios acordados con el propietario.", "Escribir y marcar el texto como realizado.", "Confirmar el cartel y/o la publicación en redes sociales."][next],
    href: historical || next === -1 ? null : [null, "/registrar-visitas", "/registrar-tasaciones", "/registrar-textos", "/registrar-publicaciones"][next],
  };
}
