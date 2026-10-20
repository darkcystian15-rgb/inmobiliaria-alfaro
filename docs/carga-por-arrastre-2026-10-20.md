# Carga por arrastre en expedientes y fotos — 20 de octubre de 2026

## Funcionamiento

Los campos de carga admiten **arrastrar y soltar archivos** además del botón
del selector del equipo. El área se resalta cuando se arrastran archivos encima.
Se aplica a documentos del vendedor/comprador en venta, arrendador/arrendatario
en alquiler, documentación del inmueble y carga de fotografías. El componente
de fotografías es compartido también por Registrar visitas y otras galerías editables.

- Documentos: soltar un lote lo selecciona para revisar categoría, nombre de cada
  archivo y observación; **Subir archivos** confirma el envío. Como con el selector
  anterior, una nueva selección válida reemplaza el lote pendiente.
- Fotos: soltar imágenes inicia la compresión y subida existentes. Se conserva
  la relación con la visita y la visualización del progreso y de los errores.
- La zona de arrastre y el selector usan el mismo manejador. Los documentos
  permiten PDF, Word, Excel, JPG, PNG y WebP; las fotos, JPG, PNG y WebP.
- Se rechazan extensiones no admitidas y carpetas. Una selección rechazada no
  reemplaza documentos pendientes ni sus nombres editados. Arrastrar texto o
  enlaces no genera una selección ni una subida.
- Los límites siguen siendo 4 MB por documento final y, para fotos, 25 MB por
  imagen original y 20 por carga, con la compresión existente.
- Arrastre y selector respetan subida en curso, condiciones sin guardar y
  almacenamiento no configurado. El selector conserva su etiqueta y uso con
  teclado o pantalla táctil.

## Alcance técnico y datos

Nuevo componente compartido `app/components/FileDropZone.tsx`, integrado en
`TransactionDossier.tsx` y `PhotoUploader.tsx`. Se conserva la validación del
contenido y los permisos de las APIs existentes. No se modifican esquema,
credenciales, archivos guardados ni fichas al desplegar. No hay migraciones.

## Validación y publicación

- 32 archivos de pruebas unitarias aprobados; ESLint sin errores ni advertencias.
- Compilación de producción Webpack y TypeScript aprobada fuera del sandbox.
- Integración `tests/transaction-dossier.integration.mjs` con MySQL 8.4 desechable
  y hosting HTTPS local simulado: subida por selector y por arrastre, varios
  archivos con nombres editables, categorías de vendedor/comprador y
  arrendador/arrendatario, compresión de fotos y relación con visita.
- Rechazo de extensión incorrecta, documento mayor de 4 MB y más de 20 fotos;
  conservación del lote anterior al rechazar otro; arrastre bloqueado con
  condiciones sin guardar y durante una subida. Se verificó el estado guardado
  en SQL y la ausencia de archivos ficticios para los lotes rechazados.
- La integración completa conservó permisos, conflictos de versión, acceso
  privado, vistas previas, historial y eliminación de archivos.
- Escritorio de 1440 px y móvil de 375 px sin errores JavaScript ni desbordes.
- Los primeros ensayos requirieron corregir un interceptor de la prueba que
  omitía el parámetro de zona y una espera al abrir la ficha de alquiler; se
  repitieron únicamente en la base ficticia. La aplicación no cambió para esos ajustes.

Las capturas privadas están en `output/dossier-local/` y los registros del ensayo
quedan fuera de Git. Los ensayos no usaron documentos ni inmuebles reales.

## Entrega y contraste de producción

- Código: `d19abd2611aec69ed1f705531e9b48ac7b9fac3e`, subido de forma atómica
  a `main` y `feat/registro-simplificado`.
- Publicación desde la integración Git existente, conservando cuentas y permisos.
- Proyecto Vercel: `puma19/inmobiliaria-alfarov2`.
- Production: `dpl_3bd3UzHm5z2DnEKoRDLLJQS6VD8Z`, **READY**.
- [Versión publicada](https://inmobiliaria-alfarov2-iihz6jf1n-puma19.vercel.app).
- [Despliegue Vercel](https://vercel.com/puma19/inmobiliaria-alfarov2/3bd3UzHm5z2DnEKoRDLLJQS6VD8Z).
- Alias confirmado: `intranet.inmobiliariaalbertoalfaro.com.pe`.
- Los commits documentales posteriores conservan el mismo código funcional.

Verificación autenticada del dominio terminada el `2026-10-20T02:33:35.767Z`:
cuatro vistas de documentos y cuatro de fotos, cubriendo venta y alquiler a
1440 y 375 px. Arrastre de documento a la selección, edición de su nombre,
rechazo de formato inválido sin perder la selección anterior y disponibilidad
del selector de fotos correctos. Sin errores JavaScript, respuestas HTTP
fallidas, desbordes ni intentos de escritura del navegador.

La comprobación de producción no envió archivos reales: el navegador bloqueó
escrituras y solo se prepararon selecciones temporales o archivos rechazados.
La transferencia completa, compresión y guardado conservan la evidencia del
hosting HTTPS simulado local; este ensayo no acredita nuevas credenciales ni
una transferencia contra el hosting real. La cuenta y sesión de verificación
se eliminaron al terminar. Evidencia privada: `output/drop-upload-production/`.

El contenedor y volumen MySQL desechables se eliminaron al finalizar los ensayos.
No se modificaron inmuebles ni documentos reales.
