> Estado consolidado: [Repositorio y estado de entrega](../REPOSITORIO.md). Este documento conserva la evidencia de su fecha; los estados de despliegue, conteos y pendientes históricos deben interpretarse según esa referencia.

> Referencia de versión: consultar [Estado actual](estado-actual-2026-10-15.md) antes de usar los pendientes o instrucciones de este documento. Se conserva el contenido como registro de su revisión.

# Mejoras del proceso tras la auditoría

## Punto de restauración

`restore-points/20261006-before-process-improvements/` conserva el código anterior, la estructura y datos de 21 tablas y sus hashes SHA-256. Está excluido de Git y Vercel. Contiene datos de acceso y debe mantenerse privado. Conserva el despliegue anterior `dpl_6PzNkYpHo8qTgPkW8U727exXnazi` como referencia. No guarda los bytes del hosting: los archivos anteriores no se eliminan en estas mejoras.

`node scripts/restore-process-checkpoint.mjs` solo muestra información. Restaurar requiere `--apply --confirm 20261006-before-process-improvements`, detener la aplicación y guardar primero el estado posterior. La restauración recrea las tablas respaldadas y debe acompañarse del código anterior; no es una acción automática.

## Comportamiento

- Por indicación del usuario, el panel y contratos tienen una sola vista, sin selector Real / Demostración. Agenda, avances y alertas incluyen todos los inmuebles actuales. La marca de prueba se conserva para el vaciado posterior y los filtros de reportes. Las posiciones disponibles reflejan siempre la ocupación física completa.
- Registro separa referencia del inmueble y nombres del propietario. El propietario es opcional; si se completan DNI/contacto se requiere nombre. Consultar un DNI no sustituye la referencia del inmueble. Las integraciones antiguas que solo envían nombres siguen teniendo referencia compatible.
- Calle/avenida y número/lote se guardan por separado junto con distrito, provincia y departamento. Las direcciones antiguas combinadas se conservan hasta editarlas; no se intenta inferir automáticamente su numeración. La ficha y Cartera muestran el número guardado.
- La tasación no puede tener fecha anterior a la primera visita completada. Se permiten hechos retrospectivos anteriores al alta del inmueble si guardan ese orden.
- La ficha muestra un aviso si el área construida supera diez veces el terreno; no se bloquean edificios de varias plantas. Local, Local comercial y Oficina muestran Ambientes.
- La etapa consultada en la ficha se deriva de estado, visitas, tasación y publicación. El campo legado no determina los avances.
- Contratos de alquiler muestra vencidos, próximos a vencer (30 días), vigentes y sin fecha final. El panel avisa sobre contratos pendientes de atención.
- Renovar extiende la fecha de fin del contrato, conserva renta mensual y deja historial. No permite una fecha anterior o igual al fin existente, ni renovar después de reingresar.
- Reingresar exige contrato vencido y posición libre. Crea otra captación vinculada, copia datos básicos y propietario, mantiene el contrato/archivos anteriores y comienza con visita pendiente. No reutiliza visitas, precios, archivos o publicación de la captación anterior. El original queda histórico. Se impide duplicar el reingreso del mismo contrato.
- Se puede adjuntar contrato en Información de inmuebles → Documentación → CONTRATO; no es obligatorio para cerrar. La nueva bandeja enlaza directamente a documentos.
- Los cobros mensuales y cambios de renta durante una renovación no están incluidos; son procesos adicionales.
- El segundo factor conserva la pausa anterior. Se puede habilitar para administradores configurando `AUTH_LOGIN_MFA_REQUIRED=1`. No se habilita silenciosamente durante este despliegue.

Instalación de columnas: `node scripts/install-process-improvements.mjs` (idempotente). Migración `0012_loud_weapon_omega.sql`.

## Validación

Pruebas unitarias de fechas, controles estáticos y compilación. Integración completa de registro sin propietario, dirección estructurada, tasación fuera de orden, modos del panel, alquiler, renovación, reingreso, duplicados y permisos con registros temporales; se conserva el expediente histórico. Comprobación final de páginas/API en producción y audit-system sobre datos persistentes.
