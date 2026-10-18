> Estado consolidado: [Repositorio y estado de entrega](../REPOSITORIO.md). Este documento conserva la evidencia de su fecha; los estados de despliegue, conteos y pendientes históricos deben interpretarse según esa referencia.

> Referencia de versión: consultar [Estado actual](estado-actual-2026-10-15.md) antes de usar los pendientes o instrucciones de este documento. Se conserva el contenido como registro de su revisión.

# Mapa funcional revisado del sistema

Revisión: 15 de octubre de 2026. Base: `darkcystian15-rgb/inmobiliaria-alfaro`, rama `main`, commit `cf4f5f0f55be5fe400c5e823861f89cfb4bcd868`.

Esta referencia describe el comportamiento anterior al registro simplificado. Para la actualización posterior, ver [Registro simplificado](registro-simplificado-2026-10-15.md). Describe el comportamiento observado en el código de la base indicada. No propone nuevas reglas ni acredita el estado de los datos de producción. Se revisaron navegación, pantallas principales, autorizaciones, APIs de negocio, esquema de datos, almacenamiento y reglas de reportes. No se consultó la BD de producción ni el panel de Vercel; no se ejecutaron migraciones, instaladores, semillas ni pruebas que escriben en servicios externos.

## 1. Arquitectura y despliegue

- Next.js App Router, React y TypeScript. Pantallas privadas y APIs viven en la misma aplicación.
- MySQL con `mysql2` y Drizzle. `lib/db.ts` exige `DATABASE_URL`, utiliza un pool de cinco conexiones y permite activar TLS verificado mediante `DATABASE_TLS_REQUIRED` o `DATABASE_SSL_CA`.
- Según `docs/uniformizacion-inmuebles-2026-10-12.md`, producción se publica desde este repositorio en `puma19/inmobiliaria-alfarov2`, dominio `https://intranet.inmobiliariaalbertoalfaro.com.pe`. Esto es evidencia documental; falta confirmar el commit desplegado en el panel.
- Documentos e imágenes: aplicación → API Next.js → HTTPS con token privado → `documentos.php` en cPanel → directorio privado. MySQL conserva metadatos y rutas, no los bytes.
- Las variables `DOCUMENT_HOSTING_URL` y `DOCUMENT_HOSTING_TOKEN` habilitan el almacenamiento. No se utiliza Vercel Blob en el flujo actual.
- El archivo `.vercelignore` excluye dependencias, compilaciones, variables de entorno, copias y puntos de recuperación. No hay un flujo de GitHub Actions de despliegue versionado en la copia revisada.
- La asociación GitHub/proyecto y las credenciales de Vercel no se pueden deducir completamente del código; se administran fuera de Git.

## 2. Usuarios y acceso

| Acción | Administrador | Operador y otros roles no administradores |
| --- | --- | --- |
| Panel, cartera y bandejas | Sí | No |
| Registrar inmueble, visita, precios y publicación | Sí | No |
| Cerrar operación, contratos y reingresos | Sí | No |
| Consultar fichas activas e históricas | Sí | Sí |
| Corregir datos del inmueble y propietario | Sí | Sí |
| Subir documentos y evidencia de visitas existentes | Sí | Sí |
| Editar nombre/observación de fotos y portada | Sí | Sí |
| Eliminar documentos y fotos | Sí | No |
| Cambiar venta/alquiler antes de precios o publicación | Sí | No |
| Asignar responsables/plazos y editar anuncios externos | Sí | No |
| Consultar seguimiento y anuncios desde la ficha | Sí | Sí |
| Administrar usuarios, catálogos y seguridad | Sí | No |

Fuentes: `lib/auth.ts`, `lib/access.mjs`, layouts privados y autorizaciones de cada API. Los permisos se comprueban en servidor; ocultar botones no es la única protección.

- El administrador entra al panel `/`; el operador a `/datos-inmuebles`.
- La sesión tiene máximo de ocho horas y expira además tras treinta minutos de inactividad según `findSession`.
- Las escrituras requieren un `Origin` del mismo sitio. La cookie es HttpOnly, SameSite=Lax y Secure en producción.
- Hay límite de intentos y bloqueo temporal por contraseña incorrecta. El segundo factor de administrador se exige solo con `AUTH_LOGIN_MFA_REQUIRED=1`; no asumir que está activo en Vercel.
- Cambios de accesos exigen autenticación reciente de cinco minutos. Cambiar usuario, contraseña, rol o activación revoca sesiones.
- No se permite desactivarse o quitarse el rol administrador, ni dejar al sistema sin administrador activo.

