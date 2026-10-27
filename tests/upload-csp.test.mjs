import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const { NextRequest } = require('next/server');
const filename = new URL('../proxy.ts', import.meta.url).pathname;
const compiled = new Module(filename);
compiled.filename = filename;
compiled.paths = Module._nodeModulePaths(new URL('..', import.meta.url).pathname);
compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename);
const { proxy } = compiled.exports;

test('entry pages allow direct uploads after client navigation to property details', () => {
  const previous = process.env.DOCUMENT_HOSTING_URL;
  try {
    for (const endpoint of ['https://media.example.com/documentos.php', 'http://media.example.com/documentos.php', 'https://user:secret@media.example.com/documentos.php', 'invalid']) {
      process.env.DOCUMENT_HOSTING_URL = endpoint;
      for (const path of ['/login', '/cartera', '/datos-inmuebles']) {
        const response = proxy(new NextRequest(`https://intranet.example.com${path}`, { headers: { cookie: 'aa_session=test' } }));
        const csp = response.headers.get('Content-Security-Policy');
        const connect = csp.split(';').find(value => value.trim().startsWith('connect-src'));
        assert.equal(connect.trim(), endpoint === 'https://media.example.com/documentos.php' ? "connect-src 'self' https://media.example.com" : "connect-src 'self'", `${path}: ${endpoint}`);
      }
    }
  } finally {
    if (previous === undefined) delete process.env.DOCUMENT_HOSTING_URL;
    else process.env.DOCUMENT_HOSTING_URL = previous;
  }
});
