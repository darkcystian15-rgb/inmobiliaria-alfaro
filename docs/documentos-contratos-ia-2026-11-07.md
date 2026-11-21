# Documentos y contratos con IA — 7 de noviembre de 2026

## Objetivo y ubicación acordada

Preparar documentos desde la información del inmueble, los documentos aportados y los acuerdos confirmados, siguiendo la imagen y el video del ingeniero de `tests/info/`.

Acceso: Cartera de inmuebles → seleccionar zona → FASE 1 → Seguimiento → **Documentos y contratos con IA**, inmediatamente después de Registrar publicaciones. Se conserva el orden anterior del menú, incluido Liberar inmueble. También se añade acceso desde FASE 1 en el detalle del inmueble, antes de su liberación. La operación permanece activa mientras se preparan los documentos.

El módulo requiere administrador y zona seleccionada. Solo lista inmuebles activos de esa zona. Las rutas comprueban sesión, rol, origen de las escrituras, zona, pertenencia de documentos, estado activo, protección de expediente cerrado y versión. Preparar o generar no cambia publicación, etapa, precios, negociación existente ni cierre.

## Flujo y diseño

Se mantiene el diseño de la intranet: tarjetas claras, rojo de marca, avisos ámbar, formularios adaptables, pasos accesibles y barra de acciones persistente.

1. **Datos y fuentes:** seleccionar inmueble/documento; incorporar propuestas de dirección y descripción de la ficha, leer documentos de FASE 2 y confirmar extractos cotejados con el original.
2. **Completar acuerdos:** cuestionario por documento y operación. Identidades, domicilios y firmantes se completan o se proponen desde fuentes; el contacto de captación nunca se asume como propietario legal.
3. **Confirmar y generar:** resumen de información, pendientes y confirmación explícita. Es necesario guardar antes de confirmar. La IA recibe los datos y extractos confirmados.
4. **Revisar borrador:** edición manual, guardado, revisión interna, versiones anteriores y descarga Word compatible `.doc` o PDF. No se presenta como documento firmado.

La información incompleta puede guardarse. Los campos esenciales, documentos básicos y condiciones acordadas se exigen antes de generar. La navegación por enlaces y el cierre/recarga del navegador protegen los cambios pendientes mediante el guard existente. Cambiar de inmueble o documento desde el formulario exige guardar primero.

## Documentos disponibles

| Operación | Documento |
| --- | --- |
| Venta y alquiler | Contrato de intervención inmobiliaria |
| Alquiler | Estructura del contrato de alquiler |
| Alquiler | Contrato de alquiler |
| Alquiler | Informe de riesgos del arrendatario |
| Venta | Estructura de promesa de venta |
| Venta | Estructura de minuta |

Las estructuras reúnen información para abogada/notaría; no se presentan como contratos finales de compraventa. El informe de riesgos parte del reporte Infocorp aportado por el usuario: no consulta Infocorp ni genera un score inexistente.

## Datos mínimos y condiciones

Datos comunes: inmueble, dirección, alcance, partida/oficina registral, identidad y domicilio de las partes, todos los propietarios y firmantes, representación y firma prevista según documento.

Intervención: inmobiliaria y representante, alcance del servicio, inicio/duración, exclusividad, comisión/moneda/base/impuestos acordados, obligado al pago, oportunidad del pago y precio/renta del encargo. No requiere comprador ni arrendatario.

Alquiler: contraparte y firmantes, confirmación de condiciones acordadas, destino, actividad comercial cuando corresponda, inicio/término/entrega, gracia, renta/moneda/variaciones, oportunidad y medio de pago, banco/cuenta/CCI cuando corresponda, garantía y devolución, adelanto, responsables de gastos, mascotas, subarriendo, reparaciones/modificaciones, salida anticipada/incumplimiento, inventario y fiador cuando correspondan. Hay campos opcionales para acuerdos y estructura propia.

Venta: contraparte/firmantes, condiciones acordadas, precio/moneda, inicial/saldo/fechas, financiación, entrega, cargas/saneamiento, gastos/impuestos y compromisos especiales.

Riesgos: identidad del evaluado, fecha del reporte, alcance de evaluación, fuente identificada expresamente como Infocorp y sustentos opcionales.

Antes de generar contratos/estructuras se comprueba que FASE 2 tenga archivos alojados de copia literal/CRI, DNI o RUC del propietario y, salvo intervención, DNI o RUC de la contraparte. Se admite compatibilidad de las categorías antiguas del propietario y copia literal. Estas comprobaciones son un mínimo operativo, no una declaración automática de suficiencia de poderes o documentos. No se exige completar toda FASE 2; sus requisitos de cierre permanecen independientes.

El sistema existente consulta negociaciones, pero no ofrece en este flujo una escritura vigente para iniciarlas. Por ello el cuestionario registra la confirmación explícita de **Condiciones acordadas** antes de generar contrato/estructura, sin inventar ni modificar una negociación de negocio. Riesgos e intervención tienen sus requisitos propios y pueden prepararse antes de ese acuerdo.

