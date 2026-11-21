# Pendiente: activación de IA y alternativa con Codex

Fecha: 7 de noviembre de 2026.

## Decisión del usuario

Dejar pendiente la activación de IA y la posible integración de Codex. Esta conversación solo solicita conservar el contexto; no autoriza compras, activación de facturación ni cambios de integración.

## Estado del módulo y despliegue

- El módulo Documentos y contratos con IA está implementado.
- Se confirmó en Vercel que producción está READY: `dpl_C9Bn3YRoHvebueRwXEdTUBSFngGN`.
- El dominio `https://intranet.inmobiliariaalbertoalfaro.com.pe` resolvió a ese deployment en la consulta realizada.
- El código se publicó directamente desde el workspace sobre el commit base `288e7060b41df8f9eafc2bfa67c102ff186a35b7`. Hay cambios y documentos locales sin commit; el SHA base por sí solo no identifica todo lo publicado.
- Detalles de implementación, pruebas y publicación: `docs/documentos-contratos-ia-2026-11-07.md`.
- La generación y las propuestas reales siguen pendientes de habilitación del proveedor. READY acredita el despliegue, no una generación real exitosa.

## Integración actual y bloqueo

`lib/contract-ai.ts` usa AI SDK con Vercel AI Gateway. El modelo predeterminado es `openai/gpt-5.4-mini`, modificable mediante `CONTRACT_AI_MODEL` del servidor.

La comprobación real anterior recibió HTTP 403 del Gateway por requerir una tarjeta válida para habilitar el servicio y sus créditos gratuitos. No se registraron tarjetas ni se compraron créditos durante esta conversación.

La habilitación se gestiona desde AI Gateway del equipo Vercel `puma19`. Registrar un medio de pago y comprar créditos son acciones diferentes. Antes de comprar, comprobar saldo, elegibilidad del modelo y condiciones vigentes.

## Costos explicados al usuario

Según las tarifas consultadas el 7 de noviembre de 2026, GPT-5.4 mini figuraba desde US$0.75 por millón de tokens de entrada y US$4.50 por millón de salida.

Ejemplo estimado: 8,000 tokens de entrada y 4,000 de salida cuestan US$0.024. Se comunicó un presupuesto orientativo de US$0.02–0.05 por generación: 100 generaciones, US$2–5; 500, US$10–25; 1,000, US$20–50.

No es una medición real ni un precio fijo por contrato. Propuestas, regeneraciones, tamaño del contexto y tokens facturados pueden cambiar el importe. No incluye hosting ni impuestos. Medir consumo real cuando el proveedor esté habilitado.

La documentación consultada indicaba US$5 mensuales gratuitos para modelos elegibles. Comprar créditos convierte la cuenta al nivel de pago y deja de aplicar el crédito mensual gratuito. Revalidar precios y condiciones antes de activar.

- Tarifas del modelo: https://vercel.com/ai-gateway/models/gpt-5.4-mini/providers
- Condiciones de AI Gateway: https://vercel.com/docs/ai-gateway/pricing

## Pregunta sobre Codex y conclusión del análisis

El usuario preguntó si podía usar Codex en lugar de AI Gateway, especialmente para aprovechar su suscripción. Se corrigió la respuesta inicial, demasiado categórica: integrar Codex técnicamente no acredita que la suscripción pueda financiar la intranet alojada en Vercel.

- Codex dispone de SDK para integrarlo en herramientas y aplicaciones.
- La documentación de uso del plan de ChatGPT mediante Sign in with ChatGPT describe aplicaciones de código abierto y alojadas localmente.
- Para ofrecer ese uso en aplicaciones de pago o alojadas remotamente, OpenAI indica completar un formulario de interés. La intranet en Vercel corresponde al caso remoto; no se ha confirmado acceso para esta integración.
- Por tanto, no se prometió usar la suscripción desde el botón Generar ni eliminar el costo de API.
- Usar Codex localmente para preparar borradores es una alternativa, sujeta a acceso y límites del plan. Conectar ese flujo a la intranet requeriría diseñar y probar un puente local, con la computadora disponible. No está implementado ni validado.
- Conectar la intranet directamente a la API de OpenAI es otra alternativa técnica: prescinde de AI Gateway, pero implica autenticación y consumo de API según las condiciones aplicables.

