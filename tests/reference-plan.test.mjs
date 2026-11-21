import assert from 'node:assert/strict';
import { referencePlanPrompt, planTypes, resolveReferencePlan, resolveReferencePlanLots } from '../lib/reference-plan.mjs';
import { intermediationProposals } from '../lib/intermediation.mjs';
import { documentsForOperation, dossierClosureStatus, dossierStatus } from '../lib/transaction-dossier.mjs';
import { DOCUMENT_TYPES } from '../lib/document-files.mjs';

const config = { planos: true };
const file = type => ({ tipoDocumento: type, almacenamiento: 'hosting' });
const saleWithoutPlans = dossierClosureStatus({ planos: false }, [], 'venta');
for (const operation of ['venta', 'alquiler']) {
  assert.deepEqual(documentsForOperation(operation).filter(doc => doc.section === 'planos').map(doc => doc.key), planTypes);
  assert.ok(planTypes.every(type => DOCUMENT_TYPES.has(type)));
  for (const [index, type] of planTypes.entries()) {
    const files = [file(type)];
    const status = dossierStatus(config, files, operation);
    assert.deepEqual(status.items.filter(item => item.section === 'planos').map(item => item.documents.length), planTypes.map((_, i) => Number(i === index)));
    const closure = dossierClosureStatus(config, files, operation);
    const missingPlan = closure.missing.includes('Plano de distribución o de ubicación referencial');
    assert.equal(missingPlan, operation === 'venta' && index === 2);
  }
}
assert.deepEqual(dossierClosureStatus({ planos: false }, [file(planTypes[2])], 'venta'), saleWithoutPlans);
const prompt = referencePlanPrompt({ tipo: 'Local', zona: 'Centro', numero: 12, direccion: 'Av. Prueba', contacto: 'Contacto', area: '42 m²', partida: '12345678' });
assert.match(prompt, /ZONA\s+Centro\s+\(/);
assert.match(prompt, /INMUEBLE NUMERO\s+12\s+\(/);
assert.match(prompt, /^PROMPT INTRANET PARA PLANO REFERENCIAL DE LOTE[\s\S]*PRIMERO INGRESA AL PUNTO :\n2\. DOCUMENTOS DEL INMUEBLE[\s\S]*LUEGO INGRESA A PUNTO :\n8\. PLANOS[\s\S]*EL ARCHIVO CREADO LO DEBES COLOCAR EN EN PUNTO 8\. PLANOS EN EL ITEM :\n PLANO DE UBICACIÓN REFERENCIAL \.$/);
assert.match(prompt, /PLANO DE UBICACIÓN REFERENCIAL Local Av\. Prueba Contacto/);
assert.doesNotMatch(prompt, /contraseña|42 m²|12345678/i);
assert.match(referencePlanPrompt({}, 'clave-de-prueba'), /USANDO EL  USUARIO: administrador \/ CONTRASEÑA: clave-de-prueba/);

const reconciled = resolveReferencePlan([
  { key: 'area', value: '42.00 m²', source: 'Ficha del inmueble' },
  { key: 'area', value: '42,0 metros cuadrados', source: 'CRI, pág. 2' },
  { key: 'partida', value: '12345678', source: 'CRI, pág. 1' },
  { key: 'partida', value: '87654321', source: 'Copia literal, pág. 1' },
  { key: 'linderos', value: 'Frente: 7 m; Fondo: 6 m', source: 'CRI, pág. 2' },
  { key: 'linderos', value: 'Por el frente: 7 m.', source: 'Copia literal, pág. 2' },
  { key: 'linderos', value: 'Fondo: 5 m', source: 'Copia literal, pág. 2' },
]);
assert.deepEqual(reconciled.fields, { partida: '', area: '42.00 m²', linderos: 'Frente: 7 m' });
assert.equal(reconciled.observations.length, 2);
assert.ok(reconciled.observations.some(note => /Partida registral.*distintos.*12345678.*87654321/.test(note)));
assert.ok(reconciled.observations.some(note => /fondo.*distintos.*6 m.*5 m/.test(note)));

const repeatedRegistry = resolveReferencePlan([1, 2, 3].map(page => ({
  key: 'partida', value: 'P12345678', source: `Copia literal, pág. ${page}`,
})));
assert.equal(repeatedRegistry.fields.partida, 'P12345678');
assert.deepEqual(repeatedRegistry.observations, []);

const documents = ['23A', '24'].map((lot, index) => {
  const name = `Copia literal lote ${lot}`;
  const header = index ? 'P12345679 12345678\nPublicidad N*:' : 'P12345678 Publicidad N*:';
  const area = index ? '527.3 M2' : '397.1 M2';
  const front = index ? '15.40' : '15.65';
  const text = `${header}\nDPTO: ANCASH PROV: SANTA DIST: CHIMBOTE\nÁrea: ${area}\nLINDEROS MEDIDA COLINDANCIA\nFrente ${front} ML AV. PRUEBA\nInscrita en la partida\n11116426 del Registro de Sucesiones Intestadas`;
  return { id: index + 1, name, proposals: intermediationProposals('COPIA_LITERAL_CRI', text).map(proposal => ({ ...proposal, source: name })) };
});
const lots = resolveReferencePlanLots(documents, '924.4');
assert.deepEqual(lots.map(({ partida, area, linderos, observations }) => ({ partida, area, linderos, observations })), [
  { partida: 'P12345678', area: '397.1 M2', linderos: 'Frente 15.65 ML AV. PRUEBA', observations: [] },
  { partida: 'P12345679', area: '527.3 M2', linderos: 'Frente 15.40 ML AV. PRUEBA', observations: [] },
]);
assert.equal(resolveReferencePlanLots([documents[0], { ...documents[0], id: 3, name: 'CRI' }]).length, 1);
