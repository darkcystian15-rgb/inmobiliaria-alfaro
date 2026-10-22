# Cartera: fases y acceso directo a documentación

Fecha: 22 de octubre de 2026. Base: `84c18a5`.

## Resultado

En el panel de cualquier inmueble de Cartera, FASE 1 aparece en grande debajo
de la descripción de operación, tipo y dirección. FASE 2 aparece inmediatamente
antes de Antes de publicar.

Las cuatro tarjetas anteriores se reemplazan en Cartera por las siete carpetas
documentales de venta que ya utiliza Información del inmueble: DNI y poderes,
Documentos del inmueble, Contratos, Impuestos y constancias, Recibos y pagos de
servicios, Levantamiento de cargas y Tasaciones. Alquiler conserva sus cinco
carpetas específicas, sin añadir requisitos de venta.

Cada tarjeta consulta el expediente vigente y muestra sus documentos requeridos,
completados y pendientes. Completar o Ver registro abre Información del inmueble
con la zona, el ID interno y la carpeta seleccionados mediante `zona`, `codigo`
y `carpeta`. Las carpetas sin documentos exigidos ofrecen Abrir apartado; no se
presentan como documentos completos. Una consulta fallida permite reintentar y
mantiene disponibles los enlaces sin inventar un estado de cumplimiento.

Las reglas de publicación y las cuatro condiciones originales de servidor se
conservan. El cambio de tarjetas se limita a Cartera; no modifica las pantallas
de preparación de textos ni publica anuncios automáticamente.

## Conservación y recuperación

Sin migraciones, reclasificaciones, cambios de API ni escrituras de negocio.
Los documentos permanecen en sus carpetas originales. Fuente anterior privada:
`restore-points/cartera-fases-20261022/source-before.tar`. Para recuperar el diseño
anterior basta revertir el cambio de interfaz y desplegar, sin restaurar la BD.

## Validación y publicación

- 34 archivos de pruebas unitarias aprobados.
- ESLint sin advertencias aprobado para la implementación.
- Compilación Webpack y TypeScript aprobados. El primer intento restringido falló al leer la configuración de TypeScript; la compilación fuera del sandbox aprobó.
- Navegador contra compilación local: 24 aperturas correctas a 1440/375 px, siete carpetas de venta y cinco de alquiler, fases visibles, zona e ID conservados, cero errores y cero escrituras de negocio del navegador. Sesión y cuenta temporal eliminadas.
- Despliegue y comprobación del dominio: en curso.
- Revisión independiente pendiente; no se atribuye una revisión a otro asistente.
