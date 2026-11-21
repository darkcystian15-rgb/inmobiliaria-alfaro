# Documentos visibles aunque el análisis no extraiga datos

## Problema y corrección

El usuario reportó que podía consultar el documento al analizar Rómulo Lavayen, pero no seleccionar ni abrir el correspondiente a Renzo Alva. La interfaz solo mostraba enlaces al original dentro de las propuestas extraídas. Si un archivo no producía propuestas, fallaba o no admitía análisis, no tenía enlace en ese panel, aunque siguiera registrado y disponible.

El editor ahora conserva y muestra el inventario de documentos independiente de las propuestas. El enlace **Abrir PDF** o **Abrir o descargar** aparece al consultar los archivos y permanece disponible durante y después del análisis. Utiliza el mismo endpoint privado de archivos y sus permisos existentes.

Cada documento incorpora **Analizar este documento** para procesar únicamente ese archivo. La acción general conserva el análisis conjunto. Si no se recuperan propuestas, el mensaje explica que no hay datos para seleccionar y que el original sigue disponible. **Ver documentos y resultados** permite recuperar el panel oculto aunque no haya propuestas.

El ajuste no cambia la extracción, las áreas, los archivos ni los textos guardados. No añade escrituras de base ni modifica el hosting.

## Validación

- Componente real en Chromium a 375 y 1440 px con APIs simuladas: PDF sin propuestas y PDF con error conservan enlaces; apertura en pestaña nueva con URL del archivo correcta; ocultar/mostrar sin repetir análisis; acción individual envía únicamente el ID elegido; borrador intacto. Aprobado.
- Las comprobaciones anteriores del editor siguen aprobadas: análisis por bloques, selección explícita, guardado de áreas revisadas, borrador, texto realizado y copia.
- TypeScript independiente, ESLint de los archivos afectados y revisión de espacios: aprobados.
- No se ha reproducido una sesión autenticada de estos dos inmuebles en producción; la causa y corrección se verificaron en el código y con los casos de interfaz descritos.

## Restauración y entrega

Respaldo previo: `restore-points/enlaces-documentos-20261031T182227Z/antes.tar.gz`; referencia de producción anterior: `dpl_6tQhid4Ypk6n5oNuEELXLUHqbuhd`. El punto completo de la mejora de documentos permanece en `restore-points/documentos-niveles-20261031T155154Z/`.

La entrega reutiliza las fuentes aisladas de la versión anterior y cambia únicamente el componente del panel documental. Se conservan las exclusiones de cambios locales ajenos de precio de cierre y hosting PHP. Los documentos y pruebas se guardan en el workspace. Despliegue `dpl_7FiQHxS98WFsnRs5qgCMDHKB1Gd6`, estado **READY**, producción. Vercel compiló la entrega y confirmó el alias `intranet.inmobiliariaalbertoalfaro.com.pe` asociado a esta versión. [Versión desplegada](https://inmobiliaria-alfarov2-eq3qzfsqv-puma19.vercel.app).