## 3. Identidad, posición y estado son conceptos distintos

- `id`: identidad numérica permanente y clave de las relaciones.
- `numeroOrden`: correlativo permanente obtenido con bloqueo de la secuencia dentro de una transacción.
- `codigo`: se genera como `001-CASA-NOMBRE`. Puede cambiar si se corrige nombre o tipo desde la ficha; se conserva el código anterior como alias.
- `posicion`: lugar reutilizable del 01 al 90. Se ocupa al registrar y se libera al cerrar. No es el número correlativo ni el ID.
- `estado`: activo o inactivo en la BD; la interfaz agrupa los no activos como Histórico.
- El avance se reconstruye principalmente desde visitas, tasación, expediente y publicación. No debe implementarse un cambio de flujo suponiendo que basta actualizar `inm_inmuebles.etapa`.
- Cartera activa se determina por estado. Algunas colas exigen además posición activa. Una anomalía de asignación puede, por ello, producir diferencias entre cartera y pendientes.
- Los campos antiguos de datos de prueba siguen en el esquema, pero la revisión actual cuenta todos los inmuebles según los filtros de negocio.

## 4. Registro o captación

Pantalla `/registrar-inmueble`; APIs `/api/posiciones`, `/api/propietarios` y `POST /api/inmuebles`.

1. Elegir posición libre, operación Venta/Alquiler, tipo del catálogo, nombre/referencia y calle/dirección.
2. El formulario actual exige dirección. Geografía y propietario pueden quedar pendientes. Si se registra propietario, se exige nombre; DNI opcional y, si existe, de ocho dígitos.
3. Departamento, provincia y distrito pueden estar todos vacíos; si se completa uno, se exige la relación completa y válida del catálogo.
4. El DNI permite buscar y reutilizar un propietario existente. Vincularlo conserva sus datos compartidos.
5. La transacción verifica y bloquea la posición, impide ocuparla dos veces, obtiene correlativo, crea inmueble activo, asigna posición y registra historial.
6. El inmueble entra a Visitas pendientes. La pantalla ofrece continuar a la visita de ese inmueble.

No se registra automáticamente visita, precio, publicación ni cierre.

## 5. Visita inicial y evidencia

Pantallas `/visitas-pendientes` y `/registrar-visitas`; `GET/POST /api/visitas`.

- Pendiente: inmueble activo, con posición activa y sin visita completada.
- El registro exige fecha real no futura según calendario de Perú.
- Permite entre una y veinte fotos, o cero solo con confirmación explícita de pendiente de evidencia.
- Para vincular las fotos iniciales, deben ser imágenes del mismo inmueble, subidas por el usuario que registra la visita y aún sin visita asignada.
- Se admite una visita completada por captación a través de esta API; no es una agenda de visitas comerciales de múltiples compradores.
- Visita completada y evidencia completa son condiciones diferentes. Una visita sin fotos permite registrar precios.
- En ficha → Visitas, administrador u operador puede adjuntar fotos a una visita completada del mismo inmueble.
- El indicador pendiente de evidencia se calcula por ausencia de fotos válidas vinculadas; no es una bandera persistente independiente.
- Subir imágenes solo a la galería general no regulariza la evidencia de la visita.
- Eliminar la última foto de visita vuelve a dejarla sin evidencia y puede dejar incompleto el expediente.

Fuentes: `app/api/visitas/route.ts`, `lib/visit-photos.mjs`, API de visitas de la ficha y API de archivos.

## 6. Tasación y precios acordados

Pantalla `/registrar-tasaciones`; API `/api/tasaciones`.

- Requiere inmueble activo, posición activa y visita completada.
- Fecha de tasación no futura e igual o posterior a la fecha de visita.
- Tres importes mayores que cero y hasta dos decimales: valoración de referencia/tasación, objetivo y precio de oferta.
- Para alquiler los mismos campos internos representan rentas mensuales de referencia, objetivo y oferta. No son precio total de venta.
- La tasación nueva se registra directamente como `aprobado`: representa precios ya acordados con el propietario. No hay aprobación ni negociación posterior obligatoria en el recorrido actual.
- Solo una tasación por inmueble en el flujo actual.
- `PATCH /api/tasaciones` cambia únicamente precio de oferta/renta mensual y observación, incluso después de publicar, mientras el inmueble siga activo.
- Conserva precio de referencia, objetivo y estado de publicación; deja historial del cambio.
- Registrar estos precios y adjuntar un documento de categoría TASACION son tareas independientes.

