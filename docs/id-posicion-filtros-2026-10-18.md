# ID por posición y búsqueda limitada — 18 de octubre de 2026

## Criterio vigente

El prefijo del ID visible es la posición dentro de su zona, con tres dígitos. José Servat en Chimbote, posición 3, se muestra como `003-alquiler-local-av. pardo` en lugar de empezar con `026`. Se aplica a todas las zonas mediante la función común, incluidos Cartera, registros, bandejas, liberación, archivos y exportaciones que muestran el ID. Las listas comparten el mismo criterio que los mensajes y confirmaciones.

La posición se repite entre zonas; no es una clave global. Se conservan el ID numérico interno, los códigos almacenados, enlaces, relaciones, documentos, borradores e historial. No renumerar claves SQL ni reiniciar secuencias. No hay migración, carga de Drive, borrado de inmuebles ni cambio de etapas. Para archivos y contratos se consulta la última posición asignada, priorizando la activa. Una ficha sin posición conocida conserva el correlativo anterior como respaldo, sin inventar una posición.

En Registrar visitas, Visitas pendientes, Registrar tasaciones y Tasaciones y textos pendientes la búsqueda automática se limita a **contacto, dirección e ID visible completo**. No se agregan como campos de búsqueda el número interno, código anterior, zona, referencia antigua ni posición independiente. El número inicial sí puede coincidir por formar parte del propio ID visible. La búsqueda sigue siendo por texto parcial: no exige pegar el ID completo. Se mantienen tildes, mayúsculas y puntuación normalizadas y equivalencias Avenida/Av y Meiggs/Meigss.

Se mantiene el orden numérico ascendente por posición, el filtro de antigüedad y los estados de los formularios al filtrar. La etiqueta es «Contacto, dirección o ID completo…».

## Verificación y recuperación

Pruebas unitarias cubren prefijo por posición en las siete zonas, José Servat, códigos internos conservados, ausencia de posición, búsqueda por ID visible y exclusión de campos anteriores. La prueba de navegador local comprueba los cuatro apartados y los cinco grupos con respuestas ficticias, ID completo, campos excluidos, formularios conservados, escritorio/móvil y ausencia de escrituras de negocio.

Respaldo privado de fuente e historial anterior: `restore-points/id-posicion-20261018/`, origen `dccbd44807171ef6c501f18fe0c34b6ae2455e9a`, con `source.tar`, `repository.bundle` y `SHA256SUMS`. Solo cambia presentación/consulta; no requiere restaurar datos. Revertir código de forma revisada teniendo en cuenta cambios posteriores.

Verificación local completada: 28 archivos de pruebas unitarias correctos, ESLint sin advertencias, compilación Webpack/TypeScript con salida 0 y prueba de navegador aislada correcta en los cuatro apartados y cinco grupos. La primera comprobación detectó una coincidencia ambigua en los datos ficticios (un código anterior compartía palabras con otro ID visible); se separaron sus correlativos ficticios y la prueba final pasó. La evidencia del despliegue y comprobación autenticada se registra al completar la publicación. Los documentos anteriores de identificación y búsqueda son históricos cuando describen el prefijo global o campos de búsqueda más amplios.
