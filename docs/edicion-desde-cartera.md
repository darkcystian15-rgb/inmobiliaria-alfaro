> Referencia de versión: consultar [Estado actual](estado-actual-2026-10-15.md) antes de usar los pendientes o instrucciones de este documento. Se conserva el contenido como registro de su revisión.

# Edición de datos desde Cartera

El panel de detalle de Cartera permite al administrador editar operación, tipo de inmueble y nombre de contacto. Información de inmuebles muestra esos tres datos únicamente para consulta; sus demás campos conservan la edición existente. El formulario de captación conserva los datos obligatorios para crear un inmueble.

La operación solo puede cambiarse en inmuebles activos sin precios ni publicación preparada. El panel explica la condición y deshabilita el selector cuando no se cumple. El servidor vuelve a comprobar la regla dentro de la transacción, bajo bloqueo del inmueble, para contemplar registros simultáneos de precios o publicaciones.

`PATCH /api/inmuebles/[id]` requiere administrador y acepta exclusivamente esos tres campos, de forma parcial. `PUT` conserva el acceso de información pero rechaza esos campos. El servidor conserva validación de catálogo, alias del código anterior al cambiar tipo, historial y auditoría. No se cambian tablas ni se requiere migración. Los documentos y textos existentes no se reescriben.

Validación de reglas: `node --test tests/property-edit-policy.test.mjs tests/simplified-registration.test.mjs tests/publication-checklist.test.mjs`.

## Despliegue

Publicado el 15 de octubre de 2026 en `puma19/inmobiliaria-alfarov2`, despliegue `dpl_8yiEXzUJPeqT6znhE41UsTLQj63K`, estado READY y entorno production. Vercel confirmó que `intranet.inmobiliariaalbertoalfaro.com.pe` apunta a esta versión. La compilación remota y TypeScript finalizaron correctamente. Se desplegó el directorio local con los cambios; no se aplicaron migraciones. No se hizo una prueba autenticada de edición en producción.
