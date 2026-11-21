import test from 'node:test';
import assert from 'node:assert/strict';
import { dossierDefaults, dossierClosureStatus, dossierInput, dossierDocuments, dossierStatus, documentApplies } from '../lib/transaction-dossier.mjs';
import { DOCUMENT_TYPES } from '../lib/document-files.mjs';

const natural = () => ({ ...dossierDefaults(), vendedorTipo: 'natural', vendedorPropietarios: 'matrimonio', vendedorRegimen: 'comunes', vendedorRepresentante: 'no', compradorAsignado: true, compradorTipo: 'natural', compradorComposicion: 'uno', compradorRegimen: 'pendiente', compradorRepresentante: 'no', renta: 'afecto', rentaObservacion: 'Sustento de prueba del pago de renta.' });
const file = tipoDocumento => ({ tipoDocumento, almacenamiento: 'hosting' });
test('seller ownership and representation independently gate uploads and retain existing files', () => {
  const definition = key => dossierDocuments.find(item => item.key === key);
  for (const owners of ['pendiente', 'uno', 'matrimonio', 'divorciado', 'viudo', 'varios']) {
    for (const regime of ['pendiente', 'comunes', 'separados']) {
      for (const representative of ['pendiente', 'si', 'no']) {
        const config = { ...natural(), vendedorPropietarios: owners, vendedorRegimen: regime, vendedorRepresentante: representative };
        assert.equal(dossierInput(config).vendedorPropietarios, owners);
        assert.equal(documentApplies(definition('VENDEDOR_PARTIDA_MATRIMONIAL'), config), owners === 'matrimonio');
        assert.equal(documentApplies(definition('VENDEDOR_SEPARACION_PATRIMONIAL'), config), owners === 'matrimonio' && regime === 'separados');
        for (const key of ['VENDEDOR_PODER', 'VENDEDOR_VIGENCIA_PODER']) {
          assert.equal(documentApplies(definition(key), config), representative === 'si');
          const item = dossierStatus(config, [file(key)]).items.find(item => item.key === key);
          assert.equal(item.documents.length, 1);
          assert.equal(item.state, representative === 'si' ? 'completo' : 'no_aplica');
        }
        assert.equal(documentApplies(definition('COMPRADOR_PODER'), config), false);
        assert.equal(documentApplies(definition('VENDEDOR_DNI'), config), true);
      }
    }
  }
});
test('ownership inputs validate options and older records start with conditions pending verification', () => {
  const old = natural();
  for (const key of ['vendedorPropietarios', 'vendedorRegimen', 'vendedorRepresentante']) {
    assert.throws(() => dossierInput({ ...old, [key]: 'invalido' }));
    delete old[key];
  }
  const restored = dossierInput(old);
  assert.equal(restored.vendedorPropietarios, 'pendiente');
  assert.equal(restored.vendedorRegimen, 'pendiente');
  assert.equal(restored.vendedorRepresentante, 'pendiente');
  assert.ok(dossierStatus(restored).alerts.some(alert => alert.includes('propietarios')));
  assert.equal(documentApplies(dossierDocuments.find(item => item.key === 'VENDEDOR_PODER'), restored), false);
});
test('seller marriage certificate is optional for natural persons and allows multiple files', () => {
  const key = 'VENDEDOR_PARTIDA_MATRIMONIAL';
  const item = (config, files = [], operation = 'venta') => dossierStatus(config, files, operation).items.find(item => item.key === key);
  assert.equal(DOCUMENT_TYPES.has(key), true);
  assert.equal(item(natural()).state, 'opcional');
  assert.equal(item(natural(), [file(key), file(key)]).documents.length, 2);
  assert.equal(item(natural(), [file(key)]).state, 'completo');
  assert.equal(item({ ...natural(), vendedorTipo: 'juridica' }).state, 'no_aplica');
  assert.equal(item(natural(), [], 'alquiler'), undefined);
  assert.equal(dossierDocuments.some(item => item.key === 'COMPRADOR_PARTIDA_MATRIMONIAL'), true);
});
test('seller and buyer independently change identification by person type', () => {
  const result = dossierStatus({ ...natural(), compradorTipo: 'juridica' });
  const item = key => result.items.find(item => item.key === key);
  assert.equal(item('VENDEDOR_DNI').state, 'pendiente');
  assert.equal(item('VENDEDOR_FICHA_RUC').state, 'no_aplica');
  assert.equal(item('COMPRADOR_DNI').state, 'no_aplica');
  assert.equal(item('COMPRADOR_FICHA_RUC').state, 'pendiente');
  assert.equal(item('COMPRADOR_DNI_GERENTE').state, 'pendiente');
  assert.equal(item('COMPRADOR_VIGENCIA_GERENTE').state, 'pendiente');
});
test('unassigned buyer is pending and cannot receive documents', () => {
  const config = dossierDefaults();
  const result = dossierStatus(config);
  assert.ok(result.alerts.some(text => text.includes('Comprador')));
  assert.equal(result.complete, false);
  assert.ok(result.items.filter(item => item.party === 'comprador').every(item => !item.applies));
  assert.equal(documentApplies(dossierDocuments.find(item => item.key === 'COMPRADOR_ALCABALA'), config), false);
});
test('buyer national search stays inactive with old uploads; paying seller does not require it', () => {
  const config = {...natural(), compradorTipo: 'juridica'};
  assert.equal(dossierStatus(config).items.find(item => item.key === 'VENDEDOR_BUSQUEDA_NACIONAL').state, 'no_aplica');
  config.vendedorBusquedaNota = 'No cuenta con búsqueda; revisión pendiente.';
  const result = dossierStatus(config, [file('COMPRADOR_BUSQUEDA_NACIONAL')]);
  assert.equal(result.items.find(item => item.key === 'COMPRADOR_BUSQUEDA_NACIONAL').state, 'no_aplica');
  assert.equal(result.items.find(item => item.key === 'VENDEDOR_BUSQUEDA_NACIONAL').required, false);
});
test('exemption and optional charges change requirements, retaining existing documents', () => {
  const config = { ...natural(), renta: 'exonerado' };
  const files = [file('VENDEDOR_VOUCHER_RENTA')];
  let result = dossierStatus(config, files);
  assert.equal(result.items.find(item => item.key === 'VENDEDOR_FORMULARIO_RENTA').state, 'no_aplica');
  assert.equal(result.items.find(item => item.key === 'VENDEDOR_VOUCHER_RENTA').documents.length, 1);
  assert.equal(result.items.find(item => item.key === 'LEVANTAMIENTO_CARGAS').state, 'no_aplica');
  result = dossierStatus({ ...config, cargas: true }, files);
  assert.equal(result.items.find(item => item.key === 'LEVANTAMIENTO_CARGAS').state, 'pendiente');
});
test('one literal/CRI suffices, multiple files count once, links do not complete requirements', () => {
  const result = dossierStatus(natural(), [file('COPIA_LITERAL_CRI'), file('COPIA_LITERAL_CRI'), { tipoDocumento: 'HR_VENTA', almacenamiento: 'enlace' }]);
  assert.equal(result.items.find(item => item.key === 'COPIA_LITERAL_CRI').state, 'completo');
  assert.equal(result.items.find(item => item.key === 'COPIA_LITERAL_CRI').documents.length, 2);
  assert.equal(result.items.find(item => item.key === 'HR_VENTA').state, 'pendiente');
  assert.equal(result.completed, 1);
});
test('complete dossier excludes optional files and legacy uploads remain recognized', () => {
  const config = { ...natural(), vendedorBusquedaNota: 'Nota vendedor', compradorBusquedaNota: 'Nota comprador' };
  const result = dossierStatus(config);
  const files = result.items.filter(item => item.applies && item.required && !item.note).map(item => file(item.key));
  assert.equal(dossierStatus(config, files).complete, true);
  assert.equal(dossierStatus(config, files).percent, 100);
  assert.equal(dossierStatus(config, [file('DNI_PROPIETARIO')]).items.find(item => item.key === 'VENDEDOR_DNI').state, 'completo');
  assert.equal(dossierStatus({ ...config, renta: 'pendiente' }, files).complete, false);
  for (const item of dossierDocuments) assert.ok(DOCUMENT_TYPES.has(item.key));
});
test('configuration rejects malformed input and validates the single buyer type', () => {
  assert.deepEqual(dossierInput(natural()), natural());
  for (const input of [null, [], { ...natural(), compradorTipo: '' }, { ...natural(), renta: 'no' }, { ...natural(), cargas: 'si' }, { ...natural(), vendedorBusquedaNota: 'a'.repeat(2001) }]) assert.throws(() => dossierInput(input));
});

