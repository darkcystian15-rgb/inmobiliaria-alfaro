const contextual = new Set(["/tasaciones-pendientes", "/textos-pendientes", "/registrar-textos", "/publicaciones-pendientes", "/registrar-publicaciones", "/portal-web/por-publicar", "/portal-web/activas", "/registrar-inmueble", "/visitas-pendientes", "/registrar-visitas", "/registrar-tasaciones", "/tasaciones-textos-pendientes", "/liberar-inmuebles", "/alquileres", "/reportes", "/listado-archivos", "/datos-inmuebles"]);
export function zoneHref(href: string, zone?: string | null) {
  if (!zone || zone === "*" || !href.startsWith("/")) return href;
  const url = new URL(href, "https://workspace.local");
  if (contextual.has(url.pathname) && !url.searchParams.has("zona")) url.searchParams.set("zona", zone);
  return url.pathname + url.search + url.hash;
}
export function zoneUrl(href: string) {
  if (typeof window === "undefined" || !href.startsWith("/api/")) return href;
  const zone = new URLSearchParams(window.location.search).get("zona");
  if (!zone || zone === "*") return href;
  const url = new URL(href, window.location.origin);
  if (!url.searchParams.has("zona")) url.searchParams.set("zona",zone);
  return url.pathname+url.search;
}
export const operationalPaths = contextual;
