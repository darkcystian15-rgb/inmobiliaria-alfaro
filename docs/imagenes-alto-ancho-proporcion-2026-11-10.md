# Alto y ancho de imágenes en los editores de documentos

El panel compartido de Estructura de Minuta, Estructura de Contrato Promesa-Venta y Contrato de Promesa de Venta permite editar ancho y alto en milímetros. Mantener proporción está activado por defecto: se calcula la medida complementaria a partir de las dimensiones naturales de la imagen. Al desactivarlo, las medidas son independientes. Al reactivarlo se recupera la proporción natural tomando el ancho como referencia y respetando el máximo de alto.

La carga de la vista previa no altera el borrador ni produce cambios pendientes. En imágenes anteriores sin alto guardado se sigue calculando automáticamente la altura. Los nuevos campos height y keepRatio son opcionales y compatibles con instantáneas anteriores; no hay migración. El servidor valida medidas positivas, ancho hasta 160 mm, alto hasta 240 mm y el indicador de proporción booleano.

El PDF respeta el alto/ancho elegidos. Con la proporción activada, ajusta la imagen a esas medidas conservando la relación natural. Desactivada, permite deformarla para cumplir las medidas independientes. En ambos modos, si supera el ancho de la celda o el alto útil de página, reduce conjuntamente las dos medidas para encajar, conservando la proporción resultante del ajuste elegido. Se mantiene la paginación por filas y el espacio reservado para pies y descripciones.

Verificación: TypeScript y ESLint; API, documento y PDF; navegador 375/1440 px. La prueba de navegador comprueba el alto proporcional (30 mm de alto produce 44 mm de ancho para una imagen de 220×150), desbloqueo, ajuste independiente y persistencia al reabrir. La prueba PDF inspecciona las transformaciones reales: una imagen 200×100 se dibuja a 70×40 mm sin bloqueo o a 70×35 mm con proporción activada. También se rechazan alturas inválidas y se mantiene el comportamiento de documentos anteriores.

Las pruebas usan imágenes sintéticas y fronteras de API/almacenamiento simuladas. No se modifican documentos de clientes. La mejora se prepara para el mismo proyecto de producción inmobiliaria-alfarov2, conservando los cambios previos del repositorio.

## Publicación

- Producción Next.js, proyecto inmobiliaria-alfarov2, equipo team_qcKFQOeqeLWTJFsCLGnZvPiL; estado READY.
- Despliegue: dpl_ArzGyrmyCUAMFt8WxfKrD1EBGqqq.
- URL: https://inmobiliaria-alfarov2-9yvjktp09-puma19.vercel.app.
- Se preparó con --prod --skip-domain, se comprobó el endpoint privado (HTTP 401 con el JSON esperado sin sesión) y se promovió el mismo despliegue. Inspect del dominio intranet.inmobiliariaalbertoalfaro.com.pe confirma el nuevo despliegue.
- Base Git 288e7060b41df8f9eafc2bfa67c102ff186a35b7, con los archivos locales de trabajo; sin commit nuevo.
- Consulta de logs de nivel error: no se encontraron registros. Las verificaciones funcionales son locales con datos sintéticos; no se alteraron expedientes de clientes.
