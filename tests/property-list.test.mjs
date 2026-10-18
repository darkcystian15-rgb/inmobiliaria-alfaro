import test from "node:test";
import assert from "node:assert/strict";
import { filterProperties } from "../lib/property-list.mjs";

const items = [
  { id: "INM-10", nombre: "Casa Álamo", posicion: 10, estado: "activo", ubicacion: "Lima", propietario: "José Pérez" },
  { id: "INM-2", nombre: "Departamento", posicion: 2, estado: "activo", ubicacion: "Piura" },
  { id: "INM-H", nombre: "Casa histórica", posicion: 1, estado: "historico" },
  { id: "INM-N", nombre: "Sin posición", posicion: null, estado: "activo" },
];

test("numeric positions precede unassigned properties, with active properties first", () => {
  assert.deepEqual(filterProperties(items, "", "todos").map(item => item.id), ["INM-2", "INM-10", "INM-N", "INM-H"]);
  assert.deepEqual(filterProperties(items, "", "activo").map(item => item.id), ["INM-2", "INM-10", "INM-N"]);
  assert.deepEqual(filterProperties(items, "", "historico").map(item => item.id), ["INM-H"]);
  assert.equal(items[0].id, "INM-10");
});

test("search accepts accents, owner names, locations, codes and padded positions", () => {
  for (const query of ["alamo", "JOSE PEREZ", "lima casa", "INM-10", "pos. 10"]) {
    assert.deepEqual(filterProperties(items, query, "activo").map(item => item.id), ["INM-10"]);
  }
  assert.deepEqual(filterProperties(items, "02", "activo").map(item => item.id), ["INM-2"]);
  assert.deepEqual(filterProperties(items, "inexistente", "todos"), []);
});


test("the visible identifier can be searched while stored codes remain searchable", () => {
  const property = { id: "012-LOCAL-LIDIA-CHAVARRIA", nombre: "Referencia anterior", operacion: "venta", tipo: "Local", direccion: "Av Meigss C3", estado: "activo" };
  assert.equal(filterProperties([property], "012-venta-local-av meigss c3", "activo").length, 1);
  assert.equal(filterProperties([property], "012-LOCAL-LIDIA-CHAVARRIA", "activo").length, 1);
});
