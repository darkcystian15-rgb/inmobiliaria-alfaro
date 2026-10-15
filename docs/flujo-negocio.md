> Referencia de versión: consultar [Estado actual](estado-actual-2026-10-15.md) antes de usar los pendientes o instrucciones de este documento. Se conserva el contenido como registro de su revisión.

# Reglas del negocio

La captación ocupa una posición desde el registro. Dirección, coordenadas y propietario pueden completarse después. El operador conserva acceso únicamente a Información de inmuebles; el administrador registra y avanza las etapas.

La visita inicial recomienda al menos una foto y admite hasta 20. Sin fotos, exige confirmar explícitamente «Pendiente de evidencia»; se registra como realizada y permite continuar con la tasación. La evidencia se regulariza en Información de inmuebles → Visitas, subiendo imágenes vinculadas a esa visita. La primera imagen elimina el pendiente; borrar todas vuelve a marcarlo. Las fotos generales sin vínculo no regularizan una visita. La tasación se registra una vez concluido el primer acuerdo con el propietario, con precio de tasación, objetivo y venta. Los cambios posteriores modifican únicamente precio de venta y observación, con historial, sin alterar precios de referencia ni publicación. Aprobación y negociación no son tareas separadas del nuevo recorrido. Los datos antiguos se conservan.

Preparar la publicación y confirmarla exige: DNI de ocho dígitos del propietario, archivo adjunto de DNI, archivo adjunto de tipo TASACION, al menos una imagen vinculada a una visita completada del mismo inmueble y texto no vacío. Los documentos deben estar alojados en el sistema. Enlaces externos y fotos sin visita no cumplen esos requisitos. La ficha y la bandeja muestran los pendientes. Panel, cartera y reportes utilizan la misma comprobación; una publicación preparada cuyo expediente se vuelve incompleto deja de contarse como lista.

La salida por venta requiere fecha no futura, precio final mayor que cero y comisión monetaria entre cero y precio final. Comisión representa ingreso de la inmobiliaria antes de gastos, no beneficio neto. La venta puede realizarse por otro canal antes de publicar. Las cancelaciones no requieren esos importes. El cierre y la liberación de posición se guardan en la misma transacción, junto con el historial. La ficha histórica y los reportes permiten consultar el resultado.

## Base de datos

Ejecutar `node scripts/install-business-workflow.mjs` en bases existentes. Agrega columnas opcionales de cierre e indicador de datos simulados, sin inventar operaciones. Los cierres antiguos conservan importes ausentes; no se interpretan como ventas de cero. La migración `0006_married_robin_chapel.sql` sirve para instalaciones gestionadas por Drizzle; no ejecutar su ALTER si ya se usó el instalador.

Las pruebas de integración usan datos ficticios temporales, almacenamiento HTTPS aislado y limpieza al terminar. No agregan expedientes falsos a inmuebles reales ni modifican archivos del hosting real.