test('rental shares ten groups and powers depend independently on representation', () => {
  const base = {...dossierDefaults(),arrendadorTipo:'natural',arrendatarioTipo:'natural',arrendadorRepresentante:'no',arrendatarioRepresentante:'no'};
  const status = dossierStatus(base, [], 'alquiler');
  assert.deepEqual(status.sections.map(item => item.key), ['identificacion','inmueble','contratos','impuestos','servicios','cargas','tasaciones','planos','catalogo','cartas']);
  assert.deepEqual(status.alerts, []);
  assert.equal(dossierStatus(dossierDefaults(), [], 'alquiler').alerts.length,2);
  for (const party of ['arrendador','arrendatario']) {
    const key=party.toUpperCase()+'_PODER';
    assert.equal(status.items.find(item=>item.key===key).state,'no_aplica');
    const represented={...base,[party+'Representante']:'si'};
    assert.equal(dossierStatus(represented,[],'alquiler').items.find(item=>item.key===key).state,'pendiente');
    const files=dossierStatus(represented,[],'alquiler').items.filter(item=>item.applies&&item.required).map(item=>file(item.key));
    assert.equal(dossierStatus(represented,files,'alquiler').complete,true);
    assert.equal(dossierStatus(represented,files.filter(item=>item.tipoDocumento!==key),'alquiler').complete,false);
    const kept=dossierStatus(base,[file(key)],'alquiler').items.find(item=>item.key===key);
    assert.equal(kept.documents.length,1);assert.equal(kept.applies,false);
  }
});
test('rental recognizes old party files without rewriting and keeps named contracts independently', () => {
  const files = ['VENDEDOR_DNI', 'COMPRADOR_DNI_GERENTE', 'VENDEDOR_PODER', 'COMPRADOR_PODER', 'COPIA_LITERAL', 'CONTRATO', 'CONTRATO_ALQUILER', 'VENDEDOR_RECIBO_AGUA', 'TASACION'].map(file);
  files[5].nombre = 'Contrato inicial'; files[6].nombre = 'Adenda de renovación';
  const status = dossierStatus({arrendadorTipo:'natural',arrendatarioTipo:'juridica',arrendadorRepresentante:'si',arrendatarioRepresentante:'si'}, files, 'alquiler');
  for (const key of ['ARRENDADOR_DNI', 'ARRENDATARIO_DNI_GERENTE', 'ARRENDADOR_PODER', 'COPIA_LITERAL_CRI', 'RECIBO_SERVICIO', 'TASACION_EXPRESS']) assert.equal(status.items.find(item => item.key === key).state, 'completo', key);
  assert.deepEqual(status.items.find(item => item.key === 'CONTRATO_ALQUILER').documents.map(item => item.nombre), ['Contrato inicial', 'Adenda de renovación']);
  assert.equal(files[0].tipoDocumento, 'VENDEDOR_DNI');
});
test('file categories are restricted by operation for upload and reclassification', () => {
  assert.equal(documentApplies(dossierDocuments.find(item => item.key === 'ARRENDADOR_DNI'), natural(), 'venta'), false);
  assert.equal(documentApplies(dossierDocuments.find(item => item.key === 'VENDEDOR_FORMULARIO_RENTA'), natural(), 'alquiler'), false);
  assert.equal(documentApplies(dossierDocuments.find(item => item.key === 'ARRENDATARIO_PODER'), {...dossierDefaults(),arrendatarioTipo:'natural',arrendatarioRepresentante:'si'}, 'alquiler'), true);
});

