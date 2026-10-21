# Portal web — publicación de inmuebles y portada

Entrega del 21 de octubre de 2026. Intranet: `darkcystian15-rgb/inmobiliaria-alfaro`.
Portal: `darkcystian15-rgb/app-alfaro-git`.

## Resultado

El grupo **Portal web** ofrece **Inmuebles por publicar**, **Publicaciones activas**
y **Portada del sitio**. Funciona con publicación normal al portal. Las verificaciones
con anuncios ficticios se ejecutaron en entornos locales aislados; la interfaz no es
un simulador. La instalación no publica fichas ni reemplaza el carrusel existente.

Los administradores preparan borradores, seleccionan fotos, revisan una vista previa
y publican cuando se cumplen las condiciones. Los operadores conservan sus permisos
de información; las páginas y APIs nuevas requieren administrador. El botón está
bloqueado mientras faltan requisitos o hay cambios sin guardar. El servidor repite
todas las validaciones para rechazar peticiones directas que intenten saltar la interfaz.

## Condiciones y datos faltantes

El listado muestra progreso, estado y los primeros faltantes. Al abrir la ficha se
muestran los 21 requisitos y enlaces para completarlos:

1. Inmueble activo y operación venta/alquiler.
2. Tasación aprobada, archivo de tasación y documento de identidad del propietario.
3. Fotografías de una visita completada y texto preparado en el flujo interno.
4. Indicar si se creará un anuncio nuevo o se vinculará uno existente por su ID web.
5. Tipo compatible con el catálogo público, título comercial y descripción suficientes.
6. Ubicación pública autorizada y distrito; la dirección interna no se copia automáticamente.
7. Precio positivo con moneda y modalidad, o la selección explícita «Consultar precio».
   Alquiler utiliza importe mensual; venta admite total o por unidad.
8. Superficie confirmada: terreno para terrenos, construida para departamentos y al
   menos una de las dos para los demás tipos. Datos desconocidos se dejan vacíos.
9. Superficies y cantidades válidas; baños, habitaciones y cocheras opcionales sin
   negativos o fracciones en cantidades enteras.
10. Al menos una foto válida del propio inmueble, sin duplicados, con portada entre
    las seleccionadas. Las imágenes pueden ordenarse y recibir descripciones.
11. Autorización explícita de datos/ubicación y permiso de uso de las fotos.
12. Revisión de la versión actual de la ficha interna y borrador guardado.

Los documentos y el precio interno sirven para validar el expediente. El contenido
enviado se construye con una lista explícita de campos públicos; no se exportan
propietarios, DNI, contratos, tasaciones, contactos privados ni observaciones internas.
Las condiciones de alquiler son texto comercial propio, independiente del resultado
económico de contratos cerrados.

## Borrador y publicación activa

La ficha ofrece Datos del anuncio, Fotos para web, Vista previa y Publicación. Se
puede consultar el borrador actual o la versión enviada al portal. Editar un borrador
no cambia la versión pública hasta pulsar **Actualizar en la web**. Modificar datos
o fotos desmarca las autorizaciones en el editor para exigir su revisión.

Cada borrador tiene versión y huella de sus datos de origen. Se rechaza un guardado
si otro administrador lo cambió, o si la ficha de origen cambió desde su lectura.
Publicar vuelve a comprobar expediente, disponibilidad de fotos, versión y permisos.
El título admite 100 caracteres, descripción hasta 8000 (también limitada por su
representación HTML pública), ubicación 250 y distrito 25, conforme al contrato actual
del portal. Las descripciones públicas se tratan como texto y se escapan al integrarlas.

El receptor confirma el ID público. Solo entonces se muestra el envío como confirmado.
Si falla, queda registrado con error o pendiente y se ofrece reintento. El estado
deseado y su revisión se guardan antes de la llamada remota, de modo que una interrupción
no borra la intención del cambio. Los reintentos conservan la revisión; el portal
rechaza revisiones anteriores y reconoce una repetida con contenido idéntico.

