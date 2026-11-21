# Plantillas de texto para redes sociales

Revisión del trabajo local pendiente, 31 de octubre de 2026. Base Git: `288e706`.

## Alcance

Las plantillas se seleccionan por tipo de inmueble y operación: casa, departamento, local comercial y terreno comercial en venta y alquiler; terreno urbano, edificio y hotel en venta. Los tipos restantes disponen de un modelo general editable.

El modelo usa los datos disponibles del inmueble y el precio de salida con su moneda. Los datos ausentes aparecen como `DATO POR CONFIRMAR`. Alquiler incluye garantía y adelanto por completar. Los textos guardados y las modificaciones manuales se conservan; no se regeneran al actualizar los datos de origen.

El editor permite guardar borradores, marcar el texto como realizado y copiar el texto guardado. La consulta opcional de PDF ofrece propuestas con página y evidencia; el usuario elige el campo pendiente donde incorporarlas. No realiza OCR ni modifica automáticamente la ficha.

## Verificación local

- TypeScript independiente y ESLint de los componentes, APIs y módulos revisados: aprobados.
- Seis archivos de pruebas de plantillas, extracción, requisitos de publicación, difusión, flujo de publicaciones y portal: aprobados.
- Navegador a 375 y 1440 px con el editor real y APIs simuladas: plantilla inicial, propuesta de área de terreno, edición manual, borrador, texto realizado, copia exacta y conservación ante cambios del origen; sin desbordamiento horizontal ni errores de página.
- Se corrigió el selector del documento en la prueba de navegador para localizar el combobox por su nombre accesible.
- Build completo de Next.js 16.3.8 con webpack: aprobado, TypeScript aprobado y 63/63 páginas generadas; terminó con código 0 usando la URL local ficticia descrita abajo.

## Configuración y continuidad

El intento dentro del sandbox falló al analizar la salida de `tsc --showConfig`. Fuera del sandbox se compilaron el código y TypeScript; la recolección de páginas detectó que `DATABASE_URL` local no es una URL válida. Se repitió el build con `DATABASE_URL=mysql://build:build@127.0.0.1:3306/alfaro_build`, solo para esta ejecución y sin cambiar `.env.local`.

La prueba de navegador utiliza APIs simuladas y no acredita integración con MySQL ni con el hosting real. No se hicieron escrituras de negocio. Los cambios de hosting preexistentes continúan como trabajo local y no se instalaron en el servidor.

## Publicación en Vercel

El usuario autorizó publicar las plantillas. Se preparó una entrega aislada desde `288e706`, agregando únicamente sus cambios: modelos, extracción de PDF, editor, consulta/copia desde Cartera, etiqueta de carpeta, APIs, dependencia `unpdf`, pruebas y este documento. Se excluyeron los ajustes locales previos de precio de cierre en el listado y del hosting PHP. La entrega aislada también compiló correctamente con webpack, TypeScript y 63/63 páginas.

Proyecto confirmado mediante CLI: `puma19/inmobiliaria-alfarov2`, ID `prj_Y4rkO3CVHKLA2akcLF6rguUJksvG`, equipo `team_qcKFQOeqeLWTJFsCLGnZvPiL`.

Despliegue directo de fuentes por CLI, compilado en Vercel con su configuración de producción; no se subió el build local ni se cambiaron las variables de entorno del proyecto. Se creó primero sin asignar dominios y se promovió después de comprobar HTTP 200 en `/login` y redirección 307 a `/login` en `/registrar-textos`.

- Despliegue: `dpl_8ACJX1XeDuFgQJAi1i2VczCHBGRj`, estado **READY**, entorno **production**.
- [Versión](https://inmobiliaria-alfarov2-cqeylk969-puma19.vercel.app).
- [Panel de Vercel](https://vercel.com/puma19/inmobiliaria-alfarov2/8ACJX1XeDuFgQJAi1i2VczCHBGRj).
- [Intranet](https://intranet.inmobiliariaalbertoalfaro.com.pe): después de promover, `/login` responde 200 y `/registrar-textos` responde 307 hacia `/login` sin sesión.
- La API de Vercel confirmó tanto `targets.production.id` como el alias de la intranet apuntando a `dpl_8ACJX1XeDuFgQJAi1i2VczCHBGRj`.
- Consulta de logs `level:error` del despliegue a las 12:37 UTC: cero registros en los últimos 15 minutos, sin intervalos excluidos. Es una observación puntual, no una prueba del flujo autenticado.

No se verificó el editor autenticado en producción ni se crearon publicaciones de prueba. La verificación del editor corresponde a la prueba local con APIs simuladas.

La conexión MCP de Vercel devolvió 403 para este equipo; la CLI existente sí tenía acceso y permitió completar el despliegue. GitHub permite lectura, pero rechazó crear el árbol con `Resource not accessible by integration` (403), aunque la metadata del repositorio mostraba permisos de escritura. Por ello esta publicación es directa de fuentes locales: no existe un nuevo commit remoto asociado y `main` conserva `288e706`. Conservar los cambios locales hasta sincronizarlos con GitHub para que un futuro despliegue desde Git no retire las plantillas.