test('municipal voucher preserves existing uploads and adds a separate no-debt certificate', () => {
  const status = dossierStatus(natural(), [file('VENDEDOR_PAGO_MUNICIPAL')]);
  const voucher = status.items.find(item => item.key === 'VENDEDOR_PAGO_MUNICIPAL');
  assert.equal(voucher.label, 'Voucher de Pago de Impuestos Municipales, autovalúo y arbitrios');
  assert.equal(voucher.state, 'completo');
  const certificate = status.items.find(item => item.key === 'VENDEDOR_CONSTANCIA_NO_ADEUDO_MUNICIPAL');
  assert.equal(certificate.section, 'impuestos');
  assert.equal(certificate.party, 'vendedor');
  assert.equal(certificate.state, 'pendiente');
  assert.ok(DOCUMENT_TYPES.has(certificate.key));
  assert.equal(dossierStatus(natural(), [file(certificate.key)]).items.find(item => item.key === certificate.key).state, 'completo');
});
test('assigning the buyer in identification activates taxes for both person types and preserves files when unassigned', () => {
  for (const compradorTipo of ['natural', 'juridica']) {
    const assigned = dossierInput({ ...natural(), compradorTipo });
    const status = dossierStatus(assigned);
    assert.deepEqual(status.items.filter(item => item.party === 'comprador' && item.applies).map(item => item.section).filter((value, index, all) => all.indexOf(value) === index).sort(), ['identificacion', 'impuestos']);
    for (const key of ['COMPRADOR_LIQUIDACION', 'COMPRADOR_FORMULARIO_ALCABALA', 'COMPRADOR_ALCABALA']) {
      assert.equal(status.items.find(item => item.key === key).state, 'pendiente');
      const saved = [file(key)];
      const inactive = dossierStatus({ ...assigned, compradorAsignado: false }, saved).items.find(item => item.key === key);
      assert.equal(inactive.applies, false);
      assert.equal(inactive.documents.length, 1);
      assert.equal(dossierStatus(assigned, saved).items.find(item => item.key === key).state, 'completo');
    }
  }
});

test('buyer assignment preserves shared documents and seller requirements across all ten folders', () => {
  const before = dossierStatus({ ...natural(), compradorAsignado: false });
  const after = dossierStatus(natural());
  assert.equal(after.sections.length, 10);
  for (const item of before.items.filter(item => item.party !== 'comprador')) {
    assert.deepEqual(after.items.find(next => next.key === item.key), item);
  }
  for (const key of ['PROMESA_ARRAS', 'MINUTA_COMPRAVENTA', 'ESCRITURA_PUBLICA']) {
    const item = after.items.find(item => item.key === key);
    assert.equal(item.party, 'inmueble');
    assert.equal(item.applies, true);
    assert.equal(dossierStatus(natural(), [file(key)]).items.find(item => item.key === key).state, 'completo');
  }
});

