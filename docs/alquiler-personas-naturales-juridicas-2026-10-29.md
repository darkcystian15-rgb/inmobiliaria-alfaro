# Personas naturales y jurídicas en el expediente de alquiler

29 de octubre de 2026.

## Cambio

En Datos de inmuebles → FASE 2 → 1. DNI y poderes, el alquiler permite elegir de forma independiente el tipo de persona del arrendador y del arrendatario. Admite natural/natural, jurídica/jurídica y ambas combinaciones mixtas. Venta conserva sus selectores de vendedor y comprador.

- Persona natural: DNI; si firma mediante representante, poder y vigencia de poder.
- Persona jurídica: ficha RUC, DNI del gerente y vigencia de poder del gerente.

Guardar condiciones habilita la subida de las categorías aplicables. El avance y la validación documental de cierre consideran los tipos elegidos. Los expedientes antiguos requieren seleccionar ambos tipos; no se presume su condición. Los documentos anteriores se conservan y continúan visibles aunque no apliquen al nuevo tipo. Las categorías históricas de vendedor/comprador se reconocen sin reescribir los archivos.

## Alcance técnico

Cambios en `app/components/TransactionDossier.tsx`, `lib/transaction-dossier.mjs` y `tests/transaction-dossier.test.mjs`. Los tipos nuevos se guardan en la configuración JSON existente: no se requiere migración ni actualización del hosting PHP. Se mantienen los permisos, la versión del expediente y la protección de cambios sin guardar.

La entrega incluye únicamente este ajuste y su documentación. Los cambios locales previos de Cartera, publicaciones y hosting quedan fuera.

## Verificación

- TypeScript y ESLint de los archivos modificados aprobados.
- 44 archivos de pruebas unitarias aprobados en el workspace y 43 en la entrega aislada (que excluye una prueba de publicaciones ajena al cambio), incluyendo las cuatro combinaciones, documentos obligatorios de cierre, validación de tipos y conservación de archivos.
- ESLint aprobado también en la entrega aislada. Next.js 16.3.8 compiló con webpack, aprobó TypeScript y generó 63 páginas; se utilizó una URL ficticia local para satisfacer la configuración obligatoria, sin conectar con producción. El despliegue se verifica abajo.
- No se realizaron escrituras de prueba en los inmuebles de producción. La prueba funcional autenticada en producción no forma parte de las comprobaciones realizadas.

## Recuperación

Código anterior: `524d997d4eae64c88dc7e1feca5a656cd386fdbe`.
Despliegue anterior confirmado por GitHub: Production `7370935876`, estado success, https://inmobiliaria-alfarov2-8avr1j6oj-puma19.vercel.app.

Para recuperar el comportamiento anterior, revertir el commit funcional de esta entrega o promover el despliegue anterior tras revisar cualquier actualización posterior. Las claves nuevas del JSON pueden conservarse; no es necesario borrar documentos ni restaurar datos.

## Publicación

Pendiente de confirmar el despliegue automático de Vercel desde `main` y la respuesta del dominio oficial.
