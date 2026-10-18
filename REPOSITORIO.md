# Repositorio y estado de entrega

Referencia consolidada actualizada el 18 de octubre de 2026.

Nueva entrega: [Listado de archivos y navegación por zonas](docs/listado-archivos-2026-10-18.md). La publicación y sus comprobaciones se registran en ese documento.

## Repositorio

- GitHub: https://github.com/darkcystian15-rgb/inmobiliaria-alfaro
- Copia local: `/workspaces/app-alfaro-git/inmobiliaria-alfaro`.
- El directorio padre pertenece a otro repositorio, `Cystian/app-alfaro-git`. Ejecutar Git dentro de la carpeta de la aplicación.
- `main` y `feat/registro-simplificado` contienen la misma entrega, integradas mediante fast-forward y sincronizadas con GitHub sin reescribir historial.
- Último código de aplicación publicado: `8446fff6a0c6281c9e3652e457f572c55409deff`.
- Los commits posteriores de evidencia/documentación no alteran ese código. Consultar las ramas para el último commit documental.

## Producción

| Dato | Evidencia del 18 de octubre |
| --- | --- |
| Proyecto | `puma19/inmobiliaria-alfarov2` |
| Dominio de la intranet | https://intranet.inmobiliariaalbertoalfaro.com.pe |
| Código | `8446fff6a0c6281c9e3652e457f572c55409deff` |
| Despliegue GitHub | `7148034965`, entorno `Production` |
| Estado informado por Vercel a GitHub | `success`, `Deployment has completed` |
| Fecha del estado | 2026-10-18 00:54:05 UTC |
| URL de versión | https://inmobiliaria-alfarov2-dswwxroao-puma19.vercel.app |

Se consultaron las API de despliegues y estados de GitHub para el SHA indicado. El login del dominio respondió HTTP 200. La URL de versión redirige al login de Vercel y la consulta directa de API de Vercel había respondido HTTP 403; no se verificó independientemente la asignación del alias ni el recorrido autenticado de la nueva versión. Detalle: [identificación y descripción uniformes](docs/identificacion-cartera-2026-10-18.md).

## Presentación uniforme vigente

- Título: nombre del contacto.
- Descripción operativa: operación, tipo y ubicación referencial escrita; sin añadir distrito, provincia, departamento ni zona a la dirección.
- ID visible: número de orden estable, operación, tipo y ubicación referencial. Ejemplo: `012-venta-local-av meigss c3`.
- Si falta la dirección, se indica «Ubicación por completar»; no se sustituye por contacto ni geografía.
- La zona identifica el contexto comercial de cartera. La posición reutilizable y el ID numérico de base no sustituyen al número de orden del identificador.
- Cartera, fichas, visitas, tasaciones, publicaciones, cierres, contratos y agenda comparten el criterio. Reportes usa el mismo ID/contacto en tabla, PDF y Excel.
- Se conservan códigos persistidos, enlaces antiguos, historial y geografía guardada. Se admite búsqueda por ID visible o código anterior en los filtros ajustados.

## Funcionalidad acumulada

- Cartera por zonas comerciales y posiciones, independiente de la geografía. Crear una zona en `/ubicaciones` genera diez posiciones; se conservan capacidades anteriores.
- Captación con posición libre, operación, tipo, ubicación referencial y contacto independiente por inmueble. Departamento, provincia y distrito opcionales en la ficha.
- Operación, tipo y contacto editables por administrador desde Cartera. Cambiar operación exige inmueble activo sin precios ni publicación preparada.
- Visitas y evidencia fotográfica, precios acordados, preparación y confirmación de publicación, cierres, contratos de alquiler, renovación manual y reingreso con antecedentes.
- Publicación con archivo DNI del vendedor/gerente, tasación, foto de visita completada y texto, además de las condiciones de precios. Sin exigencia de DNI numérico.
- Sin mapas, coordenadas, importador de puntos ni geolocalización.
- Expediente con un vendedor y un comprador, asignación expresa del comprador, condiciones por persona natural/jurídica, siete grupos documentales, porcentaje y alertas. Los faltantes no bloquean el cierre. Venta y alquiler comparten reglas hasta definir diferencias.
- Archivos privados PDF, Word, Excel e imágenes, máximo 4 MB tras compresión de imágenes. Vista previa de imágenes/PDF y descarga de Word/Excel. Eliminación por administrador.
- Permisos, historial, reportes y protección de concurrencia; conflictos de versión del expediente devuelven HTTP 409.

## Validación

- 26 archivos de pruebas unitarias correctos tras añadir Listado de archivos.
- ESLint sin errores ni advertencias.
- Compilación final de producción con Webpack y TypeScript correcta fuera del sandbox.
- Comprobación directa de ID/contacto compartidos por tabla, PDF y Excel y preservación de importes.
- Enlaces locales y `git diff --check` correctos.
- No se ejecutaron integraciones con escrituras contra la base configurada ni una prueba visual autenticada de la nueva entrega en producción.

## Datos, recuperación e historial

Las migraciones de registro simplificado, zonas y expediente constan como aplicadas en la evidencia del 15–16 de octubre. Esta corrección no requiere migración ni modifica datos de negocio. No repetir `--apply` para verificar o publicar documentación. Los conteos de documentos anteriores son históricos.

Los respaldos, capturas y secretos son privados y no forman parte de Git. Antes de restaurar, comprobar existencia, hashes, identidad de base y cambios posteriores.

Esta referencia consolida el estado. Los demás Markdown preservan decisiones y evidencias de sus fechas. Las referencias antiguas a mapas, DNI numérico, propietarios compartidos, `main` atrasado o publicaciones pendientes no sustituyen este estado. Para detalles, leer [corrección del 18 de octubre](docs/identificacion-cartera-2026-10-18.md), [expediente del 16](docs/expediente-operacion-2026-10-16.md) y [retirada de mapas](docs/retirada-mapas-2026-10-15.md).
