import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import test from 'node:test';
import { MySqlDialect } from 'drizzle-orm/mysql-core';
import { build } from 'esbuild';

const output = 'output/intermediation-models';
await mkdir(output, { recursive: true });
const boundaries = {
  'server-only': '',
  '@/lib/auth': 'export async function authorizeApi() { return globalThis.modelsAuth; }',
  '@/lib/db': 'export const db = globalThis.modelsDb;',
  '@/lib/data-integrity-service': 'export async function assertWritable() { if (globalThis.modelsClosed) throw Error("El expediente está cerrado."); }',
  '@/lib/document-hosting': 'export function hostingRequest() { throw Error("Unexpected hosting request"); }',
  '@/lib/property-identity': 'export function propertyIdentifierCondition(id) { return id; }',
  '@/lib/property-position': 'export const propertyLastPosition = null;',
  '@/lib/zone-scope': 'export const propertyZoneName = null;',
  '@/lib/document-analysis.mjs': 'export const MAX_DOCUMENT_BYTES = 1; export function analyzeDocument() { throw Error("Unexpected analysis"); }',
};
await build({
  entryPoints: ['app/api/inmuebles/[id]/intermediacion/route.ts'],
  outfile: output + '/api.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  plugins: [{ name: 'boundaries', setup(builder) {
    builder.onResolve({ filter: /./ }, args => Object.hasOwn(boundaries, args.path) ? { path: args.path, namespace: 'mock' } : null);
    builder.onLoad({ filter: /./, namespace: 'mock' }, args => ({ contents: boundaries[args.path] }));
  } }],
});

const drafts = new Map();
const dialect = new MySqlDialect();
globalThis.modelsDb = {
  select() {
    let rows;
    return {
      from(table) { this.table = table[Symbol.for('drizzle:Name')]; return this; },
      where(condition) {
        const params = dialect.sqlToQuery(condition).params;
        if (this.table === 'inm_inmuebles') rows = [{ id: Number(params[0]) }];
        else {
          const [user, ...keys] = params;
          rows = [...drafts.values()].filter(row => row.usuarioId === user
            && keys.some(key => key.endsWith('%') ? row.clave.startsWith(key.slice(0, -1)) : row.clave === key))
            .map(row => ({ key: row.clave, name: JSON.parse(row.contenido).name, content: row.contenido }));
        }
        return this;
      },
      async limit() { return rows; },
      async orderBy() { return rows; },
    };
  },
  delete() {
    return { async where(condition) {
      const [user, key] = dialect.sqlToQuery(condition).params;
      drafts.delete(`${user}:${key}`);
    } };
  },
  insert() {
    return { values(row) {
      const store = async () => drafts.set(`${row.usuarioId}:${row.clave}`, row);
      return { then: (resolve, reject) => store().then(resolve, reject), onDuplicateKeyUpdate: store };
    } };
  },
};

const api = await import('../' + output + '/api.mjs');
const original = await readFile('assets/intermediacion/alquiler.docx');
const edited = await readFile('assets/intermediacion/venta.docx');
function call(method, usage, { property = 1, operation = 'alquiler', id, file, name = 'Modelo propio.docx', userId = 7 } = {}) {
  globalThis.modelsAuth = { user: { id: userId }, response: null };
  const url = new URL(`https://example.test/api/inmuebles/${property}/intermediacion?operacion=${operation}&uso=${usage}`);
  if (id) url.searchParams.set('modelo', id);
  const form = new FormData();
  if (file) form.append('archivo', new File([file], name));
  const request = new Request(url, { method, ...(method === 'PUT' && { body: form }) });
  return api[method](request, { params: Promise.resolve({ id: String(property) }) });
}

test('carga un Word, lo lista por usuario y operación y conserva el borrador por inmueble', async () => {
  assert.equal((await call('PUT', 'modelos', { file: 'archivo inválido' })).status, 400);
  const upload = await call('PUT', 'modelos', { file: original });
  assert.equal(upload.status, 200);
  const model = await upload.json();
  assert.deepEqual(await (await call('GET', 'modelos', { property: 2 })).json(), { models: [model] });
  assert.deepEqual(await (await call('GET', 'modelos', { operation: 'venta' })).json(), { models: [] });
  assert.deepEqual(await (await call('GET', 'modelos', { userId: 8 })).json(), { models: [] });
  assert.equal((await call('GET', 'modelo', { id: model.id, userId: 8 })).status, 404);

  const id = model.id;
  assert.deepEqual(Buffer.from(await (await call('GET', 'borrador', { id })).arrayBuffer()), original);
  const save = await call('PUT', 'borrador', { id, file: edited, name: 'Borrador de la ficha.docx' });
  assert.equal(save.status, 200);
  const reopened = await call('GET', 'borrador', { id });
  assert.match(reopened.headers.get('content-disposition'), /Borrador%20de%20la%20ficha/);
  assert.deepEqual(Buffer.from(await reopened.arrayBuffer()), edited);
  assert.deepEqual(Buffer.from(await (await call('GET', 'borrador', { id, property: 2 })).arrayBuffer()), original);
  assert.deepEqual(Buffer.from(await (await call('GET', 'modelo', { id })).arrayBuffer()), original);

  globalThis.modelsClosed = true;
  assert.equal((await call('PUT', 'borrador', { id, file: original })).status, 409);
  globalThis.modelsClosed = false;
  assert.equal((await call('DELETE', 'modelos', { id: 'base' })).status, 400);
  assert.equal((await call('DELETE', 'modelos', { id, userId: 8 })).status, 204);
  assert.equal((await call('GET', 'modelo', { id })).status, 200);
  assert.equal((await call('DELETE', 'modelos', { id, operation: 'venta' })).status, 204);
  assert.equal((await call('GET', 'modelo', { id })).status, 200);
  assert.equal((await call('DELETE', 'modelos', { id })).status, 204);
  assert.equal((await call('GET', 'modelo', { id })).status, 404);
  assert.deepEqual(await (await call('GET', 'modelos', { property: 2 })).json(), { models: [] });
  assert.deepEqual(await (await call('GET', 'modelos')).json(),
    { models: [{ id, name: 'Borrador de la ficha', draftOnly: true }] });
  assert.deepEqual(Buffer.from(await (await call('GET', 'borrador', { id })).arrayBuffer()), edited);
  assert.equal((await call('PUT', 'borrador', { id, file: original })).status, 200);
});

test('el modelo base sigue disponible como Word', async () => {
  const model = await call('GET', 'modelo');
  assert.equal(model.status, 200);
  assert.match(model.headers.get('content-disposition'), /Modelo%20de%20contrato/);
  assert.equal(Buffer.from(await model.arrayBuffer()).subarray(0, 2).toString(), 'PK');
});
