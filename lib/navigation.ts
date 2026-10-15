export const dashboardMenuItem = { href: "/", label: "Panel de control", icon: "dashboard" };

// Menu links and page headings share these exact names.
export const menuGroups = [
  {
    label: "Operación",
    items: [
      { href: "/cartera", label: "Cartera de inmuebles", icon: "home" },
      { href: "/registrar-inmueble", label: "Registrar inmueble", icon: "plus" },
    ],
  },
  {
    label: "Seguimiento",
    items: [
      { href: "/visitas-pendientes", label: "Visitas pendientes", icon: "clock" },
      { href: "/registrar-visitas", label: "Registrar visitas", icon: "visit" },
      { href: "/tasaciones-textos-pendientes", label: "Tasaciones y textos pendientes", icon: "clipboard" },
      { href: "/registrar-tasaciones", label: "Registrar tasaciones", icon: "valuation" },
    ],
  },
  {
    label: "Cierre e información",
    items: [
      { href: "/alquileres", label: "Contratos de alquiler", icon: "clipboard" },
      { href: "/liberar-inmuebles", label: "Liberar inmueble", icon: "release" },
      { href: "/reportes", label: "Reportes", icon: "report" },
    ],
  },
  {
    label: "Administración",
    items: [
      { href: "/ubicaciones", label: "Zonas de cartera", icon: "map" },
      { href: "/tipos-inmueble", label: "Tipos de inmueble", icon: "home" },
      { href: "/usuarios", label: "Usuarios y accesos", icon: "users" },
      { href: "/seguridad", label: "Registro de seguridad", icon: "clipboard" },
    ],
  },
  {
    label: "Información de inmuebles",
    items: [{ href: "/datos-inmuebles", label: "Ficha, documentos y fotos", icon: "database" }],
  },
];
