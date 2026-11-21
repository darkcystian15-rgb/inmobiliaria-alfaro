> Actualización vigente: [Búsqueda nacional solo para el vendedor](busqueda-nacional-solo-vendedor-2026-11-10.md). Comprador: no aplica para natural ni jurídica. Vendedor: aplica para natural y jurídica con No paga. Las reglas distintas descritas más abajo corresponden a versiones anteriores.

# Búsqueda nacional del vendedor según la condición de renta

En FASE 2 → Impuestos y constancias, la búsqueda nacional del vendedor aplica únicamente a persona jurídica cuando se elige No paga impuesto a la renta (renta=exonerado).

- Sí paga: la búsqueda nacional del vendedor no aplica, no se solicita y no cuenta entre los requisitos ni bloquea el cierre. Se mantienen la observación del motivo y los documentos de renta existentes.
- No paga (persona jurídica): se exige el archivo de búsqueda nacional del vendedor, por separado del documento de exoneración. Una nota o enlace externo no lo sustituye.
- Pendiente: no se solicita aún la búsqueda; se mantiene el pendiente de elegir la condición tributaria.

Para vendedor persona natural no aplica búsqueda nacional, incluso con No paga; no cuenta para avance ni cierre. Actualización: [orden e impuestos](orden-identificacion-impuestos-2026-11-10.md). La búsqueda nacional del comprador aparece para persona jurídica asignada y no para persona natural. Alquiler conserva sus documentos propios y no incorpora estos requisitos de venta.

No se borran archivos ni notas guardadas al cambiar la condición: los adjuntos inactivos permanecen en Documentos anteriores y recuperan su aplicación cuando vuelve a elegirse No paga. La validación compartida afecta pantalla, progreso, carga/reclasificación y cierre del expediente, en vez de ocultar solamente un campo.

Verificación: pruebas de expediente, clasificación de carpetas y adjuntos opcionales; matriz de vendedor natural/jurídico y condición pendiente/paga/no paga, conservación de archivos y requisitos de cierre; TypeScript y ESLint. Prueba de navegador de FASE 2 en 375/1440 px con API simulada para el cambio entre ambas condiciones, conservación de notas anteriores y regresión de alquiler. No se escriben documentos en expedientes de clientes durante las pruebas.

## Alcance de la regla interna

La condición solicitada por el usuario organiza los requisitos del expediente; no determina por sí misma la obligación tributaria. SUNAT distingue comprobante/formulario de pago y comunicación/documentación de no obligación, según el motivo. Su orientación no establece la búsqueda nacional como requisito universal para todos los supuestos de no pago. Una ampliación futura podría registrar el motivo y solicitar el sustento específico, en vez de equiparar toda no obligación a una sola causal. Esta entrega mantiene el criterio interno expresamente solicitado, sin inferir una exoneración legal ni modificar reglas adicionales.

Fuente consultada el 10/11/2026: https://orientacion.sunat.gob.pe/03-otras-obligaciones-de-rentas-de-segunda-categoria-por-venta-de-inmueble y https://www.gob.pe/8247.

## Publicación

Producción Next.js, proyecto inmobiliaria-alfarov2, equipo team_qcKFQOeqeLWTJFsCLGnZvPiL. Despliegue dpl_5VYbftMV2Pa75DERbJHhydP1ktCj, estado READY; URL https://inmobiliaria-alfarov2-gkpmc0h73-puma19.vercel.app. Preparado sin asignación de dominio, comprobado con GET privado (401 esperado sin sesión), promovido y confirmado mediante inspect de la intranet. Compilación de Vercel: 58 s. Sin registros de nivel error en la consulta del despliegue. Base Git 288e7060b41df8f9eafc2bfa67c102ff186a35b7 con archivos de trabajo locales. Pruebas de las tres suites y navegador en ambos anchos completadas correctamente; sin migraciones ni cambios en documentos de clientes.
