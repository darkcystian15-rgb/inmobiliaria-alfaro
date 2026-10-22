# Información del inmueble por carpetas — 22 de octubre de 2026

## Alcance autorizado

El usuario pidió un explorador similar a Google Drive, con navegación desde zonas,
inmuebles filtrables como en Cartera y carpetas de información dentro del inmueble.
Autorizó implementar, respaldar, documentar y desplegar completamente en Vercel.
Solo se modifica la intranet `darkcystian15-rgb/inmobiliaria-alfaro`.

## Funcionamiento

- Información del inmueble abre las carpetas de zonas, incluidas las zonas sin fichas.
- Al abrir una zona aparecen sus inmuebles, con búsqueda por contacto/dirección/ID,
  estado, operación y tipo. Vista de cuadrícula o lista y orden por posición,
  activos primero. La presentación reutiliza el estilo de carpetas de Cartera.
- Cada inmueble abre su explorador propio. La cabecera mantiene identificación,
  contacto, operación, dirección, zona, estado y precio; la ruta permite regresar.
- Venta: DNI y poderes; Documentos del inmueble; Contratos; Impuestos y constancias;
  Recibos y pagos de servicios; Levantamiento de cargas; Tasaciones.
- Alquiler: DNI y poderes; Documentos del inmueble; Contratos; Recibos y pagos
  de servicios; Tasaciones. Se mantienen arrendador y arrendatario.
- Las demás funciones se conservan como carpetas: Resumen del inmueble,
  Estado del expediente, Visitas y fotos, Valores de tasación, Publicación,
  Seguimiento e historial (administrador) y Otros archivos conservados.
- Tasaciones documentales y valores de tasación tienen accesos distintos: uno
  gestiona archivos; el otro conserva precios, observaciones y acciones existentes.
- Cada carpeta documental muestra requisitos, archivos y estados. Cada requisito
  aplicable permite seleccionar o arrastrar archivos con su categoría precargada.
  Se revisan nombres/observación y se confirma la subida. Se conserva el formulario
  común para carga y los límites y formatos admitidos.
- DNI y poderes conserva condiciones del vendedor/comprador y nota de búsqueda
  nacional. Impuestos conserva afectación/exoneración de renta. Cargas conserva
  su activación explícita. Los textos no sustituyen archivos donde la regla actual
  no lo permite. No se cambian reglas de negocio ni requisitos de publicación.
- Los cambios de condiciones, selecciones de archivos y ediciones pendientes
  bloquean salir de la carpeta hasta guardar o descartar. Se conserva la protección
  al cerrar la página y el control de concurrencia del expediente.
- Los enlaces anteriores con `codigo` y `pestana` siguen abriendo sus funciones.
  La URL admite `carpeta` para recargar o compartir un apartado documental.

## Conservación de datos y archivos

Las carpetas son una organización de presentación sobre las categorías existentes.
No se ejecutan migraciones, movimientos físicos, eliminaciones, importaciones ni
reclasificaciones de documentos reales. Cada registro mantiene su inmueble, ID,
nombre, categoría, observaciones, enlace, ruta de almacenamiento y relación con visita.

Se muestran también los documentos cuya condición dejó de aplicar. Los tipos
anteriores se interpretan con los alias existentes; los desconocidos quedan en
Otros archivos conservados. Las fotografías mantienen su acceso en Visitas y fotos.
Las APIs, validaciones y permisos de subida/edición/eliminación siguen siendo los
existentes; desplegar o abrir carpetas no invoca esas escrituras.

## Respaldo privado previo

Base: `bd79e972dd7233131805aeb0ac8c2977800092cc`.

Carpeta privada local, excluida de Git:
`restore-points/informacion-carpetas-20261022T022052Z/`.

- `source.bundle`: historial y referencias Git; `git bundle verify` correcto.
- `working-source.tar.gz`: código y documentación local previos, incluidos cambios
  anteriores sin commit. No incluye `.env`, dependencias ni secretos de despliegue.
- `source-manifest.json`: SHA-256 del bundle y archivo de fuente.
- `business.json`: instantánea coherente READ ONLY de 27 tablas de negocio,
  esquemas y manifiesto de archivos; no incluye usuarios ni sesiones.
- `files/`: ocho copias de documentos alojados, con tamaño y SHA-256.
- `business-manifest.json`: SHA-256 de la instantánea
  `0e8964b58ba33b8e4125cd8c1214d6ab83899f42f8be5265fceb736b51977a50`.

El acceso directo al hosting no estaba configurado en el entorno local; el respaldo
se completó por las rutas autenticadas existentes de la intranet. La cuenta/sesión
temporal fue eliminada por el script al terminar. Cero escrituras de negocio.
Este respaldo es local privado; no se ha creado ni afirmado una copia externa.

Recuperación: para volver al diseño anterior, restaurar el despliegue previo de
Vercel o revertir el commit funcional de esta entrega y desplegar. No restaurar
la base ni reimportar archivos para deshacer un cambio visual. El bundle permite
recuperar el historial y el tar conserva la fuente local anterior. Una restauración
de datos es una operación independiente que debe planificarse si llegara a ser necesaria.

## Validación

- 34 archivos unitarios aprobados, incluido el caso de conservación de documentos
  no aplicables, categorías antiguas y archivos por clasificar en venta/alquiler.
- ESLint sin errores ni advertencias y TypeScript sin errores.
- Compilación Next.js/Webpack aprobada fuera del sandbox. El fallo previo al leer
  `tsc --showConfig` en el sandbox no se reproduce al compilar fuera de él.
- Integración MySQL 8.4/hosting HTTPS/navegador con datos ficticios: aprobada.
  Incluye navegación sin escrituras y comparación SQL de IDs, categorías, nombres,
  enlaces y rutas antes/después; carga en la categoría correcta por arrastre,
  varios archivos, texto alternativo, cambio de condiciones sin ocultar documentos,
  formatos rechazados y límite de tamaño, fotos vinculadas a visitas, permisos,
  enlaces antiguos y recarga de carpetas. Venta/alquiler a 1440 y 375 px sin
  errores JavaScript ni desbordes. La prueba completa conserva también las
  comprobaciones de acceso privado, concurrencia e historial de archivos.
- Durante la adaptación del ensayo se precisaron selectores de filtros/inmueble
  y se codificaron los lotes de prueba en base64 para evitar un cierre de Chromium
  al serializar un archivo de más de 4 MB como millones de números. La repetición
  completa pasó en una nueva base vacía; no se usaron datos reales.
- Últimos ajustes de revisión: etiquetas de categoría con la parte correspondiente,
  retorno bloqueado con cambios pendientes y recarga de enlaces de vendedor/comprador.
  Compilación final aprobada.
- Publicación y comprobación autenticada de producción: pendientes.

Las capturas y respaldos con documentos o datos de clientes permanecen fuera de Git.
La revisión por una persona/asistente independiente está pendiente; no se atribuye
revisión a Claude. Se preservan los cambios locales previos de coordinación.
