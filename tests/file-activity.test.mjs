import test from 'node:test';
import assert from 'node:assert/strict';
import {fileActivitySnapshot,fileActivitySummary} from '../lib/file-activity.mjs';
test('upload snapshot identifies document, seller section and original file without exposing storage details',()=>{
 const file={id:5,tipoDocumento:'VENDEDOR_DNI',nombre:'DNI titular',nombreOriginal:'dni.pdf',tipoMime:'application/pdf',tamanoBytes:2048,enlace:'https://private.invalid/secret',rutaAlmacenamiento:'secret-path',observacion:'Legible'};
 const snapshot=fileActivitySnapshot(file);
 assert.equal(snapshot.categoria,'DNI');assert.equal(snapshot.seccion,'Vendedor · DNI y poderes');assert.equal(snapshot.nombreOriginal,'dni.pdf');assert.equal(snapshot.tamano,'2.0 KB');
 assert.ok(!JSON.stringify(snapshot).includes('secret'));
 assert.equal(fileActivitySummary('archivo_subido',JSON.stringify({archivo:snapshot})),'DNI titular · DNI · Vendedor · DNI y poderes · Archivo: dni.pdf');
});
test('rental aliases use rental party names and photos record visit/cover association',()=>{
 assert.equal(fileActivitySnapshot({tipoDocumento:'DNI_PROPIETARIO',nombre:'DNI'},'alquiler').seccion,'Arrendador · DNI y poderes');
 const photo=fileActivitySnapshot({id:4,tipoDocumento:'FOTO_INMUEBLE',nombre:'Fachada',visitaId:8,esPortada:true});
 assert.equal(photo.seccion,'Visitas');assert.equal(photo.visitaId,8);assert.equal(photo.portada,true);
});
test('update summary describes the new identity; invalid and unrelated observations have no invented detail',()=>{
 const old=fileActivitySnapshot({tipoDocumento:'POR_CLASIFICAR',nombre:'Sin clasificar'});
 const next=fileActivitySnapshot({tipoDocumento:'CONTRATO_ALQUILER',nombre:'Adenda'},'alquiler');
 assert.match(fileActivitySummary('archivo_actualizado',JSON.stringify({anterior:old,nuevo:next})),/^Adenda/);
 assert.match(fileActivitySummary('archivo_eliminado',JSON.stringify({archivo:old})),/^Sin clasificar/);
 assert.equal(fileActivitySummary('archivo_subido','not json'),null);
 assert.equal(fileActivitySummary('visita_realizada','texto anterior'),null);
});