## Lectura documental e interacción con IA

- Se reutiliza el lector existente de PDF/JPG/PNG con OCR en el servidor: hasta 12 MB, máximo 150 páginas, lotes de hasta cuatro páginas. El usuario puede avanzar al siguiente lote y revisar el original.
- Se conservan hasta cuatro extractos de 2500 caracteres por preparación. La interfaz advierte que el extracto inicial es parcial y requiere cotejo. Los extractos pueden incluir datos personales y se envían al proveedor al solicitar propuestas/generación.
- Las propuestas de IA solo corresponden a campos vacíos; incluyen evidencia textual presente en los extractos. Se validan claves, extensión, opciones, fechas e importes. No se incorporan sin selección del usuario.
- La generación usa AI SDK 7.0.164 mediante Vercel AI Gateway. Modelo inicial `openai/gpt-5.4-mini`, verificado en el catálogo de Gateway; puede cambiarse mediante `CONTRACT_AI_MODEL` del servidor. OIDC de Vercel autentica las llamadas; `AI_GATEWAY_API_KEY` es alternativa opcional para ejecución local. No se crean ni exponen claves en el cliente.
- Se limita a 12 lecturas/propuestas/generaciones por administrador y hora, con contador persistente existente. No hay reintentos automáticos del proveedor; el timeout de generación es 150 segundos y el de la función 300 segundos.
- Los prompts separan instrucciones y datos no confiables. Prohíben inventar identidades, poderes, montos, acuerdos, citas legales o consultas de riesgo. Los acuerdos ambiguos se señalan para revisión. No hay herramientas ni acciones externas disponibles para el modelo.
- Las respuestas incompletas o fallidas no sustituyen el trabajo guardado. La UI conserva los datos y muestra el error. El módulo no confunde un texto fijo con una respuesta real de IA.

## Persistencia, versiones y compatibilidad

Se utilizan snapshots inmutables en la tabla de historial existente `inm_timeline`, con eventos `contrato_ia_<documento>`. Cada guardado conserva cuestionario, fuentes, borrador, estado de revisión y metadata de generación. No requiere crear tablas, columnas ni migrar expedientes anteriores. La versión es el ID del snapshot; se lee el último por inmueble y documento.

Los guardados toman el bloqueo del inmueble y comprueban la versión esperada. La llamada al modelo ocurre fuera de la transacción; antes de guardar se comprueban de nuevo estado, versión y pertenencia de fuentes. Se audita cada guardado. El historial general muestra un resumen legible y remite al módulo para consultar textos/versiones.

La huella de los datos y fuentes permite detectar un borrador desactualizado. Cambiar datos o fuentes exige generar nuevamente antes de marcar como revisado. La huella SHA-256 de cada archivo se comprueba antes de propuestas/generación/revisión; si cambia, se pide leerlo nuevamente.

Las versiones se consultan sin restauración automática. El texto de Word se escapa y el contenido de IA se muestra como texto plano. Los borradores quedan vinculados al inmueble en este módulo; no se suben automáticamente como documentos firmados ni completan requisitos de cierre. El documento que corresponda se incorpora a la carpeta Contratos de FASE 2 mediante la carga habitual.

## Punto de restauración

Directorio privado, excluido de Git y Vercel: `restore-points/contratos-ia-20261107/`.

- `source.tar.gz`: código previo a la implementación, incluidos los cambios locales preexistentes; excluye credenciales, dependencias, videos e imágenes de referencia.
- `tests-before.tar.gz`: pruebas previas, excluidos los archivos de `tests/info/`.
- `git-status.txt`: estado local previo.
- `manifest.json`: commit base, fecha, SHA-256 y referencia de producción anterior.
- Producción anterior: `dpl_GigKqDkC3tv7TutSVMvAxar1zVGk`, `https://inmobiliaria-alfarov2-oolzfsbyb-puma19.vercel.app`.

El intento de respaldo de negocio mediante `scripts/backup-property-business.mjs` no pudo conectar: `DATABASE_URL` local es un marcador enmascarado. Las variables de producción de tipo Secret no pueden recuperarse mediante env pull. Este punto restaura código/referencia de despliegue; **no contiene una copia nueva de la base de datos ni del hosting**. La implementación no reescribe documentos o datos existentes. Los scripts idempotentes de preparación ya presentes en `vercel.json` siguen formando parte del proceso habitual de compilación.

Para revertir, extraer los archivos a un directorio temporal y recuperar únicamente los afectados por este cambio, preservando el trabajo local anterior. En Vercel, volver a promover el despliegue anterior del mismo proyecto/equipo. Conservar los snapshots ya creados: versiones antiguas del código simplemente no ofrecen este nuevo módulo. No se ejecutó restauración.

## Validación

