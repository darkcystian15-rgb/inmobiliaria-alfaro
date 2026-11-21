# DNI y poderes: propietarios, gerente y excepciones del cónyuge

## Orden de los cambios

1. Personas jurídicas en venta y alquiler: ficha RUC → DNI del gerente → **Poder del gerente** → vigencia de poder del gerente. El poder es una categoría independiente para vendedor, comprador, arrendador y arrendatario, con las mismas opciones de carga, consulta y descarga del expediente.
2. Propietarios del vendedor persona natural: **Soltero**, **Matrimonio** y **Co-Propietarios**. Se conserva «Por verificar» y los valores internos anteriores para compatibilidad con expedientes guardados.
3. Matrimonio: **Sociedad conyugal** y **Separación de bienes**. Se conserva la partida matrimonial para ambos y la carga adicional de separación de bienes cuando corresponde; se mantienen sus condiciones previas de obligatoriedad.
4. Excepción de firma del cónyuge, disponible en Matrimonio:
   - Sin excepción (valor inicial, también para registros antiguos).
   - Adquirió el inmueble siendo soltero y luego se casó → archivo de sustento de adquisición siendo soltero.
   - Adquirió el inmueble por sucesión intestada o herencia → archivo de sustento de sucesión intestada o herencia.
5. Al elegir una excepción, se indica que firma solo el propietario según la excepción registrada y se habilita el sustento correspondiente. Este archivo adicional se exige para completar/cerrar el expediente; un enlace antiguo no sustituye una subida alojada.

## Persistencia y permisos

La selección se guarda en la configuración JSON versionada del expediente. No se requiere migración ni se reescriben documentos existentes. Cambiar excepción, propietarios o tipo de persona conserva los archivos: los que ya no corresponden siguen visibles sin permitir nuevas cargas en esa categoría. Se conservan permisos, bloqueo de carga hasta guardar condiciones, límites y formatos existentes.

La selección registra el criterio operativo solicitado por el usuario; no verifica automáticamente la suficiencia jurídica de la excepción ni del archivo.

## Verificación

- Pruebas del expediente: compatibilidad de registros antiguos, validación de excepciones, sustento obligatorio según selección, conservación de archivos inactivos, separación de bienes y orden de los documentos del gerente en las cuatro partes.
- ESLint del componente y de la lógica modificados.
- TypeScript (`npx tsc --noEmit`) y ESLint: correctos.
- Pruebas de expediente, archivos y auditoría: correctas (`node --test tests/file-activity.test.mjs tests/transaction-dossier.test.mjs tests/document-files.test.mjs`).
- Compilación local: código y TypeScript correctos; la recolección de rutas se detiene por una URL de base de datos no válida en la configuración local. La compilación final se verifica con las variables del proyecto de Vercel.

## Despliegue en Vercel

- Proyecto: `inmobiliaria-alfarov2` (`prj_Y4rkO3CVHKLA2akcLF6rguUJksvG`).
- Equipo: `team_qcKFQOeqeLWTJFsCLGnZvPiL`.
- Entorno: **producción**, estado **READY**.
- Deployment: `dpl_FQ9Bao7XHStRmWM3X85T7hBwhMMm`.
- Dominio: https://intranet.inmobiliariaalbertoalfaro.com.pe
- URL de la versión: https://inmobiliaria-alfarov2-blflqhvwh-puma19.vercel.app
- Fuente: archivos actuales del workspace sobre base `288e706`, con cambios locales; se conservaron los trabajos anteriores presentes en el proyecto. No se creó un commit ni se incluyeron archivos `.env` en el despliegue.
- Next.js 16.3.8; build de Vercel correcto en 58 segundos, incluida revisión TypeScript.
- Comprobación HTTP autenticada a nivel Vercel: `/login` devuelve 200 y el formulario de acceso de la aplicación.
- Revisión inicial de logs del deployment (últimos 10 minutos): sin entradas de nivel error/fatal. No se verificó una carga real dentro de una sesión de la aplicación ni se adjuntaron documentos a expedientes reales.
