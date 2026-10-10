# Organización de fichas

`scripts/organize-property-records.mjs` organiza los datos existentes de las posiciones 1 a 12 siguiendo la ficha 13:

- Usa el nombre del propietario como referencia.
- Separa el número final de la dirección cuando el campo número está vacío.
- Retira el prefijo «SOLO PRUEBA» de características y las anotaciones automáticas de demostración.
- Deja sin completar los DNI y correos explícitamente de ejemplo y las referencias de contacto ficticias.
- Conserva teléfono, medidas, ubicación, operación, estados, documentos, precios y clasificación interna. La organización no acredita la autenticidad de la información.

Por defecto solo previsualiza. Con `--apply`, guarda un respaldo privado en `restore-points/` (excluido de Git), aplica todo en una transacción y registra cada ficha en su historial. No altera la posición 13. Puede repetirse sin volver a modificar fichas ya organizadas.

Configurar `DATABASE_URL` en el entorno y ejecutar:

```sh
node scripts/organize-property-records.mjs
node scripts/organize-property-records.mjs --apply
```

Los respaldos contienen datos privados y deben conservarse fuera del repositorio público.

## Cartera por zonas

La entrada `/cartera` muestra las zonas existentes en las fichas, con sus conteos de activos e históricos. Seleccionar una zona abre su lista compacta; la selección queda en `?zona=...` para conservarla al recargar y navegar con Atrás. «Volver a zonas» regresa a la entrada y «Ver listado general» reúne todas las fichas.

La búsqueda y los filtros se aplican dentro de la zona. Limpiar filtros conserva la zona. Los inmuebles sin ubicación quedan agrupados en «Sin zona registrada». Las posiciones libres son globales y se identifican así, porque no tienen una zona asignada. Se conservan el detalle y la ficha completa.

El catálogo comercial y las fichas de Casma que usaban «Comandante Noel» se actualizaron a «Tortugas» por indicación del administrador. La modificación se registró en la auditoría existente.
