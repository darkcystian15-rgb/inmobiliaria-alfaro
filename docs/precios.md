> Referencia de versión: consultar [Estado actual](estado-actual-2026-10-15.md) antes de usar los pendientes o instrucciones de este documento. Se conserva el contenido como registro de su revisión.

# Precios y tasaciones negociadas

Una nueva tasación se registra cuando la negociación con el propietario ya terminó. Se requieren fecha y tres precios mayores que cero, con hasta dos decimales:

- Precio de tasación: valoración técnica, almacenada en `valor_referencia` para conservar los datos existentes.
- Precio objetivo: monto que se busca alcanzar.
- Precio de venta: monto acordado para ofrecer el inmueble.

La observación es opcional. Se mantiene internamente `situacion = aprobado` para que las demás etapas sigan funcionando. Los controles de situación se retiraron del registro y de la bandeja de tasaciones y textos pendientes. Esta bandeja muestra únicamente tasaciones negociadas y conserva los apartados de texto, material, listos para publicar y publicados.

En la tarjeta de tasación negociada, “Modificar precio de venta y observación” permite actualizar esos datos incluso después de publicar. `PATCH /api/tasaciones` guarda el cambio y su historial en `inm_timeline`, con precio anterior, nuevo precio, observación, usuario y fecha. Conserva precio de tasación, precio objetivo, etapa del inmueble y datos de publicación. Los anuncios externos se actualizan por separado.

## Instalar en una base existente

```bash
node scripts/install-prices.mjs
```

El script agrega `precio_venta` si falta y completa únicamente precios ausentes de tasaciones negociadas de inmuebles activos. Los valores simulados usan primero el precio objetivo existente; si no existe ningún precio, usan S/ 100,000. Cada inicialización queda identificada como simulada en el historial. Conserva los precios existentes y las observaciones. Puede ejecutarse nuevamente sin repetir cambios.

La migración Drizzle `0003_acoustic_hedge_knight.sql` agrega el mismo campo; no debe aplicarse su `ALTER TABLE` a una base donde ya lo instaló el script. En instalaciones nuevas gestionadas por Drizzle, aplicar la migración y ejecutar el script solamente si se necesita completar datos anteriores.

## Verificar

```bash
node --test tests/prices.test.mjs
npm run build -- --webpack
node tests/prices.integration.mjs
```

La integración utiliza la base configurada y un servidor temporal en el puerto 3111. Crea y elimina sus propios registros. Comprueba los tres precios, actualización antes y después de publicar, validación de importes, protección de acceso, historial y conservación de los datos del inmueble y la publicación.
