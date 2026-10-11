# Lista de cartera con etiquetas

La lista compacta mantiene la posición y el icono de carpeta. Los datos aparecen en el orden: operación, tipo, dirección, propietario, zona y pendientes o estado. El precio permanece visible y cada fila abre el detalle del inmueble.

Los estados usan fondo suave, borde y texto: visita pendiente en ámbar, tasación pendiente en violeta, material pendiente en azul y publicado en verde. Si existen varios pendientes se muestran sus etiquetas. Los datos generales usan tonos neutros. En celular las etiquetas conservan el orden y pasan a la siguiente línea.

Punto de recuperación anterior: etiqueta Git `recuperacion-antes-etiquetas-cartera-20261011`, commit `d6cc2c1edab88af52e4eb00dec091ba7866411eb`. Para deshacer únicamente este cambio se debe revertir el commit del listado con etiquetas y publicar el revert en `main`; así se conservan otros cambios posteriores.

Verificación: TypeScript, ESLint y navegador para orden de los datos, cuatro colores diferentes, apertura de fila y ancho móvil sin desbordamiento. La vista previa usa ejemplos, no modifica inmuebles de la base de datos.
