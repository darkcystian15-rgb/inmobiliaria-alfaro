> Referencia de versión: consultar [Estado actual](estado-actual-2026-10-15.md) antes de usar los pendientes o instrucciones de este documento. Se conserva el contenido como registro de su revisión.

# Registro simplificado — 15 de octubre de 2026

## Comportamiento nuevo

El registro pide únicamente ocho datos obligatorios: posición disponible, operación, tipo de inmueble, departamento, provincia, distrito, ubicación referencial y nombre de contacto.

Ubicación referencial admite dirección o descripción libre. Se retiran los campos separados de nombre del inmueble, calle y número/lote. El contacto pertenece a cada inmueble; corregirlo no modifica otras fichas. Se retiran DNI numérico, apellidos, teléfono, correo y búsqueda de propietarios del flujo de trabajo.

El DNI se adjunta después en Información de inmuebles → Documentación → DNI del propietario. Para preparar y confirmar publicación se exigen cuatro requisitos: archivo de DNI alojado, archivo de tasación alojado, foto vinculada a visita completada y texto. Se conserva el requisito de precios acordados antes de preparar publicación. El contacto inicial no se interpreta como identificación legal del titular.

Cartera, visitas, tasaciones, publicaciones, cierres y reportes muestran el contacto independiente. La ficha permite editar contacto y ubicación referencial. Los enlaces antiguos a la pestaña propietario abren Contacto. Las fotos, coordenadas, características, historial, importes, contratos y permisos existentes conservan su función. El reingreso de alquiler copia el contacto.

## Conversión de datos existentes

- Copia nombres y apellidos del propietario a `inm_inmuebles.nombre_contacto` por cada ficha.
- Reúne dirección y número/lote en `direccion`, que pasa a representar ubicación referencial. Amplía su capacidad a 350 caracteres para conservar direcciones antiguas completas.
- Si falta dirección, utiliza la referencia anterior. No inventa contactos si no existía propietario.
- `referencia` queda como etiqueta derivada de la ubicación, limitada a 255 caracteres por compatibilidad del código. No se pide como dato adicional.
- Conserva códigos, correlativos, posiciones y relaciones con documentos/visitas/precios. Guardar un contacto no regenera códigos históricos. Cambiar ubicación o tipo desde la ficha conserva alias del código anterior cuando cambia el código.
- Retira la asociación compartida al propietario y vacía número/lote tras reunirlo. La tabla de propietarios y las columnas heredadas quedan fuera del flujo activo y se conservan para recuperación; no se hace DROP de esos datos en esta primera actualización.
- El archivo de DNI existente sigue siendo válido. Un número de DNI antiguo sin archivo no se convierte en documento ni cumple el requisito.
- Los borradores nuevos de registro y ficha usan claves nuevas para no recuperar formularios con datos retirados.

## Punto de restauración

Punto de código original: `restore-points/registro-simplificado-20261015T035759Z/`.

Commit anterior: `cf4f5f0f55be5fe400c5e823861f89cfb4bcd868`.

Incluye `repository.bundle`, `source.tar.gz` y `manifest.json` con hashes SHA-256. El directorio está excluido de Git y Vercel. La copia de base de producción aún no está creada: necesita el acceso MySQL del entorno de producción. Las copias realizadas durante pruebas pertenecen exclusivamente a MySQL temporal local.

## Aplicar a una base existente

Configurar `DATABASE_URL` y, si corresponde, `DATABASE_TLS_REQUIRED=1` o `DATABASE_SSL_CA` en el entorno autorizado. La cuenta de migración necesita permisos de lectura, actualización y ALTER. La aplicación normal puede seguir usando su cuenta limitada.

1. Preparar una ventana sin escrituras: el script rechaza cambios de inmuebles o propietarios posteriores a la copia.
2. Ejecutar vista previa; solo informa cantidad, sin mostrar datos personales:

   ```sh
   npm run db:simplify-registration
   ```

3. Crear copia privada de todas las tablas y sus definiciones en el punto del código:

   ```sh
   npm run db:simplify-registration -- --backup --checkpoint restore-points/registro-simplificado-20261015T035759Z
   ```

4. Aplicar conversión después de verificar la integridad y que no hubo modificaciones desde la copia:

   ```sh
   npm run db:simplify-registration -- --apply --checkpoint restore-points/registro-simplificado-20261015T035759Z
   ```

