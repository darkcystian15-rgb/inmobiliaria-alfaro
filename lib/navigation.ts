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
      { href: "/tasaciones-textos-pendientes", label: "Tasaciones y textos pendientes", icon: "clipboard" },
      { href: "/registrar-tasaciones", label: "Registrar tasaciones", icon: "valuation" },
    ],
  },
  {
    label: "Estadística",
    items: [
      { href: "/listado-archivos", label: "Listado de archivos", icon: "clipboard" },
      { href: "/reportes", label: "Reportes", icon: "report" },
    ],
  },
  {
    label: "Administración",
    items: [
      { href: "/ubicaciones", label: "Zonas de cartera", icon: "map" },
      { href: "/tipos-inmueble", label: "Tipos de inmueble", icon: "home" },
      { href: "/usuarios", label: "Usuarios y accesos", icon: "users" },
      { href: "/configuracion-plazos", label: "Plazos generales", icon: "clock" },
      { href: "/seguridad", label: "Registro de seguridad", icon: "clipboard" },
    ],
  },
  {
    label: "Información de inmuebles",
    items: [{ href: "/datos-inmuebles", label: "Ficha, documentos y fotos", icon: "database" }],
  },
];