## 7. Expediente, texto y publicación

Pantalla `/tasaciones-textos-pendientes`; API `/api/publicaciones`.

El expediente exige simultáneamente:

1. DNI de propietario registrado de ocho dígitos.
2. Archivo de categoría `DNI_PROPIETARIO` alojado en hosting.
3. Archivo de categoría `TASACION` alojado en hosting.
4. Al menos una imagen `FOTO_INMUEBLE` alojada en hosting y vinculada a una visita completada del mismo inmueble.
5. Texto de publicación no vacío.

No se exige en esta comprobación copia literal, contrato, coordenadas ni metraje. Los enlaces externos no cumplen los requisitos de archivos. Tampoco basta un archivo de categoría TEXTO_PUBLICACION: el texto se guarda en la publicación.

- Antes de crear publicación, la bandeja ofrece inmuebles con tasación aprobada y sin publicación.
- `POST` comprueba inmueble activo, tasación aprobada, expediente con el texto enviado y ausencia de publicación previa; crea una publicación con `publicado=false`.
- Esta acción equivale a preparar texto/material. Si está completo, queda listo para publicar.
- `PUT` con texto edita el material de la misma publicación; también permite editar después de publicada. No crea otra publicación.
- `PUT` sin texto confirma manualmente que se publicó, vuelve a validar expediente y guarda usuario y fecha.
- No se encontró integración que publique automáticamente en Facebook, portales o una web pública.
- Si después se retira evidencia obligatoria, una publicación preparada deja de contarse como lista. Si ya estaba publicada, conserva esa marca y muestra pendientes del expediente.
- La bandeja carga por separado pendientes sin publicación, preparados completos/incompletos y publicados; la interfaz reúne los preparados completos e incompletos en su sección, mostrando sus requisitos.

Fuentes: `lib/publication-checklist.mjs`, `lib/publication-readiness.ts`, `app/api/publicaciones/route.ts`.

## 8. Anuncios externos

Ficha → Publicación; `/api/inmuebles/[id]/anuncios`.

- Registro manual de canal, enlace HTTP/HTTPS, fecha no futura y precio publicado positivo.
- El administrador crea y actualiza anuncios del inmueble activo; operador los consulta.
- Una diferencia con el precio de oferta actual o una revisión posterior del texto marca el anuncio pendiente de actualización.
- La API no sincroniza el portal externo. Registrar un anuncio tampoco marca automáticamente la publicación interna como publicada.
- La API admite registrar un anuncio de un inmueble activo sin comprobar que exista publicación interna: ambas acciones son independientes en el código.

## 9. Liberación y cierre

Pantalla `/liberar-inmuebles`; `POST /api/liberaciones`.

- Motivos: vendido, alquilado, cancelación del propietario, cancelación externa u otro. Otro exige explicación.
- Vendido solo corresponde a operación venta; alquilado solo a operación alquiler.
- Puede cerrarse un inmueble activo antes de completar visita, tasación o publicación. La API no exige esas actividades para cerrar.
- El cierre se registra confirmado en la misma operación: no hay una segunda aprobación de liberación en este recorrido.
- En una transacción: registra cierre, termina asignación de posición si existe, marca inmueble inactivo, guarda fecha de salida e historial.
- Rechaza inmueble ya inactivo o con liberación confirmada no anulada.
- No borra ficha, documentos, fotos, precios ni historial. La posición queda disponible para otra captación.

Venta: fecha de venta no futura, precio final positivo y comisión monetaria entre cero y precio final. La comisión es ingreso antes de gastos. Precio ofertado y precio final son valores distintos.

Alquiler: fecha de cierre no futura y renta mensual acordada positiva. Comisión independiente, cero si se omite; garantía y adelanto opcionales no negativos. Inicio por defecto igual al cierre, fin opcional y no anterior al inicio. No hay control de cobros mensuales ni renovación automática.

La fecha de salida del sistema es el momento de confirmar el cierre; puede diferir de la fecha comercial de venta o alquiler informada.

## 10. Contratos y reingreso de alquiler

Pantalla `/alquileres`; API `/api/alquileres`.

