# Información de inmuebles: Zonas y visitas

22 de octubre de 2026. Alcance solicitado: limpieza de dos bloques de presentación.

En `/datos-inmuebles` queda una sola cabecera «Zonas». La ruta superior se muestra únicamente al entrar en una zona o inmueble, conservando su acción para regresar al listado general.

En la carpeta Visitas queda «Visitas y evidencia», con las fotografías dentro de su visita. Se retiró el bloque «Fotos anteriores sin visita» y la nota que anunciaba ese bloque. Los archivos existentes se conservan; no se modificaron datos, asociaciones ni permisos. Administrador mantiene edición de visitas/fotos y operador consulta.

## Validación

- ESLint de los dos componentes aprobado.
- Compilación de producción y TypeScript aprobados.
- Navegador local autenticado: 16 vistas con administrador y operador a 1440/375 px. Cabecera única, navegación de regreso y retirada del bloque/nota comprobados. Cero errores de navegador y escrituras de negocio; cuentas técnicas eliminadas al terminar.
- Despliegue mediante integración Git de Vercel; verificación del dominio posterior al push.
- Revisión independiente pendiente; no disponible en esta sesión.