El listado de activas permite preparar cambios, suspender, retirar y reintentar. La
suspensión/retirada exige motivo; el historial registra usuario, acción, versión y fecha.
Las publicaciones retiradas o suspendidas se conservan en los filtros del mismo listado.
Las acciones afectan al canal web; el registro histórico de anuncios manuales en otros
canales conserva su significado independiente.

## IDs y catálogo anterior

La relación usa el ID interno estable del inmueble, nunca su posición reutilizable
en una zona. Un nuevo envío del mismo inmueble actualiza el mismo ID del portal.
Para anuncios anteriores se selecciona «Vincular un anuncio existente» y se introduce
su ID público. El receptor verifica que exista, proceda del catálogo heredado y no
esté vinculado a otro inmueble; conserva su enlace. Esta vinculación es una decisión
del administrador: no se deduce por contacto, foto, posición o parecido del título.

Los 64 anuncios previos permanecen intactos al instalar el receptor. No se vinculan
masivamente con las 133 fichas que se observaron en la intranet durante la consulta
de solo lectura del 21 de octubre. Esos conteos tienen fecha y no son constantes del sistema.
Los filtros del portal contemplan el tipo canónico aunque el título comercial no
repita «Casa» o «Departamento». «Consultar precio» se representa como ausencia de
importe público, en lugar de mostrar cero.

## Portada del sitio

Permite subir JPG/PNG/WebP de hasta 4 MB, elegir hasta diez diapositivas, ordenar,
activar, definir título/texto, botón interno y encuadre. Las imágenes se validan por
contenido, se comprimen a WebP y se guardan en el hosting configurado. Se exige al
menos una imagen activa y autorizada, con título y destino interno válido si hay botón.
Guardar no modifica el inicio público; se pulsa **Actualizar portada en la web**
después de revisar y cumplir las condiciones. El portal mantiene su portada actual
hasta recibir una configuración aprobada.

Portada del sitio, foto de portada del inmueble e inmuebles destacados son funciones
distintas. El destacado se configura por inmueble; la foto principal se selecciona
entre sus fotos públicas; el carrusel general se administra en Portada del sitio.

## Conexión y almacenamiento

Comunicación de servidor a servidor con secreto compartido, credenciales solo en
Production y URLs de destino configuradas por el servidor. El navegador no recibe el
secreto. La ruta bridge verifica su autorización propia; constituye la única excepción
nueva al filtro inicial de cookie del proxy, no una API sin autenticación.

Las imágenes públicas se sirven mediante un receptor que comprueba publicación y
selección antes de pedir el archivo al bridge. Los archivos del expediente siguen en
sus rutas privadas. El bridge entrega únicamente imágenes de anuncios autorizados o
diapositivas activas. No expone rutas del hosting ni documentos de identidad. Las
respuestas de catálogo y contenido usan `no-store`; terceros pueden conservar sus copias.

Configuración de intranet: `PORTAL_WEB_SYNC_URL`, `PORTAL_WEB_SYNC_TOKEN`,
`PORTAL_WEB_ORIGIN`. Configuración del portal: `INTRANET_WEB_SYNC_TOKEN`,
`INTRANET_WEB_BRIDGE_URL`. Las variables históricas MySQL y hosting se conservan.

Instalación aditiva de intranet: `db/migrations/0030_portal_web.sql`, mediante
`scripts/install-portal-web.mjs`; tablas `inm_portal_web` e `inm_portal_web_eventos`.
El instalador es una vista previa salvo `--apply`; en remoto exige además
`--allow-additive-production-schema`. No hay migraciones automáticas al arrancar.

En el portal se instala `portal_intranet_sync`, un indicador de precio a consultar
y la adaptación de la vista pública correspondiente. Las fichas heredadas conservan
su representación porque ese indicador comienza desactivado. La copia local cifrada
previa se conservó privadamente; no se publican secretos ni respaldos en Git.

## Pruebas y evidencia

- 33 archivos unitarios de la intranet aprobados; ESLint sin advertencias y build
  Webpack/TypeScript correcto. El primer build dentro del sandbox no pudo leer la
  configuración de TypeScript; la compilación fuera del sandbox pasó.
