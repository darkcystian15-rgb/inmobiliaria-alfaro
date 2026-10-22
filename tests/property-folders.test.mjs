import assert from 'node:assert/strict';
import { dossierDefaults, dossierStatus } from '../lib/transaction-dossier.mjs';
import { filesByInformationFolder, informationFolders, informationFolderPhase, folderForLegacyTab } from '../lib/property-folders.mjs';

// A presentation change must keep the original records, including non-applicable
// files, old category aliases and records from a previous operation.
const files = [
  { id: 1, tipoDocumento: 'DNI_PROPIETARIO', nombre: 'DNI anterior', enlace: '/original/1', almacenamiento: 'hosting' },
  { id: 2, tipoDocumento: 'COMPRADOR_DNI', nombre: 'Comprador previo', enlace: '/original/2', almacenamiento: 'hosting' },
  { id: 3, tipoDocumento: 'LEVANTAMIENTO_CARGAS', nombre: 'Cargas anteriores', enlace: '/original/3', almacenamiento: 'hosting' },
  { id: 4, tipoDocumento: 'COPIA_LITERAL', nombre: 'Copia anterior', enlace: '/original/4', almacenamiento: 'enlace' },
  { id: 5, tipoDocumento: 'TASACION', nombre: 'Tasación anterior', enlace: '/original/5', almacenamiento: 'hosting' },
  { id: 6, tipoDocumento: 'POR_CLASIFICAR', nombre: 'Sin categoría', enlace: '/original/6', almacenamiento: 'hosting' },
  { id: 7, tipoDocumento: 'FOTO_INMUEBLE', nombre: 'Visita', enlace: '/original/7', almacenamiento: 'hosting' },
  { id: 8, tipoDocumento: 'VENDEDOR_FORMULARIO_RENTA', nombre: 'Renta previa', enlace: '/original/8', almacenamiento: 'hosting' },
];
const original = structuredClone(files);
const status = dossierStatus({ ...dossierDefaults(), vendedorTipo: 'juridica', renta: 'exonerado', cargas: false }, files, 'venta');
const sale = filesByInformationFolder(files, status, 'venta');
assert.deepEqual(sale.identificacion.map(file => file.id), [1, 2]);
assert.deepEqual(sale.cargas.map(file => file.id), [3]);
assert.deepEqual(sale.inmueble.map(file => file.id), [4]);
assert.deepEqual(sale.tasaciones.map(file => file.id), [5]);
assert.deepEqual(sale.otros.map(file => file.id), [6]);
assert.deepEqual(sale.impuestos.map(file => file.id), [8]);
assert.deepEqual(Object.values(sale).flat().map(file => file.id).sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 8]);
const rental = filesByInformationFolder(files, dossierStatus(dossierDefaults(), files, 'alquiler'), 'alquiler');
assert.deepEqual(rental.identificacion.map(file => file.id), [1, 2]);
assert.deepEqual(rental.otros.map(file => file.id), [3, 6, 8]);
assert.deepEqual(Object.values(rental).flat().map(file => file.id).sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 8]);
assert.deepEqual(files, original, 'No record, category, name or storage link changes');
assert.ok(Object.values(sale).flat().every(file => files.includes(file)), 'Keep the same record objects');
assert.equal(informationFolders('venta', false).some(item => item.key === 'seguimiento'), false);
assert.equal(informationFolders('alquiler', true).some(item => item.key === 'impuestos' || item.key === 'cargas'), false);
assert.equal(folderForLegacyTab('Resumen'), '');
assert.equal(informationFolders('venta', true).some(item => item.key === 'resumen' || item.key === 'otros'), false);
assert.equal(informationFolders('venta', true, sale.otros.length).some(item => item.key === 'otros'), true);
for (const legacy of [ 'Estado del expediente', 'Vendedor', 'Comprador', 'Inmueble', 'Visitas', 'Tasación', 'Publicación', 'Seguimiento']) assert.ok(folderForLegacyTab(legacy));
console.log('PASS: archivos conservados una sola vez, categorías anteriores, condiciones no aplicables, venta/alquiler y permisos.');

const searchFile = {id:99,tipoDocumento:'VENDEDOR_BUSQUEDA_NACIONAL',almacenamiento:'hosting'};
for (const renta of ['afecto','exonerado']) {
  const grouped = filesByInformationFolder([searchFile],dossierStatus({...dossierDefaults(),vendedorTipo:'natural',renta},[searchFile]),'venta');
  assert.equal(grouped[renta==='exonerado'?'impuestos':'identificacion'][0],searchFile);
  assert.equal(Object.values(grouped).flat().length,1,'Same search file is presented exactly once');
}

for(const operation of ['venta','alquiler']) {
  for(const administrator of [false,true]) {
    const folders=informationFolders(operation,administrator,1);
    assert.deepEqual(folders.filter(item=>item.phase===1).map(item=>item.key),['visitas','precios','publicacion']);
    const phaseTwo=folders.filter(item=>item.phase===2);
    const numbered=phaseTwo.filter(item=>/^\d+\./.test(item.label));
    assert.equal(numbered.length,operation==='venta'?7:5);
    assert.deepEqual(phaseTwo.slice(numbered.length).map(item=>item.key),administrator?['estado','seguimiento','otros']:['estado','otros']);
    assert.ok(phaseTwo.slice(numbered.length).every(item=>!/^\d+\./.test(item.label)));
    assert.equal(new Set(folders.map(item=>item.key)).size,folders.length);
    assert.equal(informationFolderPhase('estado'),2);
    assert.equal(informationFolderPhase('seguimiento'),2);
  }
}
