export const reportCatalog = [
  { nombre: "Alertas de actividades", descripcion: "Pendientes con su límite vigente y días de atraso, sincronizados con el panel.", categoria: "Gestión", icono: "◷" },
  {
    nombre: "Cartera activa",
    descripcion:
      "Inmuebles con una posición activa en la cartera.",
    categoria: "Cartera",
    icono: "⌂",
  },
  {
    nombre: "Posiciones disponibles",
    descripcion:
      "Posiciones libres para nuevos registros.",
    categoria: "Cartera",
    icono: "▦",
  },
  {
    nombre: "Situación de cartera",
    descripcion:
      "Vista de las actividades pendientes y situaciones actuales.",
    categoria: "Cartera",
    icono: "◫",
  },
  {
    nombre: "Inmuebles por estado",
    descripcion:
      "Situación actual de los registros activos e históricos.",
    categoria: "Cartera",
    icono: "✓",
  },

  {
    nombre: "Visitas realizadas",
    descripcion:
      "Visitas efectivamente completadas y registradas.",
    categoria: "Gestión",
    icono: "◉",
  },
  {
    nombre: "Visitas pendientes",
    descripcion:
      "Inmuebles activos que todavía requieren visita.",
    categoria: "Gestión",
    icono: "◌",
  },
  {
    nombre: "Tasaciones realizadas",
    descripcion:
      "Tasaciones registradas en el sistema.",
    categoria: "Gestión",
    icono: "⌁",
  },
  {
    nombre: "Tasaciones pendientes",
    descripcion:
      "Inmuebles con visita realizada que aún requieren tasación.",
    categoria: "Gestión",
    icono: "⌁",
  },
  {
    nombre: "Material pendiente",
    descripcion:
      "Inmuebles aprobados que aún requieren registrar material de publicación.",
    categoria: "Gestión",
    icono: "≡",
  },
  {
    nombre: "Listos para publicar",
    descripcion:
      "Publicaciones registradas que esperan ser publicadas.",
    categoria: "Gestión",
    icono: "↗",
  },
  {
    nombre: "Publicados",
    descripcion:
      "Inmuebles cuya publicación ya fue registrada como publicada.",
    categoria: "Gestión",
    icono: "●",
  },

  {
    nombre: "Alquilados",
    descripcion:
      "Inmuebles liberados por alquiler.",
    categoria: "Salidas",
    icono: "✓",
  },
  {
    nombre: "Vendidos",
    descripcion:
      "Inmuebles liberados por venta.",
    categoria: "Salidas",
    icono: "✓",
  },
  {
    nombre: "Retirados / cancelados",
    descripcion:
      "Salidas por cancelación u otros motivos.",
    categoria: "Salidas",
    icono: "↩",
  },
  {
    nombre: "Motivos de liberación",
    descripcion:
      "Detalle de las causas de salida de cartera.",
    categoria: "Salidas",
    icono: "!",
  },

  {
    nombre: "Histórico de inmuebles",
    descripcion:
      "Registros que ya no están activos.",
    categoria: "Histórico",
    icono: "◷",
  },
  {
    nombre: "Tiempo de permanencia",
    descripcion:
      "Días desde el registro hasta la salida o actualidad.",
    categoria: "Histórico",
    icono: "◌",
  },
  {
    nombre: "Posición ocupada",
    descripcion:
      "Historial de uso de cada posición reutilizable.",
    categoria: "Histórico",
    icono: "01",
  },

  {
    nombre: "Registro → visita",
    descripcion:
      "Tiempo entre el registro del alta y el registro de la visita.",
    categoria: "Flujo",
    icono: "→",
  },
  {
    nombre: "Visita → tasación",
    descripcion:
      "Tiempo entre el registro de la visita y el registro de la tasación.",
    categoria: "Flujo",
    icono: "→",
  },
  {
    nombre: "Tasación → publicación",
    descripcion:
      "Tiempo desde el registro de precios acordados hasta publicación.",
    categoria: "Flujo",
    icono: "→",
  },
];


export function recommendedReportColumns(report, available) {
 const identity=['zona','posicion','nombre'];
 const specific={
  'Alertas de actividades':[...identity,'actividadPendiente','fechaLimite','estadoPlazo','diasRetraso','plazoOrigen'],
  'Visitas pendientes':[...identity,'fechaLimite','estadoPlazo','diasRetraso'],
  'Tasaciones pendientes':[...identity,'fechaVisita','fechaLimite','estadoPlazo','diasRetraso'],
  'Material pendiente':[...identity,'fechaTasacion','fechaLimite','estadoPlazo','diasRetraso'],
  'Listos para publicar':[...identity,'fechaLimite','estadoPlazo','diasRetraso'],
  'Visitas realizadas':[...identity,'fechaVisita','operacion'],
  'Tasaciones realizadas':[...identity,'fechaTasacion','tasacion','rentaMensualSolicitada'],
  'Publicados':[...identity,'fechaPublicacion','operacion'],
  'Alquilados':[...identity,'fechaAlquiler','rentaMensual','comision','fechaFinAlquiler'],
  'Vendidos':[...identity,'fechaVenta','precioFinal','comision'],
  'Retirados / cancelados':[...identity,'fechaSalida','motivoLiberacion'],
  'Motivos de liberación':[...identity,'fechaSalida','motivoLiberacion'],
  'Histórico de inmuebles':[...identity,'fechaSalida','motivoLiberacion'],
  'Posición ocupada':[...identity,'fechaInicioPosicion','fechaFinPosicion','activaPosicion'],
  'Posiciones disponibles':['zona','posicion','estado'],
  'Tiempo de permanencia':[...identity,'fechaRegistro','fechaSalida','dias'],
 };
 const preferred=report.includes('→')?[...identity,'fechaInicioFlujo','fechaFinFlujo','dias']:specific[report]||[...identity,'operacion','situaciones','fechaRegistro'];
 return preferred.filter(key=>available.includes(key));
}
