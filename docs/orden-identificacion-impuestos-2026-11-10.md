> Actualización vigente: [Búsqueda nacional solo para el vendedor](busqueda-nacional-solo-vendedor-2026-11-10.md). Comprador: no aplica para natural ni jurídica. Vendedor: aplica para natural y jurídica con No paga. Las reglas distintas descritas más abajo corresponden a versiones anteriores.

# Orden de identificación y búsqueda nacional

## Punto 1. DNI y poderes

Comprador y vendedor usan la misma secuencia:

1. Tipo de persona: natural o jurídica.
2. Estado civil para persona natural: Por verificar, Soltero, Casado y Varios compradores / Varios vendedores.
3. Régimen patrimonial cuando se selecciona Casado: Por verificar, Sociedad conyugal o Separación de bienes.
4. Documentos correspondientes a las condiciones seleccionadas.

Varios compradores y Varios vendedores se mantienen como agrupaciones, sin registrar un estado civil individual por integrante. La asignación del comprador se conserva antes de sus condiciones. Las personas jurídicas acceden directamente a los documentos de empresa y gerente.

Representación y sus documentos quedan dentro de Documentos. Se conservan las excepciones propias del vendedor, la partida matrimonial y la separación de bienes según sus condiciones. Los valores internos existentes no cambian: uno, matrimonio y varios; no se requiere migración. Los archivos que dejan de aplicar siguen disponibles en Documentos anteriores.

## Punto 4. Impuestos y constancias

La búsqueda nacional del vendedor solo aplica a persona jurídica con renta No paga. Para persona natural no se solicita con ninguna condición de renta, no cuenta para el avance y no bloquea el cierre. El texto de exoneración solicita únicamente exoneración para persona natural. La búsqueda nacional del comprador aparece únicamente para comprador asignado como persona jurídica; no aparece ni bloquea el cierre para persona natural. Corrección posterior: la primera publicación de este documento todavía conservaba la regla anterior del comprador. Los archivos anteriores del vendedor se conservan.

Esta actualización reemplaza la regla anterior que incluía vendedores naturales al seleccionar No paga.

## Verificación

- TypeScript y ESLint del componente: correctos.
- Pruebas de expediente: correctas, con matriz de persona y renta, conservación de archivos y cierre.
- Navegador con API simulada en 375 y 1440 px: orden de ambos bloques, documentos condicionales, representación, guardado y reapertura, documentos anteriores, persona jurídica y solo lectura correctos.
- Pruebas de carpetas y documentos adicionales: correctas.
- Navegador de FASE 2 en 375 y 1440 px: impuestos, ausencia de búsqueda nacional para vendedor natural con No paga, sincronización del comprador, alquiler y solo lectura correctos.
- Sin escrituras de prueba en expedientes reales.

## Publicación

- Producción Next.js, proyecto inmobiliaria-alfarov2, equipo team_qcKFQOeqeLWTJFsCLGnZvPiL.
- Despliegue dpl_HW2wn92qzaXSVoRVajM7i6CiMhLR, estado READY.
- URL del despliegue: https://inmobiliaria-alfarov2-n8ivv1yyv-puma19.vercel.app.
- Publicado mediante CLI desde el estado local del proyecto, sobre la base Git 288e7060b41df8f9eafc2bfa67c102ff186a35b7; sin commit nuevo.
- Preparado con --prod --skip-domain y promovido después de comprobar GET del expediente: HTTP 401 y JSON de inicio de sesión esperado. La comprobación se completó por CLI; el conector no pudo superar la autenticación del despliegue.
- Confirmado por consulta del dominio https://intranet.inmobiliariaalbertoalfaro.com.pe: resuelve al mismo despliegue READY.
- Compilación de Vercel completada en 57 segundos.
- Consulta de registros de nivel error de los últimos cinco minutos: sin registros encontrados.
- Sin migraciones ni escrituras de prueba en documentos de clientes.


## Corrección del comprador

Se corrigió COMPRADOR_BUSQUEDA_NACIONAL: solo aplica al comprador asignado como persona jurídica. Para natural no aparece como requisito ni impide cerrar. Los archivos existentes se conservan en Documentos anteriores. La nota de preparación y el requisito de archivo al cierre siguen vigentes cuando aplica a jurídica.

Verificación: tres suites (expediente, carpetas y extras) correctas; navegador en 375/1440 px con cambio natural → jurídica desde Impuestos y constancias correcto.

Publicación de esta corrección: despliegue dpl_9sVXbkYYXvBmvquU6cnc3cbk4L3w, producción READY, https://inmobiliaria-alfarov2-oqjdst11m-puma19.vercel.app. Compilación de Vercel: 52 s. GET privado comprobado por CLI (401 JSON de inicio de sesión esperado); promovido a la intranet. TypeScript y ESLint correctos.
