> Referencia de versión: consultar [Estado actual](estado-actual-2026-10-15.md) antes de usar los pendientes o instrucciones de este documento. Se conserva el contenido como registro de su revisión.

# Catálogo de ubicaciones

Administración → Ubicaciones permite crear departamentos, provincias y distritos, editar sus nombres, activar/desactivar y eliminar entradas sin vínculos. Un departamento contiene provincias y una provincia contiene distritos. No se pueden eliminar entradas que tengan hijos o inmuebles activos o históricos vinculados.

Registrar inmueble e Información de inmuebles usan selectores dependientes. Cambiar el departamento limpia provincia y distrito; cambiar provincia limpia distrito. El servidor valida la relación completa. Una ubicación desactivada se conserva en los inmuebles existentes, pero no admite nuevas asignaciones. Renombrar una ubicación actualiza las fichas vinculadas.

Ejecutar `node scripts/install-geography.mjs` después de configurar DATABASE_URL. El instalador guarda los inmuebles anteriores en restore-points/20261006-before-geography y carga Áncash → Santa con sus nueve distritos, además de ubicaciones usadas en las pruebas. Conserva los datos previos; corrige solo el registro ficticio BETA-006 que tenía Tortugas como distrito a Comandante Noel, Casma.

Fuentes: [Gobierno Regional de Áncash, plan regional](https://regionancash.gob.pe/instrumentos_gestion/pdrc/pdrc_2024_2034_version_completa_final_.pdf) y [Mincetur, playa Tortugas](https://consultasenlinea.mincetur.gob.pe/fichaInventario/index.aspx?cod_Ficha=916).

Cartera muestra el porcentaje de posiciones ocupadas y disponibles con un decimal, usando las posiciones activas como capacidad. La lista se ordena por número de posición; los inmuebles sin posición quedan al final.