- [Integración completa](evidencia-portal-web/INTEGRACION.json): dos bases MySQL locales
  nuevas, almacenamiento HTTPS en memoria y datos exclusivamente ficticios. Venta y
  alquiler, campos obligatorios, denegación a operadores, rechazo de otro origen,
  versión desactualizada, ID estable, vinculación heredada sin duplicación, precio a
  consultar, fotos públicas y documentos privados, suspensión, fallo/reintento y
  condiciones de portada comprobados.
- Navegador de las tres pantallas en escritorio y a 375 px, cero errores de ejecución
  y sin desborde horizontal. Botón de publicar deshabilitado en una ficha incompleta.
- Portal: pruebas existentes, fase 3 y nuevas pruebas de autorización, enlaces de
  portada y acceso a imágenes para tarjetas sociales aprobadas; build Vite correcto.
- Instaladores aplicados sin modificar fichas comerciales ni enviar anuncios reales.
  [Comprobación real de producción](evidencia-portal-web/PRODUCCION.json): los tres
  apartados autenticados y sus vistas móviles funcionan, con 21 requisitos por ficha,
  publicación y portada bloqueadas por faltantes, secreto de conexión comprobado y
  ningún cambio de datos comerciales. La cuenta/sesión temporal se eliminó al terminar.

## Publicación comprobada

- Intranet: código funcional `1392d1acd9eced194abcf11478261b0d1a1dc5f1`, despliegue
  `dpl_46x3Hf1CX8p4JucpE4NzFZT5a7xb`, Production `READY` y dominio
  https://intranet.inmobiliariaalbertoalfaro.com.pe.
- Portal: código funcional final `a4fdfd28dfe9d71589546556e558c027d7d6acfd`, despliegue
  `dpl_7qGPdEkaY85U3zuSkj8KNsG6pVHW`, Production `READY` y dominio
  https://app-alfaro-git-smoky.vercel.app.
- Verificación autenticada del 21 de octubre a las 22:46 UTC: 133 fichas internas,
  64 anuncios públicos y contenido de inicio conservados. La publicación de anuncios
  y el cambio de carrusel se ensayaron con datos ficticios en MySQL local, no con clientes.
- El primer receptor desplegado tuvo un error de carga ESM/CommonJS específico de
  Vercel; se corrigió usando el formato del resto de sus módulos de servidor y se
  verificó el arranque real. También se comprobó idempotencia después de que MySQL
  reordena las claves JSON, para tolerar reintentos tras una respuesta perdida.
- Esta evidencia se incorpora en un commit posterior al código funcional; después
  se vuelve a contrastar GitHub, Codespaces y el despliegue final. Los SHA anteriores
  identifican el código funcional sobre el que se realizó la comprobación, no el
  commit documental que contiene el resultado de esa misma comprobación.

## Operación y límites

La publicación se realiza expresamente desde Portal web. La captura de un inmueble,
la aprobación de su tasación o marcar un anuncio manual como publicado no lo envían
por sí solos. Antes de cerrar, eliminar o dejar de ofrecer un inmueble, el responsable
debe retirarlo o suspenderlo desde Publicaciones activas y comprobar la confirmación.
Esta entrega no incorpora sincronización automática de los cierres ni un proceso de
reintentos en segundo plano. El estado pendiente se recupera mediante la acción visible.

La integración se verificó con datos ficticios de extremo a extremo. La comprobación
en producción conserva el contenido real: no se publica una ficha de cliente para
demostrar el envío. Los anuncios anteriores requieren revisión y vinculación explícita.

La revisión independiente de Claude no está disponible en este entorno. Se deja la
entrega y la evidencia listas para revisión, sin atribuir una revisión no recibida.

## Recuperación

Conservar los despliegues previos de ambos proyectos. Volver al código anterior no
requiere borrar las tablas nuevas, ni copiar la base de Cystian. Si ya hubo publicaciones,
suspender o retirar desde la versión que tenga el módulo operativo antes de recuperar
el código. No eliminar tablas con borradores, vínculos o eventos sin extraerlos y
revisarlos. Retirar solo las variables nuevas si se deshabilita la integración completa;
no cambiar las conexiones MySQL o el hosting privado del resto de la intranet.