test('buyer liquidation, payment receipt and cancellation form are independent upload categories', () => {
  const config = natural();
  const keys = ['COMPRADOR_LIQUIDACION', 'COMPRADOR_ALCABALA', 'COMPRADOR_FORMULARIO_ALCABALA'];
  const status = dossierStatus(config, [file('COMPRADOR_ALCABALA')]);
  for (const key of keys) {
    const item = status.items.find(item => item.key === key);
    assert.equal(item.section, 'impuestos');
    assert.equal(item.party, 'comprador');
    assert.ok(DOCUMENT_TYPES.has(key));
    assert.equal(item.state, key === 'COMPRADOR_ALCABALA' ? 'completo' : 'pendiente');
  }
  const completed = dossierStatus(config, keys.map(file));
  assert.ok(completed.items.filter(item => keys.includes(item.key)).every(item => item.state === 'completo'));
});

test('no payment requires national search for natural and legal sellers', () => {
  for (const vendedorTipo of ['natural', 'juridica']) {
    const config = { ...natural(), vendedorTipo, renta: 'exonerado', vendedorBusquedaNota: 'Una nota anterior' };
    const find = files => dossierStatus(config, files).items.find(item => item.key === 'VENDEDOR_BUSQUEDA_NACIONAL');
    assert.equal(find([]).section, 'impuestos');
    assert.equal(find([]).state, 'pendiente');
    assert.equal(find([{tipoDocumento: 'VENDEDOR_BUSQUEDA_NACIONAL', almacenamiento: 'enlace'}]).state, 'pendiente');
    assert.equal(find([file('VENDEDOR_BUSQUEDA_NACIONAL')]).state, 'completo');
    assert.equal(find([file('VENDEDOR_BUSQUEDA_NACIONAL')]).documents.length, 1);
    for (const key of ['VENDEDOR_FORMULARIO_RENTA','VENDEDOR_VOUCHER_RENTA']) assert.equal(dossierStatus(config).items.find(item => item.key === key).applies, false);
  }
});
test('payment requires a nonempty explanation validated by server and reflected in old dossier alerts', () => {
  for (const rentaObservacion of ['', '   ', 7, 'a'.repeat(2001)]) assert.throws(() => dossierInput({...natural(), rentaObservacion}));
  assert.equal(dossierInput({...natural(), rentaObservacion:'  Motivo registrado  '}).rentaObservacion, 'Motivo registrado');
  const old = {...natural()}; delete old.rentaObservacion;
  assert.ok(dossierStatus(old).alerts.some(text=>text.includes('observación')));
  assert.equal(dossierStatus(old).complete,false);
  assert.equal(dossierInput({...old,renta:'exonerado'}).rentaObservacion,'');
});
test('changing rent decision keeps the same national search and previous payment files without rewriting', () => {
  const files = [file('VENDEDOR_BUSQUEDA_NACIONAL'),file('VENDEDOR_VOUCHER_RENTA')];
  const copy = structuredClone(files);
  const noPay = dossierStatus({...natural(),renta:'exonerado'}, files);
  const pay = dossierStatus(natural(),files);
  assert.equal(noPay.items.find(item=>item.key==='VENDEDOR_BUSQUEDA_NACIONAL').section,'impuestos');
  assert.equal(pay.items.find(item=>item.key==='VENDEDOR_BUSQUEDA_NACIONAL').section,'impuestos');
  assert.equal(pay.items.find(item=>item.key==='VENDEDOR_BUSQUEDA_NACIONAL').state,'no_aplica');
  assert.equal(pay.items.find(item=>item.key==='VENDEDOR_BUSQUEDA_NACIONAL').documents.length,1);
  assert.equal(noPay.items.find(item=>item.key==='VENDEDOR_VOUCHER_RENTA').documents.length,1);
  assert.deepEqual(files,copy);
});

test('tax catalog keeps national searches with seller and buyer taxes and removes standalone Alcabala', () => {
  const status = dossierStatus(natural());
  assert.deepEqual(status.items.filter(item=>item.section==='impuestos' && item.party==='vendedor').map(item=>item.key), ['VENDEDOR_BUSQUEDA_NACIONAL','VENDEDOR_LIQUIDACION','VENDEDOR_FORMULARIO_RENTA','VENDEDOR_VOUCHER_RENTA','VENDEDOR_EXONERACION_RENTA','VENDEDOR_LIQUIDACION_MUNICIPAL','VENDEDOR_PAGO_MUNICIPAL','VENDEDOR_CONSTANCIA_NO_ADEUDO_MUNICIPAL']);
  assert.deepEqual(status.items.filter(item=>item.section==='impuestos' && item.party==='comprador').map(item=>item.label), ['Búsqueda nacional','Liquidación del comprador','Voucher de pago de alcabala','Formulario de cancelación de alcabala']);
  assert.ok(!status.items.some(item=>item.key==='COMPRADOR_ALCABALA_DOCUMENTO'));
  assert.equal(DOCUMENT_TYPES.has('COMPRADOR_ALCABALA_DOCUMENTO'),false);
  assert.equal(status.items.find(item=>item.key==='VENDEDOR_EXONERACION_RENTA').applies,false);
});
test('legal seller no payment needs separate exemption and national-search uploads; neither completes the other', () => {
  const config = {...natural(),vendedorTipo:'juridica',renta:'exonerado'};
  const find = (files,key) => dossierStatus(config,files).items.find(item=>item.key===key);
  const exemption = 'VENDEDOR_EXONERACION_RENTA', search = 'VENDEDOR_BUSQUEDA_NACIONAL';
  assert.equal(find([file(search)],exemption).state,'pendiente');
  assert.equal(find([file(exemption)],search).state,'pendiente');
  assert.equal(find([file(search),file(exemption)],search).state,'completo');
  assert.equal(find([file(search),file(exemption)],exemption).state,'completo');
  assert.ok(DOCUMENT_TYPES.has(exemption));
  assert.equal(documentApplies(dossierDocuments.find(item=>item.key===exemption),natural()),false);
});

