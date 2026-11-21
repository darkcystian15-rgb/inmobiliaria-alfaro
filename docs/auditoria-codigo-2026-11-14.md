# Auditoría de mantenimiento — 14 de noviembre de 2026

Revisión local del estado de trabajo, incluidos cambios aún sin confirmar. No se modificó código de aplicación, configuración, dependencias ni base de datos. Las pruebas generaron archivos en `output/`, directorio ya ignorado. Este informe es una auditoría estática y de pruebas locales; no certifica los recorridos de producción ni sustituye una auditoría de seguridad.

## Hallazgos por prioridad

### 1. Media: copias y previsualizaciones entran en la comprobación de TypeScript

`tsconfig.json:25-33` incluye todos los archivos TS/TSX y solo excluye `node_modules`. Así entran los siete archivos versionados de `backup-dinamizacion-20260926_191919/` y los prototipos de `output/`.

La comprobación con `--noUnusedLocals --noUnusedParameters` falla con siete diagnósticos, todos en esos directorios: cuatro en la copia de cartera y tres en previsualizaciones. No reportó errores en el código activo. ESLint y el empaquetado de Vercel ya ignoran estos directorios, por lo que las herramientas comprueban conjuntos diferentes de archivos.

Recomendación: excluir explícitamente respaldos y resultados locales de TypeScript. Conservar los respaldos hasta acordar su archivo fuera del árbol de fuentes; no borrarlos como parte de una limpieza automática. El respaldo antiguo ocupa aproximadamente 120 KB: no es una fuente importante de peso.

### 2. Media: la validación general de pruebas no tiene una entrada uniforme

`package.json:5-27` contiene comandos parciales de prueba, pero no un comando general que cargue `tests/resolve-typescript.mjs`. La ejecución directa `node --test tests/*.test.mjs` terminó con 58 archivos aprobados y diez fallidos por resolución de imports TS sin extensión.

El cargador ya está documentado en notas de promesas y liquidaciones. Con él, la repetición de los doce archivos de liquidaciones, minutas y promesas terminó con once aprobados y uno fallido. Los nueve archivos inicialmente afectados restantes sí pasan con la resolución adecuada.

Recomendación: definir un comando general reproducible usando el cargador existente. Los fallos de resolución de Node no demuestran un fallo del empaquetador de Next.js.

### 3. Media: una prueba de promesa conserva supuestos de una plantilla anterior

`tests/promise-pdf.test.mjs:10-17` espera una plantilla de contrato con nueve cláusulas y un marcador para insertar comprobantes. `lib/promise-template.ts:4-7` devuelve texto vacío mientras se recibe el modelo final; además, `tests/promise-template.test.mjs` comprueba explícitamente ese comportamiento vacío.

La prueba calcula una posición a partir de un marcador inexistente y falla en `minuteInput` con `Error: Revisa las imágenes del documento.` La segunda prueba del mismo archivo, sobre proporciones y dimensiones, pasa al ejecutarla directamente.

Recomendación: adaptar la prueba de maquetación a una entrada sintética explícita y conservar sus comprobaciones de cláusulas e imágenes. No restaurar una plantilla antigua ni eliminar la prueba completa para conseguir un resultado verde. Confirmar por separado si el contrato de promesa debe volver a habilitarse: `documentEditorKind` y `documentEditorForCategory` actualmente solo admiten la estructura de promesa, aunque persisten tipos y configuración de contrato.

### 4. Baja: dos componentes no tienen consumidores en la aplicación

El análisis de imports estáticos y dinámicos literales de `app/`, `lib/`, `scripts/` y `db/`, junto con búsquedas de nombres en el repositorio, identificó:

- `app/components/ExternalAnnouncements.tsx`: interfaz antigua de anuncios externos sin imports entrantes.
- `app/components/PropertyProgress.tsx`: presentación del progreso sin imports entrantes.

Son candidatos de alta confianza para una limpieza posterior. No son rutas especiales de Next.js. Su eliminación tendría un beneficio principalmente de mantenimiento, no una mejora demostrada de velocidad o del paquete enviado al navegador.