- Consulta cierres de alquiler confirmados y no anulados, con estado vigente, vence en treinta días, vencido o sin fecha de fin.
- Renovación manual: extiende fecha final, exige fecha no pasada y posterior a la anterior. Conserva renta mensual.
- No permite renovar el contrato anterior si ya hubo reingreso.
- Reingreso: requiere contrato vencido, ficha original histórica, ninguna captación previa originada en esa ficha y posición libre entre 01 y 90.
- Crea otro inmueble con ID, correlativo y código nuevos y referencia a `inmuebleOrigenId`.
- Copia propietario, datos físicos y ubicación. No copia visitas, precios, publicación ni archivos; deben realizarse las actividades nuevas.
- La ficha histórica y sus documentos permanecen accesibles y vinculados como antecedente.

## 11. Ficha como punto de consulta y corrección

`/datos-inmuebles`; `app/components/PropertyInformation.tsx` y `/api/inmuebles/[id]`.

- Apartados: Resumen, Propietario, Inmueble, Documentación, Fotos, Visitas, Tasación y Publicación.
- Incluye progreso, requisitos de expediente, historial y responsables/plazos.
- API admite ID numérico, código actual o código anterior. Los borradores de ficha usan el ID permanente.
- Propietario compartido: editar sus datos puede afectar varias fichas; se exige confirmación cuando corresponde.
- Cambiar DNI de un propietario identificado exige cambiar propietario explícitamente. Si el nuevo DNI existe, se vincula esa persona conservando sus datos.
- No se permite vaciar los datos de un propietario ya vinculado para desvincularlo por esa vía.
- Cambiar venta/alquiler exige administrador, inmueble activo y ausencia de tasación/publicación.
- Históricos: bloquean las actividades de avance y cambios de operación. Sin embargo, las APIs y formularios revisados permiten corregir otros datos de ficha, subir documentos/evidencia y editar fotos. No asumir que todo el histórico es de solo lectura.
- La eliminación de archivo está restringida al administrador, pero tampoco tiene bloqueo por estado histórico en la API.

## 12. Documentos y fotos

- Documentos: PDF, Word, Excel e imágenes JPG/PNG/WebP; validación de contenido y máximo de 4 MB por archivo en servidor.
- Imágenes: se convierten a WebP, corrigen orientación y reducen a un máximo de 1920 × 1920, conservando proporción.
- No se implementa subida binaria de video, aunque existe la categoría VIDEO_INMUEBLE y compatibilidad de enlaces documentales por API.
- Las fotos generales y de visita comparten galería, con distinción por `visitaId`; portada única por inmueble mediante bloqueo.
- Para leer o descargar un archivo del hosting, la API verifica sesión y pertenencia al inmueble y transmite el contenido. No expone el token de hosting al navegador.
- Rutas nuevas usan código/posición/tipo/identificador. Cambiar código no renombra archivos previos; se conservan las rutas guardadas.
- Subida: guarda bytes y después metadatos; si falla el registro, intenta retirar el archivo subido.
- Eliminación: borra bytes del hosting y metadatos; es irreversible desde la interfaz. MySQL y hosting son servicios separados, por lo que no hay una transacción distribuida completa.
- La comprobación de expediente verifica metadatos en MySQL; no consulta físicamente cada archivo del hosting. Un archivo retirado manualmente en cPanel puede seguir contando hasta regularizar sus metadatos.

## 13. Seguimiento y navegación

- Actividades asignables: visita, tasación, expediente y publicación.
- Solo administrador activo puede ser responsable. La asignación no otorga permisos adicionales a operadores.
- Administrador puede guardar responsable, fecha límite y observación por inmueble/actividad mientras esté activo.
- Agenda identifica la siguiente actividad a partir de hechos registrados y requisitos del expediente, no de una etapa manual.
- Fecha límite explícita prevalece; en su ausencia se aplica plazo configurado desde el inicio de la actividad. Plazos generales entre uno y 365 días.
- Zonas visuales agrupan por nombre de distrito normalizado; sin distrito se usa Sin zona registrada. No son nuevas carteras ni permisos territoriales.
- Los enlaces de retorno conservan contexto de filtros/zona entre las rutas admitidas.
- `/nuevos` redirige a Visitas pendientes; `/tasaciones-pendientes` a Registrar tasaciones.

## 14. Indicadores y reportes