test('closing needs all applicable uploads, party conditions and an assigned buyer; interim notes do not replace uploads',()=>{
 const config={...natural(),compradorTipo:'juridica',vendedorBusquedaNota:'Nota admitida en preparación',compradorBusquedaNota:'Otra nota'};
 const required=dossierStatus(config).items.filter(item=>item.applies&&item.required);
 const uploads=required.map(item=>file(item.key));
 assert.equal(dossierClosureStatus(config,uploads).complete,true);
 for(const item of required){const incomplete=uploads.filter(row=>row.tipoDocumento!==item.key);assert.equal(dossierClosureStatus(config,incomplete).complete,false,item.key);}
 assert.equal(dossierClosureStatus({...config,compradorAsignado:false},uploads).complete,false);
 const noteOnly=uploads.filter(row=>!row.tipoDocumento.endsWith('_BUSQUEDA_NACIONAL'));
 assert.equal(dossierStatus(config,noteOnly).complete,true);
 assert.equal(dossierClosureStatus(config,noteOnly).complete,true);
 assert.equal(dossierClosureStatus(config,uploads.map(row=>({...row,almacenamiento:'enlace'}))).complete,false);
});


test('rental types are independent, validated and compatible with previously saved conditions', () => {
  const old = dossierDefaults();
  delete old.arrendadorTipo;
  delete old.arrendatarioTipo;
  assert.equal(dossierInput(old).arrendadorTipo, '');
  for (const party of ['arrendador', 'arrendatario']) {
    assert.throws(() => dossierInput({ ...dossierDefaults(), [party + 'Tipo']: 'otra' }));
  }
  for (const arrendadorTipo of ['natural', 'juridica']) for (const arrendatarioTipo of ['natural', 'juridica']) {
    const config = { ...dossierDefaults(), arrendadorTipo, arrendatarioTipo, arrendadorRepresentante: 'no', arrendatarioRepresentante: 'no' };
    assert.deepEqual(dossierInput(config), config);
    const status = dossierStatus(config, [], 'alquiler');
    assert.deepEqual(status.alerts, []);
    for (const party of ['arrendador', 'arrendatario']) {
      const keys = status.items.filter(item => item.party === party && item.applies && item.section === 'identificacion').map(item => item.key);
      const prefix = party.toUpperCase();
      assert.deepEqual(keys, config[party + 'Tipo'] === 'natural' ? [prefix + '_DNI'] : [prefix + '_FICHA_RUC', prefix + '_DNI_GERENTE', prefix + '_PODER_GERENTE', prefix + '_VIGENCIA_GERENTE']);
    }
    const files = status.items.filter(item => item.applies && item.required).map(item => file(item.key));
    assert.equal(dossierClosureStatus(config, files, 'alquiler').complete, true);
    for (const uploaded of files) {
      assert.equal(dossierClosureStatus(config, files.filter(item => item !== uploaded), 'alquiler').complete, false);
    }
  }
});

test('rental requires choosing both person types and preserves documents when types change', () => {
  const config = { ...dossierDefaults(), arrendadorRepresentante: 'no', arrendatarioRepresentante: 'no' };
  const status = dossierStatus(config, [], 'alquiler');
  assert.ok(status.alerts.includes('Seleccionar el tipo de persona del arrendador.'));
  assert.ok(status.alerts.includes('Seleccionar el tipo de persona del arrendatario.'));
  assert.equal(dossierClosureStatus(config, [], 'alquiler').complete, false);
  const files = [file('ARRENDADOR_DNI'), file('VENDEDOR_FICHA_RUC')];
  for (const type of ['natural', 'juridica']) {
    const changed = dossierStatus({ ...config, arrendadorTipo: type }, files, 'alquiler');
    assert.equal(changed.items.find(item => item.key === 'ARRENDADOR_DNI').documents.length, 1);
    assert.equal(changed.items.find(item => item.key === 'ARRENDADOR_FICHA_RUC').documents.length, 1);
  }
  const represented = dossierStatus({ ...config, arrendadorTipo: 'natural', arrendadorRepresentante: 'si' }, [], 'alquiler');
  assert.equal(represented.items.find(item => item.key === 'ARRENDADOR_VIGENCIA_PODER').state, 'pendiente');
});

