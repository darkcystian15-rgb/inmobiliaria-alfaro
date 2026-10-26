# Rectificación de venta y alquiler con tasación aprobada

26 de octubre de 2026.

## Comportamiento

Desde Cartera → inmueble → Editar datos, el administrador puede cambiar venta por alquiler o viceversa mientras el inmueble esté activo, incluso si tiene tasación aprobada o publicación registrada. Se conservan los tres importes, monedas, situación de aprobación, documentos y texto existente. El usuario puede editar los montos después mediante la edición de tasación existente.

El formulario avisa antes de guardar y después del cambio que deben revisarse los montos y, si existe publicación, su texto y precio. No se reescriben anuncios ni se sincroniza el portal automáticamente. El historial existente registra la operación anterior y la nueva; se mantiene la auditoría, la autorización de administrador, el bloqueo transaccional y la protección de expedientes cerrados. Los inmuebles históricos siguen bloqueados.

Se actualizan tanto el selector como la validación del servidor con la misma regla. No requiere migraciones ni modificaciones masivas de datos. Esta entrega habilita la rectificación; no cambia por sí misma la ficha de Juan Zúñiga ni resuelve la diferencia S/ 2,300 frente a S/ 3,200.

## Punto de restauración

Revisión previa: `7ead29d07227a02079c6e0a2e44e432000f886db`.

Referencia Git: `recovery/rectificacion-operacion-20261026`.

Historial completo: `restore-points/rectificacion-operacion-20261026/anterior.bundle`, excluido de Git y Vercel. Verificado con `git bundle verify`. SHA-256: `30800b9b7d9059a60e06f1a1aa70f7dc0f69ef5450eff6d1ee2f29864e797c5a`. El directorio también conserva el diff documental previo a esta tarea.

Para restaurar el comportamiento, revertir el commit funcional de esta entrega y desplegar de nuevo, o recuperar la revisión previa desde el bundle en otra carpeta. No restaurar toda la base: la actualización no modifica datos existentes. Revertir código no revierte rectificaciones que los usuarios hayan guardado posteriormente; esas quedan en el historial y deben tratarse individualmente.

## Verificación

Pruebas de política de edición, registro simplificado y checklist de publicación aprobadas. La política cubre inmuebles activos con/sin tasación o publicación y bloqueo en estados históricos. ESLint de los archivos modificados sin errores.

Pruebas adicionales de monedas y Portal web aprobadas. Compilación Next.js 16.3.8 con webpack y TypeScript correcta, 63 páginas. La primera compilación encontró el marcador de DATABASE_URL local; se repitió con una URL sintácticamente válida de prueba en 127.0.0.1, sin conexión a producción. No se realizó una prueba autenticada de escritura ni se modificó la ficha real.

## Publicación

Commit funcional `cec6cefcfeb16bc77e87254977920fbd750fc3a6`, publicado en `main`. Referencia de restauración publicada también en `origin`.

Vercel confirmó el despliegue `dpl_8YDdvba7CgfhE9LZiCaPmpMLo72f`, estado **READY**, entorno **production**, con el SHA exacto del commit funcional. Versión: https://inmobiliaria-alfarov2-2b71oak0p-puma19.vercel.app. Dominio asignado confirmado: https://intranet.inmobiliariaalbertoalfaro.com.pe.

Comprobación HTTP del dominio: `/login` devuelve 200, `/cartera` devuelve 307 a `/login` sin sesión y `/api/inmuebles/565` devuelve 401 sin sesión. Estas comprobaciones validan disponibilidad y protección de acceso; no sustituyen una prueba autenticada de edición.

La actualización documental posterior conserva el mismo código funcional.
