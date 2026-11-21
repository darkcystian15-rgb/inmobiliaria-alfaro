# Piloto de imágenes y marca de agua en Estructura de Minuta

El editor de Estructura de Minuta admite hasta ocho imágenes JPG, PNG o WebP cargadas directamente. Cada imagen permite elegir ubicación después de un párrafo o antes del primero, ancho, alineación y descripción opcional. Las imágenes se muestran en un panel debajo del editor de texto; Ver archivo permite revisar su distribución final dentro del PDF. Quitar una imagen del contenido conserva el archivo subido al expediente. La extracción de Word sigue recuperando únicamente texto.

En Presentación del PDF se añade Incluir marca de agua con el logo de la inmobiliaria, desactivada por defecto. Al activarla se utiliza automáticamente el logo institucional, con tamaños pequeño/mediano/grande e intensidad muy suave/suave/visible. Se dibuja centrada detrás del contenido en cada página. No requiere cargar otro logo. El piloto se presenta únicamente en venta; no amplía la interfaz de otros apartados.

Las instantáneas existentes siguen siendo válidas. Se guardan referencias a archivos privados y ajustes, sin almacenar imágenes base64 en el campo TEXT de la bitácora ni requerir migraciones. El endpoint comprueba que cada archivo pertenece al inmueble y categoría de la estructura, está en hosting, tiene MIME permitido y no supera 4 MB. El render limita lectura acumulada a 16 MB, comprueba las imágenes con sharp y las normaliza a PNG. Un archivo ausente o dañado impide generar un PDF incompleto y devuelve un error explícito.

Al editar texto se ajustan las posiciones; deshacer/rehacer conserva los anclajes correspondientes. Reemplazar el contenido con la estructura base quita las imágenes del contenido, con la misma confirmación previa; deshacer incorporación recupera el documento anterior. La paginación reserva espacio para imagen y descripción, reduce proporcionalmente las imágenes demasiado altas y conserva los encabezados y pies.

Verificación: TypeScript, ESLint de los archivos afectados, pruebas de documento/PDF, API, formato y estructura base; navegador en 375 y 1440 px para venta y regresión de alquiler, con carga de imagen, ubicación, tamaño, alineación, guardado/reapertura, marca de agua, retirada y descarte. PDF real multipágina con y sin marca de agua e imagen alta revisado visualmente. El navegador y la API usan datos sintéticos y fronteras simuladas; no acreditan una carga autenticada sobre expedientes de clientes en producción.

Muestras y capturas: output/minuta-texto/imagenes-con-marca.pdf, imagenes-sin-marca.pdf e imagenes-375.png. Se conserva el árbol de trabajo previo, con HEAD base 288e7060b41df8f9eafc2bfa67c102ff186a35b7; el despliegue CLI incluye los archivos de trabajo.

## Publicación

- Proyecto inmobiliaria-alfarov2, prj_Y4rkO3CVHKLA2akcLF6rguUJksvG, equipo team_qcKFQOeqeLWTJFsCLGnZvPiL.
- Producción Next.js, despliegue dpl_BhU6o2bPRAmyjbatY3rb9qfRXVr4, estado READY.
- URL: https://inmobiliaria-alfarov2-fvenu38z5-puma19.vercel.app.
- Compilación remota: aproximadamente 68 segundos. Base Git 288e706, con los cambios de trabajo incluidos mediante CLI.
- Se desplegó con --prod --skip-domain, se comprobó la ruta privada con vercel curl y se promovió con la herramienta de Vercel. Promoción del dominio intranet.inmobiliariaalbertoalfaro.com.pe completada.
- Ruta GET del editor en despliegue y dominio: HTTP 401 con JSON de sesión requerido, comportamiento esperado sin sesión de aplicación.
- Consulta de logs de nivel error del despliegue: sin registros encontrados. No hay drains configurados; la comprobación no sustituye uso autenticado real.