test('marital exceptions require their own uploaded evidence and preserve inactive files', () => {
  const config = { ...dossierDefaults(), vendedorTipo: 'natural', vendedorPropietarios: 'matrimonio', vendedorRegimen: 'comunes' };
  const legacy = { ...config };
  delete legacy.vendedorExcepcionConyuge;
  assert.equal(dossierInput(legacy).vendedorExcepcionConyuge, 'ninguna');
  assert.throws(() => dossierInput({ ...config, vendedorExcepcionConyuge: 'otra' }));
  for (const [exception, key] of [['compra_soltero', 'VENDEDOR_COMPRA_SOLTERO'], ['herencia', 'VENDEDOR_HERENCIA']]) {
    const selected = { ...config, vendedorExcepcionConyuge: exception };
    assert.equal(dossierInput(selected).vendedorExcepcionConyuge, exception);
    const item = files => dossierStatus(selected, files).items.find(row => row.key === key);
    assert.equal(item([]).state, 'pendiente');
    assert.equal(item([file(key)]).state, 'completo');
    assert.equal(item([{ ...file(key), almacenamiento: 'enlace' }]).state, 'pendiente');
    assert.ok(dossierClosureStatus(selected, []).missing.some(message => message.includes(item([]).label)));
    for (const changed of [{ ...selected, vendedorExcepcionConyuge: 'ninguna' }, { ...selected, vendedorPropietarios: 'uno' }, { ...selected, vendedorRegimen: 'separados' }, { ...selected, vendedorTipo: 'juridica' }]) {
      const inactive = dossierStatus(changed, [file(key)]).items.find(row => row.key === key);
      assert.equal(inactive.state, 'no_aplica');
      assert.equal(inactive.documents.length, 1);
    }
  }
  const separation = config => dossierStatus(config).items.find(row => row.key === 'VENDEDOR_SEPARACION_PATRIMONIAL');
  assert.equal(separation(config).applies, false);
  assert.equal(separation({ ...config, vendedorRegimen: 'separados' }).applies, true);
});

test('manager power appears between identification and validity for every legal party', () => {
  for (const operation of ['venta', 'alquiler']) {
    const config = { ...dossierDefaults(), vendedorTipo: 'juridica', compradorAsignado: true, compradorTipo: 'juridica', arrendadorTipo: 'juridica', arrendatarioTipo: 'juridica' };
    const status = dossierStatus(config, [], operation);
    for (const party of operation === 'venta' ? ['vendedor', 'comprador'] : ['arrendador', 'arrendatario']) {
      const keys = status.items.filter(row => row.party === party && row.applies && row.person === 'juridica' && row.section === 'identificacion').map(row => row.key);
      const prefix = party.toUpperCase();
      assert.deepEqual(keys, ['FICHA_RUC', 'DNI_GERENTE', 'PODER_GERENTE', 'VIGENCIA_GERENTE'].map(key => `${prefix}_${key}`));
      assert.equal(status.items.find(row => row.key === `${prefix}_PODER_GERENTE`).state, 'pendiente');
    }
  }
});

test('plans and catalogue are independently optional and require an uploaded file only when enabled', () => {
  const old = natural();
  delete old.planos;
  delete old.catalogoDiagnostico;
  assert.equal(dossierInput(old).planos, false);
  assert.equal(dossierInput(old).catalogoDiagnostico, false);
  for (const [flag, key] of [['planos', 'PLANO'], ['catalogoDiagnostico', 'CATALOGO_DIAGNOSTICO_FISICO_LEGAL']]) {
    assert.throws(() => dossierInput({ ...natural(), [flag]: 'si' }));
    assert.equal(DOCUMENT_TYPES.has(key), true);
    const initial = natural();
    const item = (config, files = []) => dossierStatus(config, files).items.find(row => row.key === key);
    assert.equal(item(initial).state, 'no_aplica');
    const enabled = { ...initial, [flag]: true };
    assert.equal(dossierInput(enabled)[flag], true);
    assert.equal(item(enabled).state, 'pendiente');
    assert.ok(dossierClosureStatus(enabled).missing.includes(key === 'PLANO' ? 'Plano de distribución o de ubicación referencial' : item(enabled).label));
    assert.equal(item(enabled, [{ ...file(key), almacenamiento: 'enlace' }]).state, 'pendiente');
    const uploads = [{ ...file(key), nombre: 'Archivo 1' }, { ...file(key), nombre: 'Archivo 2' }];
    assert.equal(item(enabled, uploads).state, 'completo');
    assert.equal(item(enabled, uploads).documents.length, 2);
    const disabled = item(initial, uploads);
    assert.equal(disabled.state, 'no_aplica');
    assert.equal(disabled.documents.length, 2);
    assert.equal(dossierStatus(enabled, uploads, 'alquiler').items.find(row => row.key === key).required, false);
  }
  const status = dossierStatus(natural());
  assert.deepEqual(status.sections.slice(-5).map(row => row.label), ['6. Saneamiento físico legal', '7. Tasaciones', '8. Planos', '9. Catálogo y diagnóstico físico legal', '10. Cartas']);
  assert.equal(status.items.find(row => row.key === 'LEVANTAMIENTO_CARGAS').label, 'Saneamiento físico legal');
});

