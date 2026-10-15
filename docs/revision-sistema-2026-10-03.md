> Referencia de versión: consultar [Estado actual](estado-actual-2026-10-15.md) antes de usar los pendientes o instrucciones de este documento. Se conserva el contenido como registro de su revisión.

# Revisión del sistema — 3 de octubre de 2026

Se revisaron las páginas y API de cartera, registro de inmuebles, ficha, propietarios, visitas, tasaciones, preparación/publicación, liberación, panel, reportes, autenticación y archivos del hosting. La revisión combina lectura del código, consultas de integridad y pruebas de los flujos con registros temporales.

## Problemas corregidos

| Problema | Resultado |
|---|---|
| El panel contaba asignaciones históricas como ocupación actual. | Cuenta únicamente asignaciones activas. |
| Cartera y reportes suponían siempre 90 posiciones disponibles/habilitadas. | Consultan las posiciones habilitadas y sus asignaciones actuales. |
| Liberación omitía los inmuebles registrados sin propietario. | Permite seleccionar y liberar también esos inmuebles. |
| La ficha impedía completar el propietario cuando no estaba vinculado. | Permite vincularlo mediante DNI, nombres y apellidos. |
| Guardar datos de inmueble y propietario podía dejar cambios parciales. | Se validan antes y se guardan en una transacción. |
| Ediciones parciales borraban campos omitidos; dimensiones inválidas se aceptaban o borraban silenciosamente. | Conserva campos omitidos y rechaza medidas negativas, habitaciones fraccionarias y valores inválidos. |
| La API de tasación no comprobaba la visita ni la posición previas. | Exige inmueble activo, posición activa y visita completada. |
| Acciones simultáneas podían duplicar liberaciones o competir con visitas/tasaciones/publicaciones. | Bloquean primero el inmueble dentro de la transacción. |
| Fechas imposibles se normalizaban al mes siguiente; el límite dependía de UTC o del equipo. | Valida fechas reales y usa el calendario de Perú. |
| Una visita incompleta posterior podía ocultar una visita ya completada en los indicadores. | El requisito de visita se basa en las visitas completadas, igual que las bandejas. |
| Reportes ignoraba las fotos al determinar material pendiente. | Comprueba texto y fotos alojadas en el hosting. |
| Publicación seguía exigiendo un enlace de Google Drive. | Usa la galería existente; requiere texto y una foto para preparar/publicar. Conserva campos históricos de BD sin exigirlos ni mostrarlos en ese flujo. |
| Recargar la pantalla de visitas hacía perder la selección de fotos ya subidas. | Recupera las fotos propias no vinculadas y permite seleccionar hasta 20. |
| Respuestas antiguas podían reemplazar una galería actualizada. | Aplica únicamente la respuesta de carga más reciente. |
| Confirmaciones de liberación y descarte usaban ventanas del navegador. | Usa diálogos integrados con foco y bloqueo durante la operación. |
| Rutas antiguas mostraban datos ficticios o un módulo en construcción. | `/nuevos` conduce a visitas pendientes y `/tasaciones-pendientes` a registrar tasaciones. |
| Botón de menú móvil podía superponerse al encabezado. | Reserva espacio superior en las páginas móviles. |

## Integridad de los datos existentes

Consulta de solo lectura antes de las pruebas temporales:

- Activos sin posición: **0**.
- Posiciones con asignación activa duplicada: **0**.
- Inmuebles con varias posiciones activas: **0**.
- Inactivos con posición activa: **0**.
- Fotos vinculadas a visitas de otro inmueble: **0**.
- Inmuebles con varias portadas: **0**.
- Tasaciones sin visita completada: **0**.
- Visitas completadas sin fotos vinculadas: **2**.
- Activos sin propietario: **1**.

Estos conteos corresponden a la revisión inicial. Después, por solicitud expresa del usuario, se agregaron imágenes generadas con IA y marcadas «SOLO PRUEBA» a las visitas de las posiciones 11 y 7, y se vinculó a Mateo Salazar (ficticio), con DNI de ejemplo 00000000, al inmueble «Casa prueba». La consulta posterior confirmó 0 visitas sin fotos vinculadas y 0 activos sin propietario. Estos ejemplos deben reemplazarse por datos reales cuando corresponda. La consulta puede repetirse con `node scripts/audit-system.mjs`.

## Alcance y límites

Las pruebas de integración usan cuentas/inmuebles temporales, un servicio HTTPS de archivos aislado y limpieza al terminar. No escriben en los archivos reales del hosting.

No hubo un navegador automatizado disponible para verificar visualmente tamaños, gestos o navegación con teclado de extremo a extremo. Los ajustes visuales se revisaron en el código y deben comprobarse también en móvil y escritorio.

Se corrigieron los **14 errores y 5 avisos** detectados en los módulos activos. `npm run lint -- --max-warnings=0` pasa sin errores ni avisos. Se definieron tipos para filas/resúmenes de reportes y tasaciones, se eliminaron variables sin uso, y el logo usa Next Image. Las cargas de pantalla actualizan estado desde respuestas asíncronas y cancelan solicitudes al desmontar. Reportes conserva filtros pendientes hasta pulsar «Generar reporte»; una respuesta anterior no reemplaza una consulta nueva. La posición seleccionada se deriva de la disponibilidad sin un efecto de sincronización.

El análisis general también detectó un registro de pruebas sin uso, que se eliminó. Las copias históricas `backup-dinamizacion-*` quedan fuera de ESLint porque son archivos de respaldo, no módulos de la aplicación. Las reglas de comprobación del código activo permanecen habilitadas.

## Validación de las correcciones

- Compilación de producción con webpack y comprobación de TypeScript: correctas.
- Ocho archivos de pruebas unitarias: correctos.
- Integración del flujo de fotos ampliada a propietario, visita, tasación, publicación sin Drive y liberación concurrente: correcta. Comprueba que panel, cartera y reportes coinciden en disponibilidad.
- Integración de autenticación: correcta para acceso anónimo, cookies falsas, administrador, operador, cierre de sesión y revocación.
- `git diff --check`: correcto.
- Integración de precios: correcta; permite editar el precio después de publicar, conserva los otros precios y la publicación, y registra el cambio en el historial.

La publicación en Vercel forma parte de la actualización solicitada. La revisión visual en móvil/escritorio y las pruebas desde el dominio desplegado quedan a cargo del usuario.
