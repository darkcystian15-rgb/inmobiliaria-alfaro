# Inmobiliaria Alfaro — intranet

Sistema privado de gestión de inmuebles construido con Next.js, React, TypeScript, MySQL y Drizzle. Incluye cartera por zonas, captación, visitas, precios, documentación, publicación, cierres, alquileres y reportes.

## Estado y avances

- [Identificación y descripción de Cartera](docs/identificacion-cartera-2026-10-18.md): corrección posterior a la última publicación acreditada.

Consultar primero [Repositorio y estado de entrega](REPOSITORIO.md): repositorio, rama, código publicado, funcionalidad y límites de verificación. Última publicación acreditada: expediente del 16 de octubre; consulta en vivo del 18 de octubre bloqueada por HTTP 403.

- [Expediente de vendedor, comprador e inmueble](docs/expediente-operacion-2026-10-16.md): nueva organización documental y estado del expediente; mismas reglas para venta y alquiler.
- [Retirada de mapas y coordenadas](docs/retirada-mapas-2026-10-15.md): cambio posterior al estado consolidado; conserva ubicación referencial y zonas comerciales.

[Estado del 15 de octubre](docs/estado-actual-2026-10-15.md) se conserva como referencia histórica. Los documentos históricos conservan decisiones y pruebas de versiones anteriores; sus pendientes no describen necesariamente la versión actual.

- [Seguimiento de cambios](docs/seguimiento-cambios-2026-10-15.md).
- [Zonas de cartera unificadas](docs/zonas-cartera-unificadas-2026-10-15.md).
- [Edición desde Cartera](docs/edicion-desde-cartera.md).
- [Registro simplificado y recuperación](docs/registro-simplificado-2026-10-15.md).
- [Mapa funcional de la versión anterior](docs/mapa-funcional-revisado-2026-10-15.md).
- [Acceso y usuarios](docs/acceso.md).

## Desarrollo

Instalar las dependencias con `npm ci` y configurar privadamente `.env.local` según los servicios del entorno. No guardar credenciales en Git. La aplicación requiere MySQL y el almacenamiento documental usa un servicio HTTPS de hosting.

```sh
npm run dev
```

Abrir http://localhost:3000. Los administradores gestionan la cartera; los operadores acceden a Información de inmuebles según sus permisos.

## Comprobaciones

```sh
node --test tests/*.test.mjs
npm run lint -- --max-warnings=0
npm run build -- --webpack
```

Las integraciones que escriben datos requieren revisar su configuración y usar bases aisladas. No ejecutarlas contra producción para comprobar un despliegue.

## Comportamiento actual

La captación se realiza dentro de una zona y solicita posición disponible, operación, tipo, ubicación referencial y contacto. Departamento, provincia y distrito son opcionales en la ficha e independientes de la zona comercial. El DNI del propietario se adjunta como archivo.

Operación, tipo y contacto se editan desde Cartera. El cambio de operación requiere inmueble activo sin precios ni publicación preparada. Los demás datos se completan en Información de inmuebles.

## Producción

Proyecto Vercel: `puma19/inmobiliaria-alfarov2`. Dominio: https://intranet.inmobiliariaalbertoalfaro.com.pe.

Las migraciones de registro simplificado y zonas ya constan como aplicadas. No repetir `--apply` ni instaladores para desplegar actualizaciones de interfaz. Revisar siempre las referencias de recuperación y el estado de la base antes de cualquier adaptación de datos.
