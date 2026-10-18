# Repositorio y estado de entrega

Referencia consolidada actualizada el 18 de octubre de 2026.

Reorganización posterior: [Fichas de venta y alquiler por operación y zona](docs/ficha-ventas-alquileres-2026-10-18.md).

Ajuste posterior: [Dirección referencial en Cartera y prioridades sin duplicación](docs/cartera-direccion-prioridades-2026-10-18.md).

Actualización posterior: [ID con contacto y dos formas de liberar](docs/liberacion-definitiva-2026-10-18.md). Consultar su evidencia de publicación y respaldo.

Última entrega de datos: [Carga de Tortugas, Huarmey, Casma, Lima y Trujillo](docs/carga-cinco-zonas-2026-10-18.md), 18 inmuebles recién registrados y 18 visitas pendientes, conservando las 46 fichas actuales de Chimbote/Nuevo Chimbote. La entrega previa de [Chimbote](docs/carga-chimbote-2026-10-18.md) conserva su evidencia histórica. Entrega de interfaz: [Orden del menú de Seguimiento](docs/orden-menu-seguimiento-2026-10-18.md), publicado y comprobado en escritorio/móvil. La entrega de [Fichas de venta y alquiler por operación y zona](docs/ficha-ventas-alquileres-2026-10-18.md) conserva su evidencia de publicación y prueba autenticada. La entrega de [Dirección referencial en Cartera y prioridades sin duplicación](docs/cartera-direccion-prioridades-2026-10-18.md) conserva su evidencia histórica. La entrega previa de [liberación definitiva](docs/liberacion-definitiva-2026-10-18.md) conserva su evidencia y punto de respaldo privado. La entrega anterior de [Listado de archivos](docs/listado-archivos-2026-10-18.md) conserva su evidencia histórica.

## Repositorio

- GitHub: https://github.com/darkcystian15-rgb/inmobiliaria-alfaro
- Copia local: `/workspaces/app-alfaro-git/inmobiliaria-alfaro`.
- El directorio padre pertenece a otro repositorio, `Cystian/app-alfaro-git`. Ejecutar Git dentro de la carpeta de la aplicación.
- `main` y `feat/registro-simplificado` contienen la misma entrega, integradas mediante fast-forward y sincronizadas con GitHub sin reescribir historial.
- Último código de aplicación publicado: `3351b6e90d17c4e4b37a65537a5066277dfe1105`.
- Los commits posteriores de evidencia/documentación no alteran ese código. Consultar las ramas para el último commit documental.

## Producción

| Dato | Evidencia del 18 de octubre |
| --- | --- |
| Proyecto | `puma19/inmobiliaria-alfarov2` |
| Dominio de la intranet | https://intranet.inmobiliariaalbertoalfaro.com.pe |
| Código | `3351b6e90d17c4e4b37a65537a5066277dfe1105` |
| Despliegue GitHub | `7154933132`, entorno `Production` |
| Estado informado por Vercel a GitHub | `success`, `Deployment has completed` |
| Fecha del estado | 2026-10-18 13:02:42 UTC |
| URL de versión | https://inmobiliaria-alfarov2-a8o99cbs6-puma19.vercel.app |

Se consultaron las API de despliegues y estados de GitHub para el SHA indicado; Production y Preview completados. La entrega incorpora el procedimiento manual ya ejecutado de [carga de Chimbote](docs/carga-chimbote-2026-10-18.md). La comprobación autenticada confirmó 43 fichas en sus posiciones, 43 visitas pendientes, siete posiciones libres y conservación de las ocho fichas de las demás zonas, con escritorio/móvil correctos. Publicar no vuelve a ejecutar la carga. El [orden del menú](docs/orden-menu-seguimiento-2026-10-18.md) y las [fichas de venta y alquiler](docs/ficha-ventas-alquileres-2026-10-18.md) conservan sus evidencias previas.

## Presentación uniforme vigente

- Título: nombre del contacto.
- Descripción operativa: operación, tipo y ubicación referencial escrita; sin añadir distrito, provincia, departamento ni zona a la dirección.
- ID visible base: número de orden estable, operación, tipo y ubicación referencial. Ejemplo: `012-venta-local-av meigss c3`. En el detalle de Cartera y Listado de archivos se añade el contacto al final y se evita repetirlo en un bloque separado del detalle.
- Si falta la dirección, se indica «Ubicación por completar»; no se sustituye por contacto ni geografía.
- La zona identifica el contexto comercial de cartera. La posición reutilizable y el ID numérico de base no sustituyen al número de orden del identificador.
- Cartera, fichas, visitas, tasaciones, publicaciones, cierres, contratos y agenda comparten el criterio. Reportes usa el mismo ID/contacto en tabla, PDF y Excel.
- Se conservan códigos persistidos, enlaces antiguos, historial y geografía guardada. Se admite búsqueda por ID visible o código anterior en los filtros ajustados.

## Funcionalidad acumulada

