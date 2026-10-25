const originRoutes = new Set(["/tasaciones-pendientes", "/textos-pendientes", "/registrar-textos", "/publicaciones-pendientes", "/registrar-publicaciones", "/cartera", "/visitas-pendientes", "/tasaciones-textos-pendientes", "/datos-inmuebles"]);
const destinationRoutes = new Set(["/tasaciones-pendientes", "/textos-pendientes", "/registrar-textos", "/publicaciones-pendientes", "/registrar-publicaciones", "/registrar-inmueble", "/registrar-visitas", "/registrar-tasaciones", "/tasaciones-negociadas-registradas", "/datos-inmuebles", "/tasaciones-textos-pendientes", "/liberar-inmuebles"]);

export function safeReturnHref(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  try {
    const url = new URL(value, "https://intranet.invalid");
    if (url.origin !== "https://intranet.invalid" || !originRoutes.has(url.pathname)) return null;
    url.searchParams.delete("volver");
    return url.pathname + url.search + url.hash;
  } catch { return null; }
}

export function withReturnHref(href: string, origin?: string | null): string {
  const safe = safeReturnHref(origin);
  if (!safe || !href.startsWith("/") || href.startsWith("//")) return href;
  const url = new URL(href, "https://intranet.invalid");
  if (url.origin !== "https://intranet.invalid" || !destinationRoutes.has(url.pathname)) return href;
  url.searchParams.set("volver", safe);
  return url.pathname + url.search + url.hash;
}

export function returnLabel(href: string): string {
  const url = new URL(href, "https://intranet.invalid");
  const zone = url.searchParams.get("zona");
  const name = url.pathname === "/cartera" ? "cartera" : url.pathname === "/visitas-pendientes" ? "visitas pendientes" : url.pathname === "/datos-inmuebles" ? "la ficha" : url.pathname === "/tasaciones-pendientes" ? "tasaciones pendientes" : url.pathname === "/textos-pendientes" ? "textos pendientes" : url.pathname === "/registrar-textos" ? "registrar textos" : url.pathname === "/publicaciones-pendientes" ? "publicaciones pendientes" : url.pathname === "/registrar-publicaciones" ? "registrar publicaciones" : "seguimiento";
  return `Volver a ${name}${zone && zone !== "*" ? ` · ${zone}` : ""}`;
}
