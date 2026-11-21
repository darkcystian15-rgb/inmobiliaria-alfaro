# Modelos de documentos de fase 2 — 2026-11-11

En el apartado 2 de fase 2 se actualizan las estructuras disponibles:

- Estructura de Minuta: modelo de `tests/info1/ESTRUCTURA  MINUTA DE CV.docx`.
- Estructura de Contrato de Alquiler: modelo de `tests/info1/ESTRUCTURA  CONTRATO ALQUILER.docx`.
- Estructura de Contrato Promesa-Venta: sin modelo base, pendiente del modelo final del ingeniero. Conserva el editor manual y la importación de Word.
- Contrato de Promesa de Venta: vuelve a carga de archivos, sin acceso al editor; el parámetro de API correspondiente deja de aceptarse.

Se conserva el contenido y los campos de los Word, con correcciones de «persona jurídica», «atraso», «autoavalúo», «compraventa» y puntuación. Se elimina la condición repetida de firma de escritura y se corrige su referencia en el plazo máximo. Los Word originales se conservan.

Las bases se incorporan con «Usar estructura base». Los textos ya guardados no se sobrescriben automáticamente; el usuario puede reemplazarlos desde el editor. Los archivos subidos se conservan. No requiere migración de base de datos.

## Verificación y publicación

Verificaciones locales correctas: TypeScript (`tsc --noEmit`), ESLint de los archivos modificados, modelos de minuta/alquiler, estructura de promesa vacía, lectura de Word, generación de PDF, expediente y 11 pruebas de API con fronteras simuladas. Se actualizaron las pruebas a los modelos nuevos y a la retirada del editor de contrato.

Proyecto: inmobiliaria-alfarov2 (`prj_Y4rkO3CVHKLA2akcLF6rguUJksvG`), equipo `team_qcKFQOeqeLWTJFsCLGnZvPiL`. Despliegue preparado: `dpl_Dwk4sXAsBwuUs4d32VciWubi5mAD`, https://inmobiliaria-alfarov2-icg4rdw1q-puma19.vercel.app. Se publica el árbol local existente sin crear commit ni modificar otros trabajos previos.

Estado final: **READY**, producción, Next.js. Promoción completada y dominio https://intranet.inmobiliariaalbertoalfaro.com.pe confirmado mediante `vercel inspect` apuntando al despliegue nuevo. Compilación y TypeScript correctos en Vercel; duración total informada: 1 min 18 s. Referencia Git base: `288e706`; se desplegaron los cambios locales.

Comprobación HTTP previa a la promoción: el API devuelve 401 con el JSON esperado de inicio de sesión, sin error de ejecución. Las pruebas funcionales de API se ejecutaron con fronteras simuladas; no se modificaron expedientes reales para verificar el despliegue.
