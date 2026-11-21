import test from 'node:test';
import assert from 'node:assert/strict';
import { emptySaneamiento, changeSaneamiento, saneamientoInput } from '../lib/saneamiento-folders.mjs';
import { dossierDefaults, dossierInput, dossierStatus, dossierClosureStatus } from '../lib/transaction-dossier.mjs';
import { filesByInformationFolder } from '../lib/property-folders.mjs';

const files = [
  { id: 1, tipoDocumento: 'LEVANTAMIENTO_CARGAS', nombre: 'Existente', observacion: 'Conservar descripción', enlace: '/original/1', almacenamiento: 'hosting' },
  { id: 2, tipoDocumento: 'OTROS_CARGAS', nombre: 'Apoyo', almacenamiento: 'hosting' },
  { id: 3, tipoDocumento: 'MINUTA_COMPRAVENTA', almacenamiento: 'hosting' },
];
test('single-level property folders preserve original documents through create, move, rename and return to root', () => {
  const original = structuredClone(files);
  let metadata = changeSaneamiento(undefined, { action: 'create', nombre: ' Independización ' }, files, 'folder-1');
  metadata = changeSaneamiento(metadata, { action: 'create', nombre: 'Rectificación' }, files, 'folder-2');
  metadata = changeSaneamiento(metadata, { action: 'move', fileId: 1, folderId: 'folder-1' }, files);
  metadata = changeSaneamiento(metadata, { action: 'move', fileId: 2, folderId: 'folder-1' }, files);
  assert.deepEqual(metadata.files, { 1: 'folder-1', 2: 'folder-1' });
  metadata = changeSaneamiento(metadata, { action: 'rename', folderId: 'folder-1', nombre: 'Declaratoria' }, files);
  assert.equal(metadata.files[1], 'folder-1');
  assert.throws(() => changeSaneamiento(metadata, { action: 'delete', folderId: 'folder-1' }, files), /vacías/);
  metadata = changeSaneamiento(metadata, { action: 'move', fileId: 1, folderId: 'folder-2' }, files);
  metadata = changeSaneamiento(metadata, { action: 'move', fileId: 2, folderId: '' }, files);
  metadata = changeSaneamiento(metadata, { action: 'delete', folderId: 'folder-1' }, files);
  assert.deepEqual(metadata.files, { 1: 'folder-2' });
  assert.equal(metadata.folders.length, 1);
  assert.deepEqual(files, original);
});
test('rejects nested folders, duplicates, invalid destinations and files outside this property/section', () => {
  const metadata = changeSaneamiento(emptySaneamiento(), { action: 'create', nombre: 'Planos' }, files, 'folder-1');
  assert.throws(() => saneamientoInput({ ...metadata, folders: [{ ...metadata.folders[0], parentId: 'nested' }] }), /un nivel/);
  for (const nombre of ['planos', ' PLANOS ', '', 'ruta/carpeta', 'ruta\\carpeta', 'x'.repeat(121)]) assert.throws(() => changeSaneamiento(metadata, { action: 'create', nombre }, files, 'folder-2'));
  for (const fileId of [3, 99]) assert.throws(() => changeSaneamiento(metadata, { action: 'move', fileId, folderId: 'folder-1' }, files), /inmueble/);
  assert.throws(() => changeSaneamiento(metadata, { action: 'move', fileId: 1, folderId: 'another-property' }, files));
  assert.throws(() => changeSaneamiento(metadata, { action: 'rename', folderId: 'missing', nombre: 'Nueva' }, files));
});
test('old dossiers start at root, saved folders round trip and completion remains global', () => {
  const config = dossierDefaults(); delete config.saneamiento;
  assert.deepEqual(dossierInput(config).saneamiento, emptySaneamiento());
  const metadata = changeSaneamiento(undefined, { action: 'create', nombre: 'Trámite' }, files, 'folder-1');
  metadata.files[1] = 'folder-1';
  const next = { ...dossierDefaults(), cargas: true, saneamiento: metadata };
  assert.deepEqual(dossierInput(next).saneamiento, metadata);
  assert.equal(dossierStatus(next, files).items.find(item => item.key === 'LEVANTAMIENTO_CARGAS').complete, true);
  assert.ok(!dossierClosureStatus(next, files).missing.includes('Saneamiento físico legal'));
  assert.deepEqual(filesByInformationFolder(files, dossierStatus(next, files), 'venta').cargas.map(file => file.id), [1, 2]);
});
test('obsolete assignments disappear after deletion or recategorization, without losing folder names', () => {
  const metadata = { folders: [{ id: 'folder-1', nombre: 'Trámite' }], files: { 1: 'folder-1', 3: 'folder-1', 99: 'folder-1' } };
  const next = changeSaneamiento(metadata, { action: 'rename', folderId: 'folder-1', nombre: 'Nuevo' }, files);
  assert.deepEqual(next.files, { 1: 'folder-1' });
  assert.deepEqual(metadata.files, { 1: 'folder-1', 3: 'folder-1', 99: 'folder-1' });
});
