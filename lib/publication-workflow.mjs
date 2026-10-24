// Screens share the existing publication states; no stored values are renamed.
export const workflowScreens = {
  'tasaciones-pendientes': { title: 'Tasaciones pendientes', stage: 'tasacion', register: '/registrar-tasaciones', action: 'Registrar tasación', description: 'Inmuebles con visita realizada que esperan el registro de su tasación.' },
  'textos-pendientes': { title: 'Textos pendientes', stage: 'texto', register: '/registrar-textos', action: 'Registrar texto', description: 'Inmuebles con tasación registrada cuyo texto comercial todavía está pendiente o en borrador.' },
  'registrar-textos': { title: 'Registrar textos', stage: 'texto', register: '/registrar-textos', action: 'Registrar texto', description: 'Guarda un borrador o marca el texto como realizado. Después continúa con Registrar publicaciones.' },
  'publicaciones-pendientes': { title: 'Publicaciones pendientes', stage: 'publicacion', register: '/registrar-publicaciones', action: 'Registrar publicación', description: 'Inmuebles con texto realizado que esperan confirmar el cartel, las redes sociales o ambas acciones.' },
  'registrar-publicaciones': { title: 'Registrar publicaciones', stage: 'publicacion', register: '/registrar-publicaciones', action: 'Registrar publicación', description: 'Elige los medios y confirma las acciones realizadas. Los enlaces de redes son opcionales. El envío al Portal web se gestiona por separado.' },
};
export function matchesWorkflowScreen(item, stage, registered = false) {
  if (stage === 'tasacion') return true;
  if (stage === 'texto') return registered ? item.etapa !== 'texto_pendiente' : item.etapa === 'texto_pendiente';
  return registered ? item.etapa === 'completada' : item.etapa === 'difusion_pendiente';
}
export function workflowPropertyHref(path, item) {
  const params = new URLSearchParams({ zona: item.zona || '*', inmueble: String(item.inmuebleId) });
  return `${path}?${params}`;
}
