import assert from 'node:assert/strict';
import { test } from 'node:test';
import JSZip from 'jszip';
import { intermediationPrompt, intermediationProposals, normalizeIntermediation } from '../lib/intermediation.mjs';
import { intermediationWord } from '../lib/intermediation-word.ts';
import { intermediationIntranetPrompt } from '../lib/intermediation-intranet-prompt.mjs';

test('el prompt de Info 4 usa los datos del inmueble y refiere los documentos del expediente', () => {
  const prompt = intermediationIntranetPrompt({
    zona: 'Centro', numero: 12, tipo: 'Local', direccion: 'Av. Prueba 123/125', contacto: 'Ana Pérez',
  });
  assert.match(prompt, /^ZONA   Centro +\(.*\nINMUEBLE NUMERO  12 +\(/m);
  assert.match(prompt, /1\. DNI Y PODERES[\s\S]*2\. DOCUMENTOS DEL INMUEBLE[\s\S]*3\. CONTRATOS/);
  assert.match(prompt, /ESTRUCTURA DE CONTRATO DE INTERMEDIACIÓN INMOBILIARIA/);
  assert.match(prompt, /CONTRATO DE INTERMEDIACIÓN INMOBILIARIA \( TIPO DE INMUEBLE \) \(DIRECCION \) \(CONTACTO \)/);
  assert.doesNotMatch(prompt, /usuario|contraseña/i);
  assert.match(intermediationIntranetPrompt({}, 'clave-de-prueba'), /USANDO EL  USUARIO: administrador \/ CONTRASEÑA: clave-de-prueba/);
  assert.match(intermediationIntranetPrompt({}), /^ZONA   XXXXXX +\(.*\nINMUEBLE NUMERO  XXXXXX +\(/m);
});

test('proposes labeled fields from identity and registry text', () => {
  assert.deepEqual(intermediationProposals('ARRENDADOR_DNI', 'APELLIDOS Y NOMBRES: MARÍA PRUEBA GARCÍA\nDNI N.° 12345678'), [
    { key: 'nombre', value: 'MARÍA PRUEBA GARCÍA' }, { key: 'documento', value: '12345678' },
  ]);
  assert.deepEqual(intermediationProposals('COPIA_LITERAL_CRI', 'PARTIDA REGISTRAL N.º P12345678\nÁrea de terreno: 92,10 m²\nUbicación: Calle de prueba\nPor el frente: con calle X').map(item => item.key),
    ['partida', 'area', 'ubicacion', 'linderos']);
  assert.ok(intermediationProposals('ARRENDADOR_PODER', 'APODERADO: MARÍA PRUEBA GARCÍA\nDNI 12345678\nASIENTO: A00001').some(item => item.key === 'representante'));
});

test('recognizes registry numbers with alternative abbreviations and spacing', () => {
  for (const label of ['N°', 'N. °', 'No.', 'Numero', 'NRO.']) {
    assert.deepEqual(
      intermediationProposals('COPIA_LITERAL_CRI', `Partida electrónica ${label}:\n01234567`),
      [{ key: 'partida', value: '01234567' }],
    );
  }
  assert.deepEqual(intermediationProposals('COPIA_LITERAL_CRI', 'Partida electrónica\nTítulo N.° 01234567'), []);
});

test('reads the SUNARP property header and lot dimensions from OCR text', () => {
  const text = [
    'Zona Registral N* VII - Sede Huaraz',
    'PROGRAMA DE VIVIENDA SECTOR 5A',
    'P01234567',
    'DPTO: ANCASH PROV: SANTA DIST: NUEVO CHIMBOTE',
    'Asiento: 00001 Antecedente Registral: P07654321',
    'MEDIDAS DEL LOTE SEGUN PLANO DE TRAZADO Y LOTIZACION (ACTUAL)',
    'Area Piso Lado Frente Fondo Derecha Izquierda E',
    '147.000 OL 7.000 7.000 21.000 21.000 E',
    'DE LA PARTIDA MATRIZ N*2',
  ].join('\n');
  assert.deepEqual(intermediationProposals('COPIA_LITERAL_CRI', text), [
    { key: 'partida', value: 'P01234567' },
    { key: 'area', value: '147.000 m²' },
    { key: 'linderos', value: 'Frente: 7.000 m; Fondo: 7.000 m; Derecha: 21.000 m; Izquierda: 21.000 m' },
  ]);
});

test('Word and prompt share the reviewed data, IGV, four months and pending placeholders', async () => {
  const draft = {
    owners: [{ nombre: 'Empresa & Asociados', documento: 'RUC 11111111111', representante: 'Representante de prueba' },
      { nombre: 'Segunda persona', documento: 'DNI 11111111' }, { nombre: 'Tercera persona' }],
    plots: [{ partida: 'P12345678', ubicacion: 'Calle <Prueba>' }, { partida: 'P23456789', area: '92,10 m²' }],
    term: '06', rent: '1500.50', currency: 'PEN', date: '2026-11-18', city: 'Ciudad de prueba',
  };
  const item = { tipo: 'local', direccion: 'Calle de prueba', contacto: 'Contacto de prueba', zona: 'Zona de prueba', numero: 10 };
  const zip = await JSZip.loadAsync(await intermediationWord(draft));
  const xml = await zip.file('word/document.xml').async('string');
  const paragraphs = Array.from(xml.matchAll(/<w:t(?:\s[^>]*)?>(.*?)<\/w:t>/gs), match => match[1]).join('');
  const prompt = intermediationPrompt(draft, item);
  for (const text of [paragraphs, prompt]) {
    assert.match(text, /más IGV/i);
    assert.match(text, /cuatro \(4\) meses/i);
    assert.match(text, /P12345678/);
    assert.match(text, /P23456789/);
    assert.match(text, /Tercera persona/);
    assert.match(text, /XXXXX/);
  }
  assert.equal((xml.match(/<w:tr(?:\s[^>]*)?>/g) || []).length, 2);
  assert.ok(zip.file('word/media/logo.png'));
  assert.match(xml, /Empresa &amp; Asociados/);
  assert.match(xml, /Calle &lt;Prueba&gt;/);
  assert.doesNotMatch(xml, /\[\[[A-Z_]+\]\]|VASQUEZ DEL CARPIO|397\.10|TREINTA MIL/);
  for (const heading of ['ANTECEDENTES', 'OBJETO', 'EXCLUSIVIDAD', 'PRECIO DE CIERRE', 'CONTRAPRESTACIÓN', 'VIGENCIA DEL ACUERDO', 'CONFORMIDAD']) assert.ok(paragraphs.includes(heading));
  assert.equal(normalizeIntermediation({ date: '2026-02-30', rent: 7 }).date, 'XXXXX');
  assert.equal(normalizeIntermediation({ date: '2026-02-30', rent: 7 }).rent, 'XXXXX');
});

test('sale uses its own numbered template, negotiable price, percentage and institutional watermark', async () => {
  const draft = {
    owners: [{ nombre: 'Persona de prueba', domicilio: 'Calle de prueba' }, { nombre: 'Segunda Persona' }],
    plots: [{ partida: 'P12345678' }, { partida: 'P23456789' }],
    term: '8', rent: '150000', currency: 'USD', commission: '3.5',
  };
  const item = { tipo: 'local', direccion: 'Calle de prueba', zona: 'Zona de prueba', numero: 1 };
  const zip = await JSZip.loadAsync(await intermediationWord(draft, 'venta'));
  const xml = await zip.file('word/document.xml').async('string');
  const header = await zip.file('word/header1.xml').async('string');
  const prompt = intermediationPrompt(draft, item, 'venta');
  for (const text of [xml, prompt]) {
    assert.match(text, /3\.5 %/);
    assert.match(text, /más IGV/i);
    assert.match(text, /cuatro \(4\) meses/i);
    assert.match(text, /escritura de compraventa/i);
    assert.match(text, /P23456789/);
    assert.match(text, /Calle de prueba/);
  }
  const titles = [
    'PRIMERO: ANTECEDENTES', 'SEGUNDO: OBJETO', 'TERCERO: MODALIDAD DE CONTRATO',
    'CUARTO: PRECIO DE VENTA', 'QUINTO: CONTRAPRESTACIÓN', 'SEXTO: VIGENCIA DEL ACUERDO',
  ];
  let offset = 0;
  for (const title of titles) {
    assert.ok(xml.indexOf(title, offset) >= offset, title);
    offset = xml.indexOf(title, offset) + title.length;
  }
  assert.match(header, /w:val="right"/);
  assert.match(header, /behindDoc="1"/);
  assert.ok(zip.file('word/media/marca-de-agua.png'));
  assert.doesNotMatch(xml, /\[\[[A-Z_]+\]\]|CASUARINAS|Incluido IGV|320,000/);
  assert.match(intermediationPrompt({}, item, 'venta'), /XXXXX % del precio final/);
});

test('uses the lot header on continuation pages and excludes explicit registry antecedents', () => {
  for (const text of [
    'P01234567\nDPTO: ANCASH PROV: SANTA DIST: NUEVO CHIMBOTE\nProviene de la partida N.º P07654321',
    'Partida registral N.º P01234567\nAntecedente registral: partida electrónica N.º P07654321',
    'Partida electrónica N* P01234567\nPartida electrónica N.º P07654321 (matriz)',
  ]) {
    assert.deepEqual(intermediationProposals('COPIA_LITERAL_CRI', text).filter(item => item.key === 'partida'), [
      { key: 'partida', value: 'P01234567' },
    ]);
  }
  assert.deepEqual(intermediationProposals('COPIA_LITERAL_CRI',
    'Partida electrónica N.º P01234567\nPartida electrónica N.º P07654321').map(item => item.value), ['P01234567', 'P07654321']);
});
