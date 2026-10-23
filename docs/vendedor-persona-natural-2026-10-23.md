# Condiciones del vendedor persona natural

Implementación sobre main, base 8794852. Publicación hasta Vercel autorizada y comprobada el 23/10/2026. Sin cambios de datos reales ni migraciones.

En DNI y poderes, el vendedor natural tiene tres bloques ordenados:

1. Propietarios: un propietario, matrimonio, varios copropietarios o por verificar. DNI admite un PDF conjunto o varios archivos. Matrimonio habilita partida matrimonial opcional y selección de régimen: bienes comunes, separación de patrimonios o por verificar. Solo separación de patrimonios habilita su documento.
2. Representación: sí, no o por verificar. Solo sí habilita poder y vigencia de poder, incluso para un propietario. Estos documentos conservan su carácter opcional.
3. Búsqueda nacional: archivo o nota en el mismo bloque. Si renta está exonerada, se mantiene la carga obligatoria de archivo en Impuestos y constancias.

Cada condición tiene sus documentos debajo y un botón cercano para guardar condiciones antes de adjuntar. Cambiar condiciones conserva los archivos anteriores y permite consultarlos; los documentos no aplicables no admiten nuevas cargas. El servidor aplica las mismas reglas a cargas y reclasificaciones.

Las condiciones nuevas se guardan en el JSON existente del expediente; no requieren migración. Las fichas antiguas comienzan por verificar, sin deducir propietarios desde el número de archivos. El estado del expediente informa las condiciones pendientes de verificar. Comprador, persona jurídica y alquiler mantienen sus reglas.

Validación: 36 archivos de pruebas unitarias aprobados; ESLint de los archivos afectados y TypeScript sin errores. Pruebas de 36 combinaciones de propietarios, régimen y representación, compatibilidad de configuración antigua y conservación de archivos. Compilación de producción aprobada (Next.js webpack, 57 páginas); ejecutada fuera del sandbox tras el fallo inicial de lectura de salida del proceso TypeScript. No se ejecutó integración con BD desechable. La comprobación autenticada de producción se detalla a continuación.


## Publicación y comprobación de producción

- Código funcional: `e2ccb4fa08c61e7f7d674936d61759974f3e342c`, enviado a `origin/main`.
- Despliegue funcional: `dpl_HPoD44Da9riqXEPBqqEY5VBbJYrq`, Vercel Production **READY**; estado GitHub `7267915684` correcto para el mismo SHA.
- Dominio confirmado: https://intranet.inmobiliariaalbertoalfaro.com.pe.
- Verificación autenticada: **2026-10-23T01:32:51.353Z**, administrador y operador, 1440/375 px: **24 casos y 24 guardados simulados**, cero errores de navegador y cero escrituras de negocio.
- Se verificaron matrimonio y partida matrimonial, régimen separado y su carga, representación y poderes, propietario único con representante, bloqueo sin representante, varios copropietarios y selección de un PDF conjunto. API real del expediente devuelve las condiciones nuevas y reconoce la partida matrimonial.
- Guardados interceptados en navegador con condiciones ficticias; ningún cambio de expediente o documento real. Dos cuentas y sesiones técnicas temporales eliminadas al finalizar. Sin migraciones.
- Evidencia agregada privada: `output/seller-natural-production-summary.json`. Capturas de escritorio/móvil revisadas; no se publican datos privados en el repositorio.
- Este cierre documental conserva el árbol funcional del commit anterior; la alineación del commit documental en Vercel se comprueba tras enviarlo.
- Revisión independiente pendiente; no se atribuye revisión a otro asistente.
