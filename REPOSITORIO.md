# Repositorio y estado de entrega

Referencia consolidada actualizada el 18 de octubre de 2026.

## Repositorio

- GitHub: https://github.com/darkcystian15-rgb/inmobiliaria-alfaro
- Copia local de la aplicación: `/workspaces/app-alfaro-git/inmobiliaria-alfaro`.
- El directorio padre pertenece a otro repositorio: `Cystian/app-alfaro-git`. Ejecutar Git dentro de la carpeta de la aplicación.
- Rama principal integrada: `main`. La rama `feat/registro-simplificado` conserva la misma entrega.
- Código de aplicación publicado según la evidencia del 16 de octubre: `f76b31c5e7401c0cd7994f91085fe63b8a5d3cdf`.
- Commit de evidencia posterior: `b5380b2aea02cf26af8c4f43a3f77c6e6e07d323`.
- Entre esos dos commits solo cambian la documentación del expediente y el selector de inmueble de su prueba de humo; el código de aplicación coincide.
- El 18 de octubre se actualizaron las referencias con `git fetch origin`: `main` estaba en `cf4f5f0` y la rama de entrega en `b5380b2`. Se integró la entrega y su documentación en `main` mediante fast-forward, sin conflictos ni reescritura de historial.

## Vercel

| Dato | Última entrega acreditada |
| --- | --- |
| Proyecto | `puma19/inmobiliaria-alfarov2` |
| Dominio | https://intranet.inmobiliariaalbertoalfaro.com.pe |
| Despliegue | `dpl_DKnnyeZGpPs3gZEPy8P53a8h93KM` |
| URL de versión | https://inmobiliaria-alfarov2-fywebwkx7-puma19.vercel.app |
| Estado registrado el 16 de octubre | READY, production, dominio asignado |
| Código | `f76b31c5e7401c0cd7994f91085fe63b8a5d3cdf` |

El 18 de octubre se intentó consultar la API de Vercel con la credencial local. Respondió HTTP 403. Por tanto, esta referencia consolida la última publicación acreditada y **no confirma en vivo** que el dominio siga apuntando a ese despliegue. No se cambió ningún alias ni se ejecutó un despliegue. Evidencia original: [expediente de la operación](docs/expediente-operacion-2026-10-16.md).

## Funcionalidad de esa entrega

- Cartera por zonas comerciales y posiciones, separadas de la geografía. Crear zona en `/ubicaciones` genera diez posiciones; se conservan las capacidades anteriores.
- Captación con posición libre, operación, tipo, ubicación escrita y contacto independiente por inmueble. Departamento, provincia y distrito opcionales en la ficha.
- Operación, tipo y contacto editables por administrador desde Cartera. El cambio de operación exige inmueble activo sin precios ni publicación preparada.
- Visitas y evidencia fotográfica, precios acordados, preparación y confirmación de publicación, cierres, contratos de alquiler, renovación manual y reingreso con antecedentes.
- Publicación con archivo DNI del vendedor o gerente, tasación, foto vinculada a visita completada y texto, además de las condiciones de precios. No se exige DNI numérico.
- Sin mapas, coordenadas, importador de puntos ni geolocalización. Se conserva ubicación referencial, geografía opcional, zonas y posiciones.
- Información de inmuebles con vendedor, comprador, documentos y Estado del expediente. Un vendedor y un comprador; asignación expresa del comprador al cerrar.
- Expediente con reglas por persona natural/jurídica, siete grupos documentales, porcentaje y alertas. Sus faltantes no bloquean el cierre. Venta y alquiler comparten estas reglas hasta definir diferencias.
- Archivos privados PDF, Word, Excel e imágenes; hasta 4 MB por archivo tras compresión de imágenes. Vista previa de PDF e imágenes y descarga de Word/Excel. Eliminación por administrador.
- Permisos, historial, reportes y protección de concurrencia; el expediente rechaza versiones obsoletas con HTTP 409.

## Datos y recuperación

Las migraciones de registro simplificado, zonas y expediente constan como aplicadas en la evidencia histórica. No repetir `--apply` ni instaladores para verificar el estado o publicar documentación. Los conteos de inmuebles, posiciones y archivos de los documentos anteriores son históricos.

Los respaldos, capturas y secretos permanecen privados en las ubicaciones descritas por cada intervención; no forman parte de Git. Antes de restaurar, verificar existencia, hashes, identidad de base y cambios posteriores. Esta revisión no consultó ni modificó datos de negocio.

## Validación de esta revisión

- 24 archivos de pruebas unitarias correctos: `node --test tests/*.test.mjs`.
- ESLint sin errores ni advertencias: `npm run lint -- --max-warnings=0`.
- Se comprobó que el código de aplicación local coincide con el commit publicado documentado.
- No se repitieron compilación, integración MySQL ni recorrido autenticado en producción; sus resultados del 16 de octubre constan en el documento del expediente.

## Lectura y precedencia

1. Este archivo consolida el estado y distingue evidencia histórica de verificaciones nuevas.
2. [Expediente del 16 de octubre](docs/expediente-operacion-2026-10-16.md): última entrega funcional y publicación acreditada.
3. [Retirada de mapas](docs/retirada-mapas-2026-10-15.md) y [ancho del panel](docs/ancho-panel-2026-10-15.md): cambios previos incluidos.
4. Los demás Markdown conservan decisiones, pruebas y recuperación de sus versiones. Sus referencias a mapas, DNI numérico, propietarios compartidos o publicaciones pendientes no sustituyen las reglas consolidadas aquí.

## Integración y verificación pendiente

`main` incorpora la entrega funcional acreditada y esta consolidación documental. Ambas ramas se preparan en el mismo commit para sincronizarlas con GitHub; la igualdad remota debe comprobarse con `git ls-remote origin refs/heads/main refs/heads/feat/registro-simplificado`.

La comprobación en vivo de Vercel sigue pendiente por HTTP 403. La integración en GitHub puede activar un despliegue automático según la configuración del proyecto; no se afirma que ese despliegue exista o haya terminado. No se ejecutaron migraciones ni se cambiaron datos o aliases desde esta revisión.