test('contracts follow the agreed sale and rental order and closing requirements', () => {
  const sale = dossierStatus(dossierDefaults()).items.filter(item => item.section === 'contratos');
  assert.deepEqual(sale.map(item => [item.label, item.required]), [
    ['Contrato de Intervención Inmobiliaria', true], ['Estructura de Contrato de Intermediación Inmobiliaria', false], ['Estructura de Contrato Promesa-Venta', false],
    ['Estructura de Minuta', true], ['Contrato de Promesa de Venta', false], ['Minuta', true], ['Escritura Pública', true], ['Otros documentos', false],
  ]);
  const rental = dossierStatus(dossierDefaults(), [], 'alquiler').items.filter(item => item.section === 'contratos');
  assert.deepEqual(rental.map(item => [item.label, item.required]), [
    ['Estructura de Contarto de Intermediación Inmobiliaria', false], ['Contrato de Intervención Inmobiliaria', true],
    ['Estructura de Contrato de Alquiler', true], ['Contrato de Alquiler', true], ['Otros documentos', false],
  ]);
  for (const operation of ['venta', 'alquiler']) {
    const contracts = dossierStatus(dossierDefaults(), [], operation).items.filter(item => item.section === 'contratos' && item.required);
    const uploaded = contracts.flatMap(item => [file(item.key), file(item.key)]);
    const status = dossierStatus(dossierDefaults(), uploaded, operation);
    for (const item of contracts) {
      assert.equal(status.items.find(row => row.key === item.key).documents.length, 2);
      assert.ok(!dossierClosureStatus(dossierDefaults(), uploaded, operation).missing.includes(item.label));
      const without = uploaded.filter(row => row.tipoDocumento !== item.key);
      assert.ok(dossierClosureStatus(dossierDefaults(), without, operation).missing.some(label => label.includes(item.label)));
      assert.ok(dossierClosureStatus(dossierDefaults(), uploaded.map(row => ({ ...row, almacenamiento: 'enlace' })), operation).missing.some(label => label.includes(item.label)));
    }
  }
});
test('existing contracts retain their metadata and map to their new sale and rental categories', () => {
  const files = ['PROMESA_ARRAS', 'MINUTA_COMPRAVENTA', 'MINUTA_COMPRAVENTA', 'ESCRITURA_PUBLICA', 'CONTRATO_ALQUILER'].map((tipoDocumento, i) => ({ ...file(tipoDocumento), id: i + 1, nombre: `Original ${i}`, observacion: `Descripción ${i}`, enlace: `/original/${i}` }));
  const copy = structuredClone(files);
  const sale = dossierStatus(dossierDefaults(), files);
  assert.equal(sale.items.find(item => item.key === 'MINUTA_COMPRAVENTA').documents.length, 2);
  assert.deepEqual(sale.items.find(item => item.key === 'OTROS_CONTRATOS').documents, [files[4]]);
  assert.equal(sale.items.find(item => item.key === 'CONTRATO_INTERVENCION_INMOBILIARIA').complete, false);
  assert.deepEqual(dossierStatus(dossierDefaults(), files, 'alquiler').items.find(item => item.key === 'CONTRATO_ALQUILER').documents, [files[4]]);
  assert.deepEqual(files, copy);
});

test('rental expansion shares folder numbers without adding sale requirements or closure blockers', () => {
  const config = { ...dossierDefaults(), arrendadorTipo:'natural', arrendatarioTipo:'natural', arrendadorRepresentante:'no', arrendatarioRepresentante:'no' };
  const original = dossierStatus(config, [], 'alquiler');
  const enabled = { ...config, cargas:true, planos:true, catalogoDiagnostico:true };
  const expanded = dossierStatus(enabled, [], 'alquiler');
  assert.deepEqual(expanded.sections.map(row=>row.label), dossierStatus(natural()).sections.map(row=>row.label));
  assert.equal(expanded.total, original.total);
  for (const type of ['PROMESA_ARRAS','ESTRUCTURA_PROMESA_VENTA','ESTRUCTURA_MINUTA','MINUTA_COMPRAVENTA','ESCRITURA_PUBLICA','COMPRADOR_ALCABALA','VENDEDOR_FORMULARIO_RENTA','VENDEDOR_EXONERACION_RENTA']) assert.equal(expanded.items.some(item=>item.key===type), false);
  for (const type of ['LEVANTAMIENTO_CARGAS','PLANO','CATALOGO_DIAGNOSTICO_FISICO_LEGAL','OTROS_IMPUESTOS','OTROS_CARGAS']) assert.equal(expanded.items.find(item=>item.key===type).state,'opcional');
  const uploaded = original.items.filter(item=>item.applies&&item.required).map(item=>file(item.key));
  assert.equal(dossierClosureStatus(config,uploaded,'alquiler').complete,true);
  assert.equal(dossierClosureStatus(enabled,uploaded,'alquiler').complete,true);
  assert.deepEqual(dossierClosureStatus(enabled,uploaded,'alquiler').missing, []);
});