- Panel y cartera calculan pendientes desde visitas, precios, expediente y publicaciones existentes.
- Un inmueble puede estar publicado y tener expediente pendiente a la vez. No forzar exclusividad entre esos indicadores.
- Reportes incluyen activos, posiciones disponibles, situaciones, visitas, tasaciones, material, listos, publicados, vendidos, alquilados, retirados, históricos, permanencia, ocupación y tiempos entre actividades.
- Filtros: período, estado, operación, tipo, posición y situación. Paginación de cincuenta; descarga completa con límite de diez mil registros/asignaciones. Exportación PDF/Excel en cliente.
- El significado del período cambia: vendidos por fecha de venta; alquilados por cierre de alquiler; visitas/tasaciones por sus fechas; publicados por confirmación de publicación; históricos y cancelados por salida; ocupación por inicio de asignación; otros habitualmente por registro.
- Tiempos entre etapas usan eventos del historial: miden cuándo se registraron las acciones, no necesariamente la diferencia entre las fechas comerciales introducidas.
- Aprobaciones y negociaciones antiguas siguen en esquema y algunas lecturas de compatibilidad; no son etapas nuevas obligatorias del flujo.

## 15. Catálogos y borradores

- Tipos: se pueden crear, renombrar y desactivar. Renombrar actualiza el campo tipo de inmuebles vinculados, incluidos históricos. Eliminar se bloquea si existen inmuebles vinculados.
- Geografía: departamento → provincia → distrito. Renombrar actualiza los nombres correspondientes en inmuebles; eliminar se bloquea con descendientes o inmuebles vinculados. Desactivar impide nuevas selecciones, conservando valores anteriores válidos en ediciones.
- Los catálogos están referenciados por nombres en los campos del inmueble; una modificación puede afectar varios registros.
- Borradores separados por usuario, formulario e inmueble; recuperación durante catorce días. Recuperar solo rellena formulario; guardar borrador no registra la actividad.
- Operador solo puede acceder a borradores de ficha. No se guardan bytes de archivos en el JSON del borrador.

## 16. Diferencias y puntos que requieren cuidado antes de cambios

1. Una guía antigua admite dirección pendiente, pero formulario y API actuales la exigen al registrar. Para describir comportamiento vigente prevalece el código.
2. El histórico no está congelado en todos sus datos. Una restricción o apertura futura debe especificar qué campos y acciones abarca.
3. Aprobación, negociación, etapa, enlaces Drive y marcadores de prueba conservan rastros de versiones anteriores. No activar esos recorridos solo porque existen columnas o consultas.
4. La sesión tiene inactividad máxima de treinta minutos además de las ocho horas documentadas.
5. El renombrado del tipo desde el catálogo actualiza `inmuebles.tipo`, pero esa ruta no recalcula `codigo` ni registra alias. El cambio de tipo desde ficha sí lo hace. Es una diferencia observada que debe probarse y resolverse si se modifica identidad/catálogos; no se corrigió en esta revisión.
6. Las zonas se agrupan solo por distrito: nombres iguales en diferentes provincias pueden compartir agrupación visual. Revisar si el alcance territorial crece.
7. La validación de fecha de visita no impide que sea anterior al registro. La tasación sí impide preceder a la visita. No introducir nuevas restricciones cronológicas sin precisar la regla deseada.
8. Preparar publicación y registrar anuncios externos son registros internos independientes; ninguno realiza publicación automática fuera del sistema.
9. Las comprobaciones de expediente confían en categoría, almacenamiento y relaciones de metadatos. No certifican contenido legal ni existencia física en cada consulta.
10. Algunos reportes conservan compatibilidad antigua y filtros adicionales en memoria después de la consulta paginada. Si se cambian filtros o categorías, verificar filas, total y exportación con el mismo conjunto de datos.

## 17. Referencia para futuros cambios

Para cada petición, relacionar el nombre que usa el usuario con la pantalla y acción concreta; describir el comportamiento actual y el esperado; identificar roles, inmuebles activos/históricos, operaciones venta/alquiler y efectos sobre propietarios compartidos; revisar APIs, relaciones, evidencia, historial, pendientes, indicadores y reportes afectados. Si el cambio altera datos existentes, precisar su tratamiento y revisar la migración antes de aplicarla.

Verificación local ya realizada sobre esta base: veinte archivos de pruebas unitarias pasaron; ESLint y TypeScript pasaron tras generar los tipos de rutas de Next.js. Esto no sustituye comprobar integraciones con MySQL/cPanel ni probar la interfaz y el despliegue real. La revisión funcional solo añadió esta referencia, sin cambiar comportamiento del sistema.
