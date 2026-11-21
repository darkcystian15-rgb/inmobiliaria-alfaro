# Carpetas 6, 8 y 9 de FASE 2

## Cambios solicitados

En el expediente de venta se conserva el orden de las carpetas existentes y se actualiza:

- **6. Saneamiento físico legal**, antes «Levantamiento de cargas».
- **7. Tasaciones**, sin cambios.
- **8. Planos**, carpeta nueva.
- **9. Catálogo y diagnóstico físico legal**, carpeta nueva.

Los puntos 8 y 9 usan las mismas tarjetas con icono de carpeta, contador de archivos y estado documental del explorador de FASE 2. Se abren dentro de la ficha y admiten sus enlaces de navegación (`carpeta=planos` y `carpeta=catalogo`). El expediente de alquiler conserva sus cinco carpetas y su numeración.

## Activación y documentos

- Punto 6: casilla **Requiere saneamiento físico legal**. Conserva la configuración, archivos y categoría interna anteriores para evitar migraciones o pérdidas.
- Punto 8: casilla **Incluir planos**.
- Punto 9: casilla **Incluir catálogo y diagnóstico físico legal**.

Cada sección activada exige al menos un archivo alojado para completar su requisito y permitir el cierre; un enlace externo no completa el requisito. Se pueden subir varios archivos juntos o agregar más después, cada uno con nombre obligatorio e independiente. Antes de subir se guardan las condiciones del expediente.

Sin activar, las carpetas nuevas no generan requisitos ni admiten nuevas cargas. Al desactivar se conservan los documentos para consulta y descarga. Las casillas se bloquean en expedientes de solo lectura, durante operaciones y cuando hay una selección de archivos o edición pendiente.

**No se agrega observación opcional ni descripción a los formularios de carga o edición de las carpetas nuevas**, según la instrucción del usuario. Tampoco se envía una observación arrastrada de otra carga. Una observación antigua asociada a un plano se conserva al renombrarlo.

El punto 6 conserva su opción preexistente de otros documentos, con los permisos y campos anteriores.

## Compatibilidad

- `planos` y `catalogoDiagnostico` se guardan como booleanos en la configuración JSON versionada; los registros antiguos los reciben desactivados. Se rechazan valores de otro tipo.
- Los archivos antiguos de categoría `PLANO` aparecen automáticamente en la carpeta 8, incluso desactivada. No se cambia su nombre, enlace ni almacenamiento.
- Se incorpora la categoría `CATALOGO_DIAGNOSTICO_FISICO_LEGAL` para la carpeta 9, admitida por la validación de archivos y por el hosting existente.
- Se mantiene la clave `cargas` y el tipo `LEVANTAMIENTO_CARGAS`; solo cambia su nombre visible a Saneamiento físico legal.
- La auditoría usa los nombres actuales del catálogo para los eventos nuevos.
- No se requiere migración de base de datos ni sustitución del PHP de hosting por este cambio.

## Verificación

Pruebas del expediente, carpetas, archivos y auditoría: activación independiente, carga múltiple, requisito mínimo por carpeta, rechazo de enlaces como cumplimiento, conservación al desactivar, compatibilidad de configuración y planos anteriores, nueve carpetas de venta y cinco de alquiler.

- TypeScript (`npx tsc --noEmit`): correcto.
- ESLint de los componentes y lógica modificados: correcto.
- Pruebas (`node --test tests/transaction-dossier.test.mjs tests/property-folders.test.mjs tests/document-files.test.mjs tests/file-activity.test.mjs`): cuatro archivos de pruebas correctos.
- Revisión React: casillas etiquetadas, claves estables por sección, estado actualizado funcionalmente, condiciones de solo lectura y bloqueo de carga sin guardar; se reutiliza la tarjeta de carpeta existente.
- El historial muestra Saneamiento físico legal y nombres legibles para las activaciones de las carpetas nuevas.

El resultado del despliegue se registra al finalizar.

## Despliegue de producción

- Proyecto: `inmobiliaria-alfarov2` (`prj_Y4rkO3CVHKLA2akcLF6rguUJksvG`).
- Equipo: `team_qcKFQOeqeLWTJFsCLGnZvPiL`.
- Entorno: **producción**; estado final **READY**, sin error de alias.
- Deployment final: `dpl_EAQk6n9UTVGkkTxKoVNTaJbaQjSb`.
- Dominio: https://intranet.inmobiliariaalbertoalfaro.com.pe
- Versión: https://inmobiliaria-alfarov2-n05c0393m-puma19.vercel.app
- Fuente: base `288e706` con cambios locales; se conserva la versión publicada anteriormente y se incorporan los cambios de estas carpetas e historial. No se creó commit ni se incluyeron variables `.env` en los archivos desplegados.
- Compilación Next.js y TypeScript de Vercel correctas; deployment disponible aproximadamente 67 segundos después de iniciar la construcción.
- Comprobación de `/login` en la versión final: HTTP 200 y página de acceso correcta.
- Logs iniciales del deployment en los últimos 10 minutos: sin entradas error/fatal.
- Límite de verificación: no se realizó una carga de documentos reales dentro de una sesión de la aplicación. La activación, obligatoriedad, archivo múltiple y conservación se verificaron con las pruebas del expediente y de carpetas.
