import test from 'node:test';
import assert from 'node:assert/strict';
import { canWritePropertyFile, isPhaseOneFile } from '../lib/phase-one-access.mjs';
import { dossierDocuments } from '../lib/transaction-dossier.mjs';
const admin={rol:'administrador'}, operator={rol:'usuario'};
test('phase-one material is editable only by administrator; operator retains documentary uploads',()=>{
  for(const type of ['FOTO_INMUEBLE','TEXTO_PUBLICACION','VIDEO_INMUEBLE']) {
    assert.equal(isPhaseOneFile(type),true);
    assert.equal(canWritePropertyFile(admin,type),true);
    assert.equal(canWritePropertyFile(operator,type),false);
    assert.equal(canWritePropertyFile(null,type),false);
  }
  for(const {key} of dossierDocuments) {
    assert.equal(isPhaseOneFile(key),false);
    assert.equal(canWritePropertyFile(operator,key),true);
    assert.equal(canWritePropertyFile(admin,key),true);
  }
});
