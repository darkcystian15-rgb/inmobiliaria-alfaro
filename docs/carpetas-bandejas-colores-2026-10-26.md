# Listados compactos de inmuebles con colores por apartado

26 de octubre de 2026.

## Diseño vigente

La referencia es la **vista de listado de Cartera**, no su vista de carpetas por posición. Los cinco apartados usan una sola lista de filas horizontales con separadores, posición e icono pequeño de carpeta, contacto, resumen del inmueble, estado y acciones. En móvil, las acciones pasan debajo de los datos. No se presentan tarjetas de carpetas ni cuadrículas de inmuebles.

| Apartado | Color de icono, etiqueta y borde lateral |
| --- | --- |
| Visitas pendientes | Ámbar |
| Tasaciones pendientes | Naranja |
| Textos pendientes | Violeta |
| Publicaciones pendientes | Celeste |
| Tasaciones negociadas registradas | Verde |

El componente compartido `PropertyTaskRow` conserva una apariencia uniforme. Los registros completados mantienen su etiqueta verde. Publicaciones pendientes usa el mismo listado aunque todavía no tenga registros; no se crean datos ficticios.

Las tasaciones registradas conservan los tres valores y sus monedas, presentados en una línea flexible de detalles, y los accesos a actualizar valores e ir a textos. Visitas conserva antigüedad y plazos. Búsquedas, filtros, orden, permisos y enlaces no cambian. No se modifica la base de datos.

`PortfolioPropertyCard` vuelve a su implementación anterior a estos cambios: la vista de carpetas de Cartera conserva su comportamiento. Las carpetas de selección de zonas también se conservan.

## Antecedentes y restauración

Las entregas `309c4ff` y `d1f5d3f` interpretaron erróneamente la referencia como tarjetas de carpetas. Esta corrección las sustituye por listas y es la versión que debe conservarse.

Revisión anterior a esta corrección: `986a214`. Para revertir solo esta entrega, revertir su commit funcional y desplegar; ello recupera las tarjetas de la entrega anterior, no el diseño solicitado en listas. No requiere migraciones ni restauración de datos.

Respaldo previo al conjunto de cambios: revisión `9a8f5ec6595fef1758861b7a41fc29ba35234c4e`, bundle completo verificado en `restore-points/carpetas-bandejas-20261026/anterior.bundle`, excluido de Git y Vercel. SHA-256: `33cb3b3abe2635742bfe770aff083b7335294815b9c7c714ff1719a6c2be9e1e`.

## Verificación

ESLint de los cinco archivos de código modificados y tres pruebas existentes de listado, búsqueda y flujo de publicación aprobados. `git diff --check` correcto. Compilación Next.js 16.3.8 con webpack y TypeScript aprobada, 63 páginas generadas, usando una URL MySQL local de prueba sin conexión a producción. Publicado en `origin/main`: commit funcional `1f05531681a3b77de80eda86dee4a3b0ceacfa91`. Vercel confirmó ese SHA en **Production**, estado **success**, descripción «Deployment has completed». Despliegue GitHub `7333060804`, referencia Vercel `8ZdnDWog81rYvbS8fdfMsBfBiN6Y`. Dominio de la intranet: https://intranet.inmobiliariaalbertoalfaro.com.pe. La actualización documental posterior conserva el mismo código funcional. No se realizó una revisión visual autenticada con datos de producción.
