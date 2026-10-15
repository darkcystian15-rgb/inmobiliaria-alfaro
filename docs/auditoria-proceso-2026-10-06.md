> Referencia de versión: consultar [Estado actual](estado-actual-2026-10-15.md) antes de usar los pendientes o instrucciones de este documento. Se conserva el contenido como registro de su revisión.

# Auditoría del proceso y de los datos de prueba — 2026-10-06

## Resultado y alcance

Se revisaron registro, posiciones, visitas, evidencia, tasaciones/precios, preparación y confirmación de publicación, anuncios externos, propietarios compartidos, responsables/plazos, borradores, cierre por venta/alquiler, liberación de posiciones, historial, reportes y permisos. La revisión combina lectura de código, consultas de integridad, pruebas automatizadas con registros temporales y comprobación de la versión publicada. No certifica la exactitud comercial ni geográfica de los datos ficticios ni sustituye una revisión visual manual completa.

Pasaron los 16 archivos de pruebas unitarias; las integraciones `photos.integration.mjs` y `operational-improvements.integration.mjs`; y la comprobación `operational-production.smoke.mjs` contra Vercel. Las 17 comprobaciones de `scripts/audit-system.mjs` quedaron en cero después de regularizar los datos y retirar los registros temporales.

## Datos encontrados

12 inmuebles activos, 12 propietarios, 12 posiciones ocupadas de 90, 2 visitas realizadas, una tasación y una publicación. No había cierres, anuncios externos ni asignaciones manuales de responsable/plazo. Había siete archivos alojados: seis imágenes y un PDF.

Las diez fichas sin visita representan etapas pendientes válidas, no registros de visita incompletos. El inmueble de posición 7 tiene visita y está pendiente de tasación. El de posición 11 estaba publicado pero carecía de archivos de DNI y tasación. Los inmuebles 11 y 12 no tenían localidad ni medidas completas; todos carecían de características y correo de contacto. El terreno 7 tenía 18 000 m² construidos y 180 m² de terreno. Ningún inmueble estaba marcado explícitamente como dato de prueba, aunque todos fueron declarados ficticios por el usuario.

## Cambios realizados en la base compartida

- Se marcaron los 12 inmuebles como `datos_prueba=1`, sin validarlos como reales.
- Se conservaron direcciones, nombres, precios existentes, fotografías, fechas de actividades y posiciones.
- Se completaron correos con el dominio reservado `example.invalid`, referencia de contacto ficticia y teléfonos/DNI faltantes de demostración. Estos valores no deben utilizarse como contactos o identificación reales.
- Se completaron localidad, medidas, características y observaciones faltantes; para terrenos sin edificación se usó cero en área construida, habitaciones y baños.
- Se corrigieron las medidas del terreno 7 y se retiraron sus coordenadas no verificadas. Las direcciones siguen siendo ficticias; no hay coordenadas guardadas después de esa corrección.
- Se dejaron las posiciones 2 y 5 como ejemplos de alquiler. Ambas siguen pendientes de visita; no se reinterpretó ningún precio existente.
- Se sustituyó el texto de demostración de la publicación 11 por uno descriptivo explícitamente ficticio y se retiró el enlace de Drive de ejemplo.
- Se añadieron dos PDF al inmueble 11, categorías DNI_PROPIETARIO y TASACION, con el texto visible «SOLO PRUEBA - SIN VALIDEZ». No son documentos de identidad ni informes profesionales.
- Se descargaron y verificaron los siete archivos previos; se comprobó que los dos nuevos coinciden con sus bytes originales tras subirlos. Total final: nueve archivos.
- Se asignaron responsables de demostración y fecha límite 2026-10-09 a once tareas actuales: diez visitas y una tasación.
- Se normalizó el campo legado `etapa` conforme a los hechos existentes y se agregó historial de auditoría a cada inmueble.

No se inventaron visitas realizadas, tasaciones para inmuebles sin visita, anuncios en plataformas externas ni cierres. No se liberaron posiciones ni se crearon contratos ficticios para simular hechos inexistentes. No se borraron registros o archivos originales.

Resultado final: 12 activos, 10 pendientes de visita, 1 pendiente de tasación y 1 publicado con expediente de demostración completo; 10 ventas y 2 alquileres; 78 posiciones disponibles; cero cierres. Los reportes requieren activar «Incluir datos de prueba». Panel y agenda excluyen estos registros de sus totales de negocio real; las posiciones ocupadas continúan contando como ocupadas.

## Mejoras recomendadas

1. **Panel con modo de demostración explícito.** Hoy el panel/agenda excluye pruebas y Cartera las muestra con su distintivo. Con todos los datos ficticios puede parecer que el panel está vacío aunque Cartera tenga 12 inmuebles. Añadir un selector visible Real / Demostración y avisar del ámbito de los contadores.
2. **Separar nombre del inmueble y nombre del propietario.** El registro actual usa el mismo nombre como referencia e identidad inicial del propietario. Añadir «Nombre o referencia del inmueble» y completar propietario en un apartado independiente evita propietarios llamados «Casa prueba».
3. **Coherencia de fechas del proceso.** Las fechas no válidas o futuras se rechazan, pero no se exige que la fecha de tasación sea igual o posterior a una visita completada. Añadir esta comprobación o una confirmación de registro retrospectivo. No exigir que todo hecho sea posterior al alta en el sistema: una captación puede registrarse después de una visita real.
4. **Ubicación estructurada.** Calle/número y distrito/provincia/departamento deberían ser campos separados, con localidades consistentes. Las coordenadas deben guardarse cuando se confirman; una dirección ficticia o un punto aproximado no debe adquirir apariencia de ubicación verificada.
5. **Reglas de medidas por tipo.** Terrenos sin construcción pueden usar cero; locales/oficinas podrían mostrar «Ambientes» en lugar de «Habitaciones». Una superficie construida mayor que terreno puede ser válida en edificios de varias plantas: conviene avisar ante valores extremos, no prohibirlo automáticamente.
6. **Alquiler después del cierre.** La versión actual registra renta, garantía, adelanto y fechas, y libera posición. Si se necesita administrar el contrato, agregar alertas de vencimiento, renovación y reingreso a cartera. No existe todavía gestión de cobros mensuales; debe definirse si está dentro del alcance.
7. **Cierre y contrato.** Decidir si conviene un adjunto opcional de contrato/comprobante y un estado específico del contrato. Actualmente el cierre vendido/alquilado se consulta en ficha y reportes; el inmueble sale como histórico.
8. **Datos derivados y campo de etapa.** Las pantallas calculan avances desde visitas/precios/documentos/publicación, mientras el campo antiguo `etapa` puede conservar un valor desactualizado. Elegir una única fuente de verdad o actualizarlo sistemáticamente.
9. **Antes de usar información real.** Rehabilitar el segundo factor de inicio de sesión si se mantiene como requisito: `LOGIN_MFA_REQUIRED` está temporalmente en false. Conservar usuarios, catálogo y configuración en el futuro vaciado; separar eliminación de datos y limpieza de archivos alojados, con copia de respaldo y vista previa.

No se modificaron reglas de negocio ni permisos durante esta auditoría. Los cambios son de datos de prueba y herramientas/documentación de auditoría; son visibles en Codespaces y Vercel porque utilizan la misma base y alojamiento de archivos. No se requiere un nuevo despliegue de la interfaz.
