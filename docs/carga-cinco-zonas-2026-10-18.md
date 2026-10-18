# Carga de Tortugas, Huarmey, Casma, Lima y Trujillo — 18 de octubre de 2026

## Resultado y selección

Se reemplazaron exclusivamente estas cinco zonas según la selección expresa del usuario. Se eliminaron sus cinco fichas anteriores con relaciones, historial y tres archivos privados exclusivos. Se registraron 18 inmuebles nuevos a partir de los nombres de carpetas numeradas de Drive.

| Zona | Altas y visitas pendientes | Posiciones cargadas | Posiciones libres |
| --- | --- | --- | --- |
| Tortugas | 11 | 1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12 | 9 |
| Huarmey | 1 | 1 | 9 |
| Casma | 2 | 3, 4 | 8 |
| Lima | 1 | 1 | 9 |
| Trujillo | 3 | 1, 2, 3 | 7 |

- Excluidos expresamente: Tortugas 8, Casma 1 y 2, Lima 4 y Trujillo 4. Sus posiciones quedan disponibles.
- Excluidas todas las carpetas sin numeración y las carpetas 0 de modelo. No se importaron documentos interiores ni se modificó Google Drive.
- Los 18 nombres carecen de operación explícita: se registraron como alquiler, con `-FTO` al final del contacto, según el criterio acordado de Chimbote.
- Huarmey 1 y Trujillo 1 usan `CONTACTO1-FTO`, por ausencia de contacto en el nombre.
- Se conserva la ubicación referencial escrita en la carpeta, sin inventar direcciones más precisas. Los tipos se normalizan al catálogo: DPTO → Departamento y TERRENOS → Terreno. Se toma la geografía configurada de cada zona como en el registro normal.
- Las fichas están activas, en etapa `visita_pendiente`, con un evento normal de registro. Sin visitas realizadas, precios, tasaciones, publicaciones, documentos, fotos, negociaciones, cierres o seguimiento previo. Sin notas o etiquetas adicionales a lo solicitado.
- Las posiciones coinciden con la numeración de las carpetas. La secuencia global de identificadores continúa sin reiniciarse.

Fuente: [Cartera por zonas en Google Drive](https://drive.google.com/drive/folders/19DkuZFokAtILY0WD040hlkr3NAmDISxi). Manifiesto con nombres, IDs de origen y correspondencia de campos guardado de forma privada.

## Conservación y concurrencia

Las 46 fichas existentes de Chimbote y Nuevo Chimbote, con sus relaciones, se conservaron idénticas al estado vivo al ejecutar la transacción. Se comprobó mediante hashes antes y después del reemplazo, dentro del mismo bloqueo transaccional.

Durante la preparación se detectaron ediciones recientes de Chimbote. Los primeros intentos de previsualización se detuvieron sin escrituras. La comprobación final compara con el respaldo solo las cinco zonas objeto de reemplazo, sus propietarios, posiciones, relaciones, tareas y borradores. Las otras zonas conservan sus valores más recientes, sin restaurar una instantánea anterior sobre las ediciones del usuario. La verificación posterior detectó nuevas ediciones legítimas fuera del reemplazo; no se sobrescribieron ni se repitió la carga.

Se amplía `lib/zone-replacement.mjs` con el procedimiento manual `replaceFiveZones` y el script `scripts/replace-five-zones-from-drive.mjs`. El manifiesto exige las cinco zonas y las 18 posiciones exactas aceptadas; rechaza exclusiones, duplicados, zonas ajenas y contactos sin la marca acordada. La transacción conserva registros y archivos compartidos, y aborta íntegra ante una FK desconocida. La limpieza privada usa las tareas durables y la API autenticada existentes.

No se ejecuta automáticamente al compilar o desplegar. No repetir `--apply` para publicar o verificar: el respaldo de las zonas ya no coincide tras la primera ejecución. No requiere migraciones.

## Respaldo y recuperación

Respaldo aplicado: `restore-points/cinco-zonas-20261018-v3/`, privado y excluido de Git y Vercel. Incluye fuente e historial anteriores (`4e828fa`), instantánea consistente de 25 tablas de negocio, cuatro archivos privados con hashes, manifiesto de importación, resultado, hashes de conservación y verificación. Archivos con modo 0600. Las copias previas y sus diferencias de preparación permanecen privadas; no contienen una ejecución adicional del reemplazo.

Volver al código anterior no deshace los cambios de base. Para recuperar, verificar los hashes y conciliar actividad posterior; restaurar únicamente las cinco zonas con sus relaciones y archivos de forma coordinada, resolviendo posiciones frente a los nuevos registros. No restaurar encima de Chimbote, Nuevo Chimbote ni reiniciar la secuencia global.

## Validación

- `tests/zone-replacement.integration.mjs` pasó en MySQL 8.4 desechable con datos ficticios: regresión de Chimbote, 18 altas de cinco zonas, posiciones excluidas, manifiestos inválidos, previsualización sin escritura, rechazo de repetición, rollback conjunto ante FK desconocida, archivos compartidos y conservación de una edición concurrente de Chimbote.
- 27 archivos de pruebas unitarias correctos, ESLint sin advertencias y compilación completa Webpack/TypeScript.
- Verificación autenticada en la intranet el `2026-10-18T13:29:19.296Z`: las 18 fichas, datos de tipo/operación/ubicación/contacto, asignación exacta de posiciones, 18 visitas pendientes, estado inicial sin actividades heredadas, cinco fichas anteriores ausentes y limpieza privada completada.
- Disponibilidad de las cinco posiciones excluidas comprobada en la API. Tarjetas y detalle de cada zona, Visitas pendientes, rechazo anónimo y navegador de escritorio/móvil de 375 px sin errores JavaScript ni desbordamiento horizontal.
- Capturas y comprobador privados en `output/five-zones-production/` y `output/five-zones-production-smoke.mjs`. Cuentas y sesiones temporales eliminadas y ausencia comprobada.

## Publicación

- Entrega publicada: `f642b70be986c939e862af5f44e1d46d782b7ee7`, sincronizada en `main` y `feat/registro-simplificado` mediante subida atómica.
- Vercel informó a GitHub `success`, «Deployment has completed», Production `7155268244`, el `2026-10-18T13:31:49Z`.
- URL de versión: https://inmobiliaria-alfarov2-po4f3y6au-puma19.vercel.app.
- Preview `7155263460` también completado: https://inmobiliaria-alfarov2-f785c0ehe-puma19.vercel.app.
- La carga se ejecutó una sola vez. Compilar o desplegar no vuelve a borrar ni registrar inmuebles. Los commits posteriores de evidencia solo modifican Markdown.
- El contenedor y volumen de MySQL desechable se retiraron al completar las pruebas.
