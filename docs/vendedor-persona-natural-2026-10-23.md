# Condiciones del vendedor persona natural

Implementación sobre main, base 8794852. Publicación hasta Vercel autorizada el 23/10/2026; alineación y comprobación de producción en curso. Sin cambios de datos reales ni migraciones.

En DNI y poderes, el vendedor natural tiene tres bloques ordenados:

1. Propietarios: un propietario, matrimonio, varios copropietarios o por verificar. DNI admite un PDF conjunto o varios archivos. Matrimonio habilita partida matrimonial opcional y selección de régimen: bienes comunes, separación de patrimonios o por verificar. Solo separación de patrimonios habilita su documento.
2. Representación: sí, no o por verificar. Solo sí habilita poder y vigencia de poder, incluso para un propietario. Estos documentos conservan su carácter opcional.
3. Búsqueda nacional: archivo o nota en el mismo bloque. Si renta está exonerada, se mantiene la carga obligatoria de archivo en Impuestos y constancias.

Cada condición tiene sus documentos debajo y un botón cercano para guardar condiciones antes de adjuntar. Cambiar condiciones conserva los archivos anteriores y permite consultarlos; los documentos no aplicables no admiten nuevas cargas. El servidor aplica las mismas reglas a cargas y reclasificaciones.

Las condiciones nuevas se guardan en el JSON existente del expediente; no requieren migración. Las fichas antiguas comienzan por verificar, sin deducir propietarios desde el número de archivos. El estado del expediente informa las condiciones pendientes de verificar. Comprador, persona jurídica y alquiler mantienen sus reglas.

Validación: 36 archivos de pruebas unitarias aprobados; ESLint de los archivos afectados y TypeScript sin errores. Pruebas de 36 combinaciones de propietarios, régimen y representación, compatibilidad de configuración antigua y conservación de archivos. Compilación de producción aprobada (Next.js webpack, 57 páginas); ejecutada fuera del sandbox tras el fallo inicial de lectura de salida del proceso TypeScript. No se ha ejecutado integración de BD ni navegador.