No extender esa eliminación a sus dependencias: `lib/property-progress.ts` conserva un tipo utilizado por `PropertyInformation` y pruebas propias. La tabla de anuncios sigue siendo consultada por los endpoints de inmueble y publicaciones, y se utiliza en sincronización de moneda. La falta de consumidores del componente no autoriza borrar datos, tablas o rutas HTTP; podrían tener clientes externos.

### 5. Baja: ESLint falla por una función auxiliar de pruebas y conserva pequeños residuos

`npm run lint` devuelve ocho errores y cuatro advertencias:

- Los ocho errores están en `tests/minute-editor.browser.mjs:70,86,91,100`. La función auxiliar `useBase`, declarada en la línea 12, realiza clics de navegador; su nombre hace que la regla de React la interprete como un hook. Recomendación: renombrarla y actualizar sus llamadas.
- `tests/promise-template.test.mjs:5-6` importa `minuteInput` y `documentEditorConfig` sin utilizarlos: limpieza directa de imports.
- `tests/liquidation.test.mjs:4` contiene una expresión sin efecto: revisar y retirarla si no representaba una aserción pendiente.
- `lib/liquidation-source-models.ts:2` exporta un objeto anónimo. Es un archivo generado; si se corrige el estilo, hacerlo desde `scripts/generate-liquidation-models.mjs` para evitar que el siguiente generado revierta el cambio.

### 6. Baja: las pruebas dependen de herramientas transitivas

Numerosos archivos de pruebas importan `esbuild`, pero no figura como dependencia directa de desarrollo. Actualmente lo proporciona `drizzle-kit`. Si cambia su árbol de dependencias, las pruebas pueden dejar de arrancar sin que haya cambiado la aplicación.

Recomendación: declarar las herramientas utilizadas directamente por las pruebas como dependencias de desarrollo, revisando versiones compatibles en una tarea de implementación separada.

## Elementos que deben conservarse

- `lib/portal-web-legacy.ts` sí está conectado a las rutas de catálogo, edición y fotos de anuncios existentes. El nombre `legacy` no lo convierte en código muerto.
- Todas las dependencias de ejecución tienen usos detectables o una función de infraestructura: `react-dom` es parte del entorno React/Next aunque no aparezca importado por el código del proyecto.
- OCR, PDF, Excel y Word usan imports dinámicos y recursos de ejecución. No retirar paquetes, fuentes ni modelos por no verlos en una página.
- `restore-points/` ocupa aproximadamente 461 MB y `output/` unos 36 MB. Son recursos locales ya ignorados por Git y excluidos del envío a Vercel. Archivarlos puede liberar disco local; no implica reducir el paquete de producción en esa cantidad.
- `tests/info1/` sirve de origen a modelos generados: no confundir los documentos de referencia con residuos sin uso.

## Validación y límites

Comandos ejecutados:

```sh
npm run lint
npx tsc --noEmit --incremental false --noUnusedLocals --noUnusedParameters
node --test tests/*.test.mjs
node --import ./tests/resolve-typescript.mjs --test tests/liquidation*.test.mjs tests/minute*.test.mjs tests/promise*.test.mjs
node --import ./tests/resolve-typescript.mjs tests/promise-pdf.test.mjs
```

Los recuentos de 58/68 y 11/12 corresponden a archivos según el reporte del runner de este entorno, no al total de aserciones internas. No se ejecutaron pruebas contra bases de datos o hosting, recorridos de navegador ni compilación de producción. No se evaluaron vulnerabilidades de dependencias. La ausencia de imports no prueba ausencia de clientes HTTP externos o referencias construidas dinámicamente.

## Orden propuesto para una limpieza posterior

1. Uniformar los comandos de validación y excluir artefactos locales del chequeo de tipos.
2. Corregir el nombre de la función auxiliar, los imports sin uso y la prueba desactualizada, preservando la cobertura.
3. Retirar únicamente los dos componentes sin consumidores y repetir tipos, lint y pruebas con el cargador.
4. Revisar los recorridos de cartera, ficha, publicaciones, documentos y portal en un entorno de prueba antes de publicar.

Ninguna de estas modificaciones funcionales o de configuración se aplicó durante esta auditoría.
