import test from 'node:test';
import assert from 'node:assert/strict';
import {reportCatalog,recommendedReportColumns} from '../lib/report-catalog.mjs';
import {reportPeriodField} from '../lib/report-period.mjs';
test('report catalog is unique and exposes only the current workflow',()=>{
 assert.equal(new Set(reportCatalog.map(r=>r.nombre)).size,reportCatalog.length);
 assert.ok(reportCatalog.some(r=>r.nombre==='Alertas de actividades'));
 assert.ok(!reportCatalog.some(r=>/aprobaci|negociaci/i.test(r.nombre)));
 assert.equal(reportPeriodField('Alertas de actividades'),'fechaLimite');
});
test('recommended columns show the date and decision fields of each report',()=>{
 const available=['zona','posicion','nombre','fechaVisita','fechaLimite','estadoPlazo','diasRetraso','fechaInicioFlujo','fechaFinFlujo','dias'];
 assert.deepEqual(recommendedReportColumns('Tasaciones pendientes',available),['zona','posicion','nombre','fechaVisita','fechaLimite','estadoPlazo','diasRetraso']);
 assert.ok(recommendedReportColumns('Visitas realizadas',available).includes('fechaVisita'));
 assert.deepEqual(recommendedReportColumns('Visita → tasación',available),['zona','posicion','nombre','fechaInicioFlujo','fechaFinFlujo','dias']);
 assert.deepEqual(recommendedReportColumns('Posiciones disponibles',['zona','posicion','estado','tipo']),['zona','posicion','estado']);
});
