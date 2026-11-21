# Vista de lectura de archivos Word

El visor compartido `FileViewer` muestra archivos DOCX al pulsar «Ver archivo», conservando texto, estilos, tablas e imágenes que admite docx-preview. La vista es de lectura y mantiene la descarga del original. Los DOC antiguos requieren convertir una copia a DOCX. La distribución puede variar respecto a Microsoft Word.

El documento se solicita mediante el enlace autenticado existente; no se envía a servicios de terceros. La biblioteca se carga bajo demanda y desactiva altChunks. La vista se presenta en un iframe sin permisos de scripts, con CSP que bloquea conexiones y recursos externos. Se cancelan solicitudes al cerrar o cambiar de archivo. Los errores de lectura mantienen disponible la descarga.

Verificación: TypeScript correcto; prueba de navegador con documentos sintéticos en 375/1440 px para texto, tabla, archivo dañado, descarga y cierre. No se modifican documentos de clientes.

Despliegue preparado: dpl_4fz8rpswiQpfC9FXanzrg9s35Q1C, proyecto inmobiliaria-alfarov2. Referencia Git base 288e706; subida del árbol local sin crear commit.

Publicado en producción: READY. Compilación remota completada en 54 segundos; promoción del mismo despliegue realizada. El dominio de intranet se comprobó mediante inspect. API de archivos: 401 con el JSON esperado de inicio de sesión, sin error de ejecución. Consulta de logs del despliegue por `level:error`: cero registros en la ventana revisada. La prueba de lectura autenticada de archivos reales continúa pendiente; las pruebas del visor usan documentos sintéticos.