El script añade `nombre_contacto` y amplía `direccion` si hace falta. El DDL es aditivo y MySQL lo confirma separadamente. La conversión de datos se hace en una transacción y utiliza un bloqueo de migración. Antes de confirmar escribe `registration-changes.json` con valores anteriores y posteriores, y su hash en el manifiesto. No reutilizar un punto que ya tenga ese diario; si una ejecución se interrumpe, revisar el diario y la base antes de actuar.

La migración Drizzle `0015_simplified_registration.sql` representa únicamente el cambio de estructura para instalaciones nuevas gestionadas por Drizzle. No ejecutar ese ALTER otra vez sobre una base ya preparada por el script. El historial Drizzle y el instalador manual son vías distintas; no mezclarlas sin comprobar qué se aplicó.

5. Desplegar el código nuevo en `puma19/inmobiliaria-alfarov2`. La conversión retira las asociaciones antiguas, por lo que debe coordinarse con el despliegue; no dejar el código anterior atendiendo escrituras entre ambos pasos.
6. Comprobar registro, ficha, visita, archivo DNI, publicación, reportes y permisos de operador en el dominio real.

## Restaurar

Validar el punto sin conectar con la base:

```sh
npm run db:restore-registration -- --checkpoint restore-points/registro-simplificado-20261015T035759Z
```

Con el acceso MySQL configurado, añadir `--apply` restaura únicamente los campos convertidos. Se detiene si hubo inmuebles nuevos o ediciones posteriores, para evitar sobrescribir el trabajo nuevo. No restaura toda la BD ni elimina archivos. Volver a desplegar el commit anterior como parte de la recuperación. Las columnas añadidas pueden permanecer sin afectar al código anterior.

## Validación

- Pruebas unitarias de los ocho campos, rechazo de posiciones inválidas, conversión de contactos/direcciones, ausencia de dependencia del DNI numérico y cuatro requisitos de expediente.
- Integración nueva `tests/simplified-registration.integration.mjs`: exige una base vacía local llamada `alfaro_registration_test`; no admite la URL de producción. Ejecuta migraciones anteriores, crea datos ficticios, prueba copia/conversión/restauración, permisos, captación simultánea, contactos independientes, alias de códigos, subida a HTTPS aislado, evidencia, publicación sin DNI numérico, reportes y HTML de registro.
- Ejecución local con MySQL desechable:

  ```sh
  TEST_DATABASE_URL=mysql://root@127.0.0.1:33316/alfaro_registration_test TEST_SOURCE_CHECKPOINT=restore-points/registro-simplificado-20261015T035759Z node tests/simplified-registration.integration.mjs
  ```

- Las integraciones históricas que comprueban edición de propietarios, nombre separado o DNI numérico describen el comportamiento anterior. Para este cambio, la integración anterior es la referencia de recorrido completo.

## Estado de publicación

La CLI ya está autenticada como `darkcystian15-1398` y vinculada a `puma19/inmobiliaria-alfarov2` (`prj_Y4rkO3CVHKLA2akcLF6rguUJksvG`).

La versión del commit `a796f23` compiló en Vercel y quedó READY como `dpl_3KvYixUfDzfTNuSTFygHCA7Dx6uD`, URL `https://inmobiliaria-alfarov2-51onl59dr-puma19.vercel.app`. Todavía no se activa en el dominio de la intranet: falta la copia y migración de MySQL.

El despliegue anterior es `dpl_ENYbSVdZVMbaRrT43X2UbProZgY3`, URL `https://inmobiliaria-alfarov2-lrnrre8kf-puma19.vercel.app`. Se registraron ambas versiones en el manifiesto privado del punto de recuperación.

Las variables de producción se descargaron a `.env.local` (excluido de Git y Vercel, permisos 0600). Los secretos sensibles, incluido DATABASE_URL, no pueden descargarse: Vercel escribe el marcador `[SENSITIVE]`. Falta configurar la conexión MySQL real privadamente en ese archivo para crear la copia y ejecutar la conversión. Las credenciales de documentos continúan disponibles para el runtime de Vercel; no hace falta exponerlas para desplegar.

La cuenta GitHub disponible (`Cystian`) mantiene permiso READ en el repositorio remoto. El cambio está guardado en la rama local `feat/registro-simplificado`; aún falta habilitar escritura para sincronizarlo con GitHub.
