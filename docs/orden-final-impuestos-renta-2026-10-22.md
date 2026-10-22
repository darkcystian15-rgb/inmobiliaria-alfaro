# Orden final de Impuestos y constancias y sustento de renta

22 de octubre de 2026. Base: d312704. Cambios y despliegue en Vercel autorizados por el usuario. Revisión independiente pendiente.

## Carpeta 4

La documentación se separa visualmente en vendedor y comprador. El orden del vendedor es:

1. Liquidación del vendedor.
2. Formulario de impuesto a la renta.
3. Voucher de pago del impuesto a la renta.
4. Exoneración del impuesto a la renta.
5. Liquidación de autovalúo y arbitrios municipales.
6. Voucher de pago de impuestos municipales, autovalúo y arbitrios.
7. Constancia de no adeudo de autovalúo y arbitrios.

El comprador tiene exactamente tres apartados, habilitados por la asignación guardada desde la carpeta 1:

1. Liquidación de alcabala.
2. Voucher de pago de alcabala.
3. Formulario de cancelación de alcabala.

Se retira el apartado independiente Alcabala (COMPRADOR_ALCABALA_DOCUMENTO), como solicitó el usuario. No se eliminan registros ni archivos. Si existiese algún archivo anterior con esa categoría, permanece consultable en Otros archivos conservados; no se reclasifica por suposición. Las otras tres categorías del comprador conservan sus claves y archivos, con los rótulos y el orden final.

## Condición de renta dentro de Exoneración

El selector y su sustento se completan en el mismo apartado, sin ventanas emergentes:

- **Paga:** observación obligatoria de hasta 2000 caracteres que explica por qué paga. Mantiene como documentos aplicables formulario y voucher. La API rechaza guardar esta opción sin explicación.
- **No paga:** dos archivos separados dentro de Exoneración: documento de exoneración y búsqueda nacional. Una observación o un enlace anterior no sustituyen estos archivos. Formulario y voucher dejan de ser exigibles, manteniendo sus archivos anteriores visibles.
- **Sin seleccionar:** aviso de condición pendiente.

La búsqueda nacional existente del vendedor se reutiliza con su misma clave y archivo; cuando No paga, se presenta dentro de Exoneración en la carpeta 4. Cuando Paga o está pendiente, conserva su organización de identificación y las reglas previas de persona natural. La condición No paga admite el documento para vendedor natural o jurídico. La agrupación no mueve físicamente ni duplica archivos.

Las decisiones anteriores afecto/exonerado se interpretan como Paga/No paga, sin migración de datos. La observación nueva se almacena en la configuración JSON versionada del expediente. Una ficha histórica con Paga y sin observación muestra el pendiente; no se inventa una explicación ni se escribe sobre ella durante la comprobación.

Se conservan las notas para asignar comprador, las cargas por ítem con varios archivos, nombres, observación, vista previa, descarga, permisos e historial. Los alquileres mantienen su expediente propio.

## Validación

35 archivos unitarios aprobados; ESLint sin advertencias; TypeScript y compilación de producción Webpack correctos. Nuevas comprobaciones cubren orden 7/3, retirada de la categoría genérica, observación obligatoria, documentos de exoneración y búsqueda independientes, persona natural/jurídica y conservación del archivo de búsqueda una sola vez al cambiar de condición.

Navegador autenticado contra la compilación local: lectura real del catálogo y ocho escenarios de interfaz con respuestas ficticias para los guardados (1440/375 px, vendedor natural/jurídico). Ocho guardados simulados, cuatro rechazos de observación vacía, dos cargas separadas en No paga, selector dentro de Exoneración, sin diálogos ni desbordes. Cero errores de ejecución y escrituras de negocio; cuenta/sesión temporales eliminadas.

Respaldo privado de fuente y referencia Git: restore-points/renta-final-20261022/. Sin migraciones ni cambios de negocio reales.

## Publicación y pendiente externo

La publicación de esta versión y la comprobación del dominio están en curso. La copia literal de 50 MB de la entrega anterior sigue pendiente de instalar y verificar documentos.php en cPanel; Vercel por sí solo no activa esa ampliación. No se modifica ni se da por completado ese pendiente en esta entrega.
