export const dashboardMenuItem = { href: "/", label: "Panel de control", icon: "dashboard" };

// Menu links and page headings share these exact names.
export const menuGroups = [
  {
    label: "Operación",
    items: [
      { href: "/cartera", label: "Cartera de inmuebles", icon: "home" },
    ],
  },
  {
    label: "Seguimiento",
    items: [
      { href: "/registrar-inmueble", label: "Registrar inmueble", icon: "plus" },
      { href: "/liberar-inmuebles", label: "Liberar inmueble", icon: "release" },
      { href: "/visitas-pendientes", label: "Visitas pendientes", icon: "clock" },
      { href: "/registrar-visitas", label: "Registrar visitas", icon: "visit" },
      { href: "/tasaciones-pendientes", label: "Tasaciones pendientes", icon: "clipboard" },
      { href: "/registrar-tasaciones", label: "Registrar tasaciones", icon: "valuation" },
      { href: "/tasaciones-negociadas-registradas", label: "Tasaciones negociadas registradas", icon: "agreement" },
      { href: "/textos-pendientes", label: "Textos pendientes", icon: "textPending" },
      { href: "/registrar-textos", label: "Registrar textos", icon: "write" },
      { href: "/publicaciones-pendientes", label: "Publicaciones pendientes", icon: "publicationPending" },
      { href: "/registrar-publicaciones", label: "Registrar publicaciones", icon: "publish" },
    ],
  },
  {
    label: "Portal web",
    items: [
      { href: "/portal-web/por-publicar", label: "Inmuebles por publicar", icon: "webPending" },
      { href: "/portal-web/activas", label: "Publicaciones activas", icon: "globe" },
      { href: "/portal-web/portada", label: "Portada del sitio", icon: "image" },
    ],
  },
  {
    label: "Estadística",
    items: [
      { href: "/listado-archivos", label: "Listado de archivos", icon: "files" },
      { href: "/reportes", label: "Reportes", icon: "report" },
    ],
  },
  {
    label: "Administración",
    items: [
      { href: "/ubicaciones", label: "Zonas de cartera", icon: "map" },
      { href: "/tipos-inmueble", label: "Tipos de inmueble", icon: "buildings" },
      { href: "/usuarios", label: "Usuarios y accesos", icon: "users" },
      { href: "/configuracion-plazos", label: "Plazos generales", icon: "deadlines" },
      { href: "/seguridad", label: "Registro de seguridad", icon: "shield" },
    ],
  },
  {
    label: "Información de inmuebles",
    items: [{ href: "/datos-inmuebles", label: "Ficha, documentos y fotos", icon: "database" }],
  },
];
