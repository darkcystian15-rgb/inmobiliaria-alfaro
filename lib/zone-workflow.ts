// One rule for both navigation visibility and the entry to operational screens.
// A general view (zona=*) is not a selected work zone.
export const zoneWorkflowPaths = new Set([
  '/registrar-inmueble', '/visitas-pendientes', '/registrar-visitas',
  '/tasaciones-pendientes', '/registrar-tasaciones',
  '/textos-pendientes', '/registrar-textos',
  '/publicaciones-pendientes', '/registrar-publicaciones',
  '/tasaciones-textos-pendientes',
]);

export function workflowZoneHref(href: string, zone: string) {
  const url = new URL(href, 'https://workspace.local');
  const name=zone.trim();
  if (url.origin !== 'https://workspace.local' || !name || name === '*') return null;
  url.searchParams.set('zona', name);
  return url.pathname + url.search + url.hash;
}
