# Resumen informativo del inmueble — 22 de octubre de 2026

## Cambio solicitado

El usuario pidió retirar la carpeta Resumen del inmueble y mostrar su información
precisa al inicio, encima de las carpetas, sin enlaces directos ni botones de gestión.
También pidió retirar de la vista Otros archivos conservados cuando esté vacío.
Autorizó documentar y alinear la entrega completa hasta Vercel. Solo intranet.

## Resultado

- La cabecera conserva contacto, identificación, operación, tipo, dirección, zona,
  estado y precio final/de venta o alquiler.
- Al abrir un inmueble aparece Resumen del inmueble antes de las carpetas: fecha
  de registro, número de documentos/fotos, estado documental, estado de publicación,
  valor de referencia y objetivo. Si existe cierre, conserva sus importes y fechas
  de venta o alquiler, comisión, garantía y adelanto, según los datos guardados.
- El resumen es únicamente informativo. Se retiran sus enlaces de visitas/fotos,
  documentación, captación anterior y acciones para completar pasos, junto con los
  controles duplicados de avance/publicación. Los apartados operativos siguen en
  sus carpetas y los datos originales permanecen en la base.
- La captación anterior, cuando existe, figura como dato, sin enlace directo.
- No hay carpeta Resumen. Los enlaces anteriores a Resumen abren la vista inicial
  del inmueble con la información sobre las carpetas.
- Otros archivos conservados se muestra únicamente cuando el inmueble tiene
  documentos que no encajan en las categorías de su operación. Si aparece alguno,
  conserva su carpeta y acceso; no se elimina ni reclasifica automáticamente.
- Se conserva el acceso por URL a Otros archivos incluso cuando esté vacío.
- La carga completa dentro de cada ítem de venta/alquiler no cambia.

## Datos y respaldo

Sin cambios de esquema, APIs de escritura, categorías, enlaces de archivos ni
operaciones de negocio. No hay migraciones ni eliminación de documentos.

La consulta de solo lectura del 22/10/2026 a las 05:59:57 UTC encontró ocho
documentos y cero archivos sin clasificar. Es una observación fechada: no se
fuerzan los datos actuales a esos conteos ni se oculta un archivo que aparezca después.

Base: `4f6ebf4f9f1116cd41b89c7d37262776cbb59135`.
Copia de fuente previa en `restore-points/resumen-informativo-20261022T060626Z/source-before.tar.gz`, fuera de Git.
Se mantienen los respaldos completos anteriores descritos en la entrega del explorador.
Para volver al diseño anterior basta revertir esta entrega y desplegar; no restaurar
la base ni volver a importar documentos para deshacer un cambio de presentación.

## Validación

- 34 archivos unitarios aprobados, TypeScript, ESLint y compilación Webpack correctos.
- Pruebas de conservación cubren documentos anteriores, requisitos que no aplican,
  tipos sin clasificar y visibilidad condicional de la carpeta Otros archivos.
- Integración MySQL/HTTPS/navegador aislada: aprobada. Comprueba un inmueble
  ficticio con un archivo sin clasificar, otro sin esos archivos, el resumen antes
  de las carpetas, ausencia de controles y compatibilidad de enlaces anteriores.
- Venta y alquiler a 1440/375 px, sin errores ni desbordes. Se mantiene la carga
  dentro de cada ítem y la consulta del documento ficticio sin clasificar.
- En el primer ensayo la segunda carga de alquiler se intentó mientras todavía
  se refrescaba la primera; se ajustó la espera de habilitación del selector
  en la prueba y la repetición completa aprobó. Sin cambio de reglas de carga.
- Publicación y comprobación autenticada del dominio: aprobadas; detalle abajo.

Revisión independiente pendiente. Respaldos, capturas y datos privados quedan fuera de Git.

## Publicación y comprobación real

Código funcional: `6d12c5319341a6d5e762600a7d03707e9410af56`, enviado a main.
Vercel Production: `dpl_A1CJQP1Z447qsSMkyYqBA9A3oQqx`, despliegue completado.
[Versión funcional](https://inmobiliaria-alfarov2-dpftn073g-puma19.vercel.app).
Dominio: https://intranet.inmobiliariaalbertoalfaro.com.pe.

Consulta de clasificación actualizada a las **06:13:23 UTC**: ocho documentos,
cero archivos sin clasificar y cero inmuebles con contenido en Otros archivos.

Verificación autenticada terminada el **22/10/2026 a las 06:14:19 UTC**:

- Cuatro vistas: venta y alquiler, a 1440 y 375 px.
- Resumen antes de las carpetas, sin enlaces, botones ni campos de gestión.
- Sin carpeta Resumen ni carpeta Otros archivos vacía; los enlaces antiguos a
  Resumen abren la información inicial. La conservación de documentos desconocidos
  se ensayó en MySQL aislado con un archivo ficticio.
- Selección temporal, nombre, observación y confirmación de subida disponibles
  dentro del ítem, sin formulario común al final. Cancelación correcta.
- Ocho documentos conservaron sus metadatos y su contenido SHA-256.
- Cero archivos enviados, escrituras de negocio del navegador o errores JavaScript.
  La cuenta y sesión de verificación se eliminaron al terminar.
- MySQL local de ensayo detenido.

[Evidencia agregada de producción](evidencia-resumen-informativo/PRODUCCION.json).
Capturas privadas en `output/inline-upload-production/overview-*.png`, fuera de Git.
El commit posterior de documentación conserva el mismo código de aplicación.
