> Referencia de versión: consultar [Estado actual](estado-actual-2026-10-15.md) antes de usar los pendientes o instrucciones de este documento. Se conserva el contenido como registro de su revisión.

# Venta y alquiler

El registro exige elegir Venta o Alquiler; las integraciones anteriores que omiten la operación mantienen Venta. Los inmuebles existentes conservan Venta y sus importes actuales. No se eliminan datos.

Ambos recorridos usan visitas, evidencia, precios acordados, documentos y publicación. Para alquiler, referencia, objetivo y precio anunciado se expresan por mes. Los campos internos de tasación se conservan por compatibilidad.

El administrador puede cambiar la operación desde Información de inmuebles antes de registrar precios o publicación y mientras el inmueble esté activo. Después se bloquea para evitar reinterpretar importes existentes.

Liberar inmueble ofrece Vendido para venta y Alquilado para alquiler. Alquilado requiere fecha de cierre no futura y renta mensual positiva. Comisión (cero si se omite), garantía y adelanto son importes independientes; inicio y fin del contrato son opcionales. Si se omite el inicio, se guarda la fecha de cierre. La ficha conserva estos datos, el historial y los documentos, y la posición queda libre.

Reportes incluye filtro de operación y Alquilados por fecha de cierre. Alquilados se excluye de Vendidos y Retirados / cancelados. La renta solicitada y la acordada tienen columnas propias, separadas del precio final de venta en pantalla, PDF y Excel. No se implementa cobro mensual ni renovación automática del contrato.

Instalación idempotente: `node scripts/install-rentals.mjs`. Migración: `0011_glossy_grandmaster.sql`. El instalador no borra registros.