test('seller search only blocks closing for no-payment; pending and paying retain files without demanding it', () => {
  for (const vendedorTipo of ['natural','juridica']) for (const renta of ['pendiente','afecto','exonerado']) {
    const config = {...natural(),vendedorTipo,renta,vendedorBusquedaNota:'Nota anterior'};
    const data = dossierStatus(config,[file('VENDEDOR_BUSQUEDA_NACIONAL')]);
    const search = data.items.find(item=>item.key==='VENDEDOR_BUSQUEDA_NACIONAL');
    assert.equal(search.applies,renta==='exonerado');
    assert.equal(search.required,renta==='exonerado');
    assert.equal(search.documents.length,1);
    const requiredFiles = data.items.filter(item=>item.applies&&item.required&&item.key!=='VENDEDOR_BUSQUEDA_NACIONAL').map(item=>file(item.key));
    const closing = dossierClosureStatus(config,requiredFiles);
    assert.equal(closing.missing.includes('Búsqueda nacional · vendedor'),renta==='exonerado');
  }
});

test('buyer composition, marital regime and representation gate independent documents and preserve inactive uploads', () => {
  const definition = key => dossierDocuments.find(item=>item.key===key);
  for (const compradorComposicion of ['pendiente','uno','matrimonio','varios']) for (const compradorRegimen of ['pendiente','comunes','separados']) for (const compradorRepresentante of ['pendiente','si','no']) {
    const config = {...natural(),compradorComposicion,compradorRegimen,compradorRepresentante};
    assert.equal(documentApplies(definition('COMPRADOR_PARTIDA_MATRIMONIAL'),config),compradorComposicion==='matrimonio');
    assert.equal(documentApplies(definition('COMPRADOR_SEPARACION_PATRIMONIAL'),config),compradorComposicion==='matrimonio'&&compradorRegimen==='separados');
    for(const key of ['COMPRADOR_PODER','COMPRADOR_VIGENCIA_PODER']) assert.equal(documentApplies(definition(key),config),compradorRepresentante==='si');
    assert.equal(dossierInput(config).compradorComposicion,compradorComposicion);
  }
  const old = natural();
  for(const key of ['compradorComposicion','compradorRegimen','compradorRepresentante']) { delete old[key]; assert.throws(()=>dossierInput({...natural(),[key]:'invalido'})); }
  const restored = dossierInput(old);
  assert.equal(restored.compradorComposicion,'pendiente'); assert.equal(restored.compradorRepresentante,'pendiente');
  const config = {...natural(),compradorComposicion:'matrimonio',compradorRegimen:'separados',compradorRepresentante:'si'};
  const documents = ['COMPRADOR_DNI','COMPRADOR_PARTIDA_MATRIMONIAL','COMPRADOR_SEPARACION_PATRIMONIAL','COMPRADOR_PODER','COMPRADOR_VIGENCIA_PODER'].map(file);
  const previous = structuredClone(documents);
  for(const change of [{compradorAsignado:false},{compradorTipo:'juridica'},{compradorComposicion:'uno',compradorRepresentante:'no'}]) {
    const status = dossierStatus({...config,...change},documents);
    for(const uploaded of documents) assert.equal(status.items.find(item=>item.key===uploaded.tipoDocumento).documents.length,1);
  }
  assert.deepEqual(documents,previous);
  const uploads = dossierStatus(config).items.filter(item=>item.applies&&item.required).map(item=>file(item.key));
  assert.equal(dossierClosureStatus(config,uploads).complete,true);
  for(const change of [{compradorComposicion:'pendiente'},{compradorRegimen:'pendiente'},{compradorRepresentante:'pendiente'}]) assert.equal(dossierClosureStatus({...config,...change},uploads).complete,false);
  assert.equal(dossierStatus({...natural(),compradorComposicion:'pendiente',compradorRepresentante:'pendiente'}).items.find(item=>item.key==='COMPRADOR_LIQUIDACION').applies,true);
});


test('buyer search never applies to any buyer and preserves inactive files', () => {
  for (const compradorTipo of ['', 'natural', 'juridica']) for (const compradorAsignado of [false, true]) {
    const config = {...natural(), compradorTipo, compradorAsignado};
    const applies = false;
    const item = dossierStatus(config, [file('COMPRADOR_BUSQUEDA_NACIONAL')]).items.find(item => item.key === 'COMPRADOR_BUSQUEDA_NACIONAL');
    assert.equal(item.applies, applies);
    assert.equal(item.documents.length, 1);
    assert.equal(dossierClosureStatus(config).missing.includes('Búsqueda nacional · comprador'), applies);
  }
});