Fuentes oficiales consultadas:

- Codex SDK: https://learn.chatgpt.com/docs/codex-sdk
- Autenticación de Codex: https://learn.chatgpt.com/docs/auth
- Alcance de uso del plan en aplicaciones: https://developers.openai.com/siwc/token-sharing-open-source
- Codex app-server con el plan: https://developers.openai.com/siwc/token-sharing-open-source/codex-app-server
- Limitaciones de la integración: https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations

## Cómo retomar

1. Leer la aclaración de continuidad siguiente y esperar las conclusiones de la revisión con el ingeniero. La recomendación comunicada es mantener Gateway; no volver a confundir esta consulta con v0 o con la herramienta para desarrollar la intranet.
2. Revalidar documentación, tarifas y disponibilidad de cuenta; no asumir que la suscripción cubre una aplicación remota.
3. Si se habilita un proveedor, probar primero con información sintética y comprobar consumo antes de anunciar generación operativa.
4. Conservar formularios, fuentes confirmadas, guardado, versiones y revisión del borrador existentes al adaptar la conexión.

No se cambió código de la aplicación, configuración de proveedor ni facturación como parte de este análisis.

## Aclaración de continuidad tras la comparación con Codex

El usuario pide expresamente conservar esta conversación para la próxima sesión.

- El tema es la generación de contratos y documentos desde datos y archivos ya incorporados a la intranet para ventas y alquileres. No se está comparando v0 con Codex para diseñar o programar la web. La respuesta inicial confundió esos temas; no repetir esa interpretación.
- La recomendación final comunicada es mantener la integración existente de Vercel AI Gateway con el modelo de OpenAI para el botón Generar. Codex puede ayudar a construir la función, pero sustituir la integración por Codex no tiene una ventaja demostrada para este flujo ni garantiza aprovechar la suscripción en la intranet remota.
- Se explicó que Gateway también puede reutilizarse para otros documentos y para el apartado de textos de inmuebles, actualmente basado en plantillas. Se sugirió combinar plantillas con generación/mejora mediante IA usando datos confirmados de la ficha, con revisión y guardado. Son posibilidades futuras: no se implementaron ni se autorizó ampliar el alcance.
- Los usos adicionales sumarían consumo. Las cifras de US$0.02–0.05 por generación y los ejemplos mensuales anteriores son estimaciones para contratos, no una tarifa garantizada para cualquier documento ni un costo medido.
- Se explicó la distribución del módulo: acceso desde FASE 1/Seguimiento y detalle del inmueble; pasos Datos y fuentes, Completar acuerdos, Confirmar y generar, Revisar borrador. Documentos: intervención para venta/alquiler; estructura de alquiler, contrato de alquiler e informe de riesgos para alquiler; estructuras de promesa de venta y minuta para venta.
- Se distinguió lo implementado (formularios, fuentes, guardado, edición, versiones y exportación) de lo pendiente de validar con el proveedor real (propuestas y generación). El último bloqueo registrado es HTTP 403 por habilitación de facturación de Gateway; no se volvió a consultar la cuenta ni se acreditó una generación real en esta conversación.
- Última decisión: el usuario revisará el tema con el ingeniero y después comunicará qué documentos y funciones necesitan. La activación sigue pendiente. No activar facturación, comprar créditos, cambiar proveedor ni ampliar funciones por esta solicitud de conservar contexto.
- Al retomar, partir de ese estado y de lo que traiga el usuario tras hablar con el ingeniero. Consultar también `docs/documentos-contratos-ia-2026-11-07.md` para el detalle técnico y las limitaciones.