- TypeScript directo: correcto.
- ESLint de rutas, componentes, lógica y pruebas de esta implementación: correcto.
- Siete archivos de pruebas de cuestionario, API, lectura documental, expediente y saneamiento: correctos. La API real se ejecuta con límites de autenticación, base de datos y proveedor aislados.
- Navegador con componentes reales a 375 y 1440 px: fuentes, propuestas seleccionadas, cuestionario, guardado, confirmación, error de IA sin pérdida, generación, edición, revisión, Word/PDF y persistencia al recargar. Sin errores de página ni desbordamiento horizontal. Capturas en `output/contratos-ia/`.
- Revisión React: componentes separados, hooks incondicionales, efectos cancelables, claves estables, etiquetas, estados de carga/error, botones bloqueados durante operaciones y actualización funcional de listas.
- Compilación local Webpack: código y TypeScript correctos; la recopilación de rutas se detiene en `/api/alquileres` por la URL local enmascarada. La compilación publicada se verifica con el entorno de Vercel.
- Las pruebas aisladas no acreditan una sesión autenticada con datos reales en producción. No se subieron documentos ni se alteraron expedientes reales como prueba.

### Comprobación real del proveedor

Se añadió `scripts/verify-contract-ai.mjs`, ejecutado por el prebuild **solo** con `CONTRACT_AI_VERIFY=1`. Las compilaciones normales no hacen solicitudes al modelo ni consumen tokens. La prueba usa exclusivamente el mensaje sintético «Responde únicamente con el texto CONEXION_IA_OK»; no lee inmuebles ni documentos, ni escribe en la base de datos. El diagnóstico no imprime credenciales.

La comprobación real en Vercel devolvió HTTP 403, `GatewayInternalServerError`, con el motivo explícito: AI Gateway requiere una tarjeta de crédito válida registrada para atender solicitudes y habilitar los créditos gratuitos. Se constató en el despliegue de verificación `dpl_FpF1MbNQPRb5udtKr4WznLQQggEf`. No se puede afirmar que se haya generado un contrato real con el proveedor.

**Acción pendiente del titular de la cuenta:** completar la habilitación de AI Gateway en https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%3Fmodal%3Dadd-credit-card. No se añadieron tarjetas ni se contrataron planes. El módulo y la integración quedan implementados; el formulario, las fuentes y el guardado funcionan independientemente del proveedor. Si se intenta generar antes de habilitarlo, se informa que el servicio aún no está habilitado y se conserva la preparación. Después de activar la cuenta, se podrá repetir la prueba con `CONTRACT_AI_VERIFY=1` en un despliegue preparado sin cambiar dominios.

## Despliegue

- Proyecto: `inmobiliaria-alfarov2`, `prj_Y4rkO3CVHKLA2akcLF6rguUJksvG`.
- Equipo: `team_qcKFQOeqeLWTJFsCLGnZvPiL`.
- Despliegue final: **`dpl_C9Bn3YRoHvebueRwXEdTUBSFngGN`**, producción, **READY**, sin error de alias.
- URL de versión: https://inmobiliaria-alfarov2-2f1xhmhvu-puma19.vercel.app.
- Dominio publicado: https://intranet.inmobiliariaalbertoalfaro.com.pe.
- Se preparó sin cambiar dominios, se verificó la compilación y `/login` y luego se promovió el mismo despliegue. Vercel confirmó ambos alias completados; se verificó que el alias del dominio de intranet apunta exactamente al despliegue final.
- Compilación Vercel correcta, incluida generación de 65 páginas/rutas. Build informado: 52 segundos; aproximadamente 78 segundos desde creación hasta READY.
- Comprobación posterior en el dominio: `/login` devuelve HTTP 200 con el formulario de acceso. `/api/contratos?zona=Chimbote` devuelve HTTP 401 sin sesión, como corresponde. La página privada redirige al acceso cuando no existe sesión.
- Logs de error/fatal del despliegue final en los 10 minutos consultados: sin registros. No hay drains externos configurados; se usaron los logs disponibles de Vercel.
- Fuente: workspace sobre base `288e7060b41df8f9eafc2bfa67c102ff186a35b7`, con cambios locales anteriores preservados. Publicación directa por CLI, sin crear commit ni modificar ramas remotas.
- Paquete de referencia: `restore-points/contratos-ia-20261107/release-source.tar.gz`, 622 archivos; SHA-256 `4eb3910dda8925602d5ead686a6b79bb3291bfd6049adb6d3c75a24ac3535b1c`. Inventario individual en `release-manifest.json`. Este Markdown se completa localmente tras la comprobación del despliegue; el paquete conserva su versión previa a esa anotación.
- La variable de compilación `CONTRACT_AI_VERIFY=0` evita que la comprobación opcional de facturación impida publicar el formulario y la integración preparada. No se cambiaron secretos del proyecto ni se desactivó su autenticación.
- **Límite funcional pendiente:** generación/propuestas reales bloqueadas por la habilitación de facturación de AI Gateway descrita arriba. El despliegue READY acredita la publicación del código; no elimina el requisito externo de la cuenta. No se anuncia como generación de contratos operativa hasta resolver ese punto.