- Cartera por zonas comerciales y posiciones, independiente de la geografía. Crear una zona en `/ubicaciones` genera diez posiciones; se conservan capacidades anteriores.
- Captación con posición libre, operación, tipo, ubicación referencial y contacto independiente por inmueble. Departamento, provincia y distrito opcionales en la ficha.
- Operación, tipo, contacto y dirección referencial editables por administrador desde Cartera. Cambiar operación exige inmueble activo sin precios ni publicación preparada.
- Visitas y evidencia fotográfica, precios acordados, preparación y confirmación de publicación, cierres, contratos de alquiler, renovación manual y reingreso con antecedentes.
- Publicación con archivo DNI del vendedor/gerente, tasación, foto de visita completada y texto, además de las condiciones de precios. Sin exigencia de DNI numérico.
- Prioridades de trabajo muestra contacto y una sola descripción de operación, tipo y dirección, sin repetir el ID debajo.
- Sin mapas, coordenadas, importador de puntos ni geolocalización.
- Estadística agrupa Listado de archivos y Reportes. Listado consulta tasaciones, contratos de alquiler, minutas y escrituras cargadas, con filtros automáticos de zona/tipo y archivos numerados.
- Seguimiento muestra Registrar inmueble, Liberar inmueble, Visitas pendientes, Registrar visitas, Tasaciones y textos pendientes y Registrar tasaciones, en ese orden. Operación conserva Cartera de inmuebles.
- Liberar inmueble pertenece a Seguimiento y exige zona tanto en pantalla como en servidor. Permite cerrar una operación realizada conservando su Histórico o eliminar definitivamente con motivo y dos confirmaciones. La limpieza privada pendiente tiene reintento durable. El acceso a Contratos de alquiler se reemplaza en el menú, conservando registros y ruta anterior.
- Expediente con un vendedor y un comprador, asignación expresa del comprador, condiciones por persona natural/jurídica, siete grupos documentales, porcentaje y alertas. Los faltantes no bloquean el cierre. Venta conserva sus condiciones. Alquiler usa cinco grupos documentales propios, con arrendador y arrendatario; consultar la reorganización del 18 de octubre.
- Información de inmuebles filtra su selector por zona y usa una sola descripción. Inmueble contiene documentos; Visitas integra fotos, y Seguimiento concentra responsables, plazos e historial. Se retira de la interfaz la pestaña antigua de geografía y superficies, conservando sus datos almacenados.
- Archivos privados PDF, Word, Excel e imágenes, máximo 4 MB tras compresión de imágenes. Vista previa de imágenes/PDF y descarga de Word/Excel. Eliminación por administrador.
- Permisos, historial, reportes y protección de concurrencia; conflictos de versión del expediente devuelven HTTP 409.

## Validación

- 27 archivos de pruebas unitarias correctos tras añadir eliminación definitiva.
- ESLint sin errores ni advertencias.
- Compilación final de producción con Webpack y TypeScript correcta fuera del sandbox.
- Comprobación directa de ID/contacto compartidos por tabla, PDF y Excel y preservación de importes.
- Enlaces locales y `git diff --check` correctos.
- Integración completa con MySQL 8.4 local desechable y navegador: filtros rápidos, numeración de 53 tasaciones, paginación, permisos, subida y cierre por zona.
- Prueba autenticada real de producción correcta, sin escrituras de negocio; cuentas y sesiones de verificación eliminadas. Capturas privadas locales y de producción, excluidas de Git.

## Datos, recuperación e historial

Última carga: cinco fichas anteriores de Tortugas, Huarmey, Casma, Lima y Trujillo eliminadas con sus relaciones y tres archivos privados; 18 fichas nuevas en las posiciones aceptadas, con 18 visitas pendientes. Se conservó el estado más reciente de Chimbote/Nuevo Chimbote, incluidas sus ediciones concurrentes. Respaldo privado: `restore-points/cinco-zonas-20261018-v3/`. Consultar [carga de cinco zonas](docs/carga-cinco-zonas-2026-10-18.md) para selección, comprobación y recuperación.

Chimbote se reemplazó el 18 de octubre: 14 fichas anteriores eliminadas con sus relaciones y cinco archivos privados; 43 altas nuevas, 10 ventas y 33 alquileres, en las posiciones de Drive, con 43 visitas pendientes. Siete posiciones libres y ocho fichas de otras zonas conservadas. Respaldo privado de 25 tablas y nueve archivos en `restore-points/chimbote-20261018/`. Consultar [carga de Chimbote](docs/carga-chimbote-2026-10-18.md) antes de recuperar o trabajar en otra zona. No repetir el script de carga al desplegar.

Las migraciones de registro simplificado, zonas y expediente constan como aplicadas en la evidencia del 15–16 de octubre. La entrega de eliminación definitiva requiere la tabla técnica `inm_eliminaciones_pendientes`, cuya instalación consta como aplicada y cuya existencia se volvió a comprobar sin escrituras. Punto de respaldo: `restore-points/liberacion-definitiva-20261018T022959Z/`, con fuente, bundle Git, instantánea de negocio, archivos privados y hashes. Consultar el documento de la entrega para alcance y recuperación. No repetir `--apply` para verificar o publicar documentación. Los conteos de documentos anteriores son históricos.

Los respaldos, capturas y secretos son privados y no forman parte de Git. Antes de restaurar, comprobar existencia, hashes, identidad de base y cambios posteriores.

Esta referencia consolida el estado. Los demás Markdown preservan decisiones y evidencias de sus fechas. Las referencias antiguas a mapas, DNI numérico, propietarios compartidos, `main` atrasado o publicaciones pendientes no sustituyen este estado. Para detalles, leer [corrección del 18 de octubre](docs/identificacion-cartera-2026-10-18.md), [expediente del 16](docs/expediente-operacion-2026-10-16.md) y [retirada de mapas](docs/retirada-mapas-2026-10-15.md).
