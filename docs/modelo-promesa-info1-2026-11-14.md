# Modelo de estructura de promesa de compraventa

Se incorpora tests/info1/ESTRUCTURA  PROMESA DE CV .docx al editor de Estructura de Contrato Promesa-Venta mediante «Usar estructura base», con el mismo flujo de minuta y alquiler: añadir, reemplazar con confirmación, deshacer incorporación, editar, guardar, reabrir, vista previa y descarga Word/PDF.

El modelo generado conserva 78 párrafos, formato de texto, tamaños, subrayados, negritas, listas, sangrías y espaciados. Se corrigen errores de redacción básicos del flujo común. El original se conserva intacto. Nombres, bancos, importes, fechas y circunstancias registrales del ejemplo se sustituyen por campos por completar; también se dejan por completar condición, estado, tipo, uso, porcentaje de propiedad y títulos en trámite. El modelo no afirma pagos realizados ni cargas particulares.

El generador selecciona los tres Word de manera explícita, evitando que el nuevo Word de promesa reemplace accidentalmente el modelo de minuta. La base de promesa vive en lib/promise-source-model.ts. Los borradores existentes no se sobrescriben automáticamente. Contrato de Promesa de Venta mantiene la carga de archivos.

Verificado: TypeScript; pruebas de base, preservación de documentos y formato; cotejo de párrafos no generalizados con el Word fuente; exportación real Word/PDF sin datos del ejemplo; regresiones de modelos de minuta/alquiler y API; navegador con API simulada a 375/1440 px para usar base, formato, guardado, reapertura y vista previa. No se modificaron expedientes reales.

Publicado: dpl_9DSYXX9q6XzsaWmh2zKG2muTeK4r, producción READY, https://inmobiliaria-alfarov2-2868cifz0-puma19.vercel.app. Promoción completada; dominio intranet confirmado mediante inspect. Compilación y TypeScript remotos correctos. API de promesa sin sesión: 401 con el JSON esperado; no se modificaron documentos de clientes para verificar producción.
