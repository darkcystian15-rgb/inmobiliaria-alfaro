import test from 'node:test';
import assert from 'node:assert/strict';
import { publicationTextModel, publicationTemplate, unconfirmedCount, applyDocumentProposal, UNCONFIRMED } from '../lib/publication-text-model.mjs';

const combinations = [
  ['casa', 'venta', 'casa_venta'], ['casa', 'alquiler', 'casa_alquiler'],
  ['departamento', 'venta', 'departamento_venta'], ['departamento', 'alquiler', 'departamento_alquiler'],
  ['local comercial', 'venta', 'local_comercial_venta'], ['local comercial', 'alquiler', 'local_comercial_alquiler'],
  ['terreno comercial', 'venta', 'terreno_comercial_venta'], ['terreno comercial', 'alquiler', 'terreno_comercial_alquiler'],
  ['terreno urbano', 'venta', 'terreno_urbano_venta'], ['edificio', 'venta', 'edificio_venta'], ['hotel', 'venta', 'hotel_venta'],
];
for (const [tipo, operacion, key] of combinations) test(`modelo ${key}: selección automática, datos pendientes y cierre`, () => {
  const property = { tipo, operacion };
  assert.equal(publicationTemplate(property).key, key);
  assert.equal(publicationTemplate(property).specific, true);
  const text = publicationTextModel(property);
  assert.ok(text.includes(`${operacion === 'venta' ? 'SE VENDE' : 'SE ALQUILA'} ${tipo.toUpperCase()}`));
  assert.ok(text.includes(UNCONFIRMED));
  assert.ok(text.includes('TU INMUEBLE EN LAS MEJORES MANOS'));
  assert.equal(text.includes('GARANTÍA:'), operacion === 'alquiler');
  assert.equal(text.includes('💡 IDEAL PARA'), /comercial|edificio/.test(tipo));
  assert.ok(!text.includes('XXXX') && !text.includes('[COMPLETAR'));
});

test('usa datos reales y solo precio de salida, sin filtrar identificación ni notas internas', () => {
  const text = publicationTextModel({tipo:'edificio empresarial', operacion:'venta', direccion:'Av. Bolognesi', numeroDireccion:'300', provincia:'Chimbote', areaTerreno:'319.15', areaConstruida:'460.00', precioVenta:'420000', precioVentaMoneda:'USD', precioObjetivo:'390000', nombreContacto:'PRIVADO', observaciones:'NOTA INTERNA'});
  for (const value of ['SE VENDE EDIFICIO EMPRESARIAL', 'AV. BOLOGNESI 300 - CHIMBOTE', '319.15 M²', '460.00 M²', 'US$ 420,000.00', '940221494']) assert.ok(text.includes(value), value);
  for (const value of ['390000', 'PRIVADO', 'NOTA INTERNA', 'CENTRO FINANCIERO', 'PRIMER PISO']) assert.ok(!text.includes(value), value);
});

test('alquiler usa distribución registrada pero no inventa condiciones ni equipamiento', () => {
  const text = publicationTextModel({tipo:'departamento', operacion:'alquiler', habitaciones:3, banos:2, caracteristicas:'Sala y comedor', precioVenta:'1500', precioVentaMoneda:'PEN'});
  for (const value of ['HABITACIONES: 3', 'BAÑOS: 2', 'Sala y comedor', 'ALQUILER MENSUAL: S/ 1,500.00', `GARANTÍA: ${UNCONFIRMED}`]) assert.ok(text.includes(value), value);
  assert.ok(!text.includes('PRECIO DE VENTA') && !text.includes('2 MESES') && !text.includes('COCHERA'));
});

test('tipos adicionales y combinaciones sin archivo conservan un modelo general editable', () => {
  assert.equal(publicationTemplate({tipo:'oficina', operacion:'alquiler'}).specific, false);
  assert.ok(publicationTextModel({tipo:'oficina', operacion:'alquiler'}).includes('SE ALQUILA OFICINA'));
  assert.ok(!publicationTextModel({tipo:'terreno urbano'}).includes('ÁREA CONSTRUIDA'));
  assert.ok(publicationTextModel({tipo:'departamento'}).includes('PISO: DATO POR CONFIRMAR'));
});

test('propuestas solo completan el campo pendiente seleccionado; conservan todos los ajustes', () => {
  const text = `Título editado\n${UNCONFIRMED}\nÁREA: ${UNCONFIRMED}\n${UNCONFIRMED}\nContacto editado`;
  assert.equal(applyDocumentProposal(text, 3, 'Propuesta revisada'), `Título editado\n${UNCONFIRMED}\nÁREA: ${UNCONFIRMED}\nPropuesta revisada\nContacto editado`);
  assert.equal(applyDocumentProposal(text, 0, 'No reemplazar'), text);
  assert.equal(applyDocumentProposal(text, 99, 'Fuera'), text);
  assert.equal(applyDocumentProposal(text, 1, ' '), text);
  assert.equal(unconfirmedCount(text), 3);
  assert.equal(unconfirmedCount('Publicado y editado por mí'), 0);
});

test('sin moneda confirmada no se interpreta ni convierte el precio', () => {
  assert.ok(publicationTextModel({tipo:'casa', precioVenta:'300000'}).includes(`PRECIO DE VENTA: ${UNCONFIRMED}`));
});
