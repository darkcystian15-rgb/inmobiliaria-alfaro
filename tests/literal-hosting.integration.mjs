// Isolated PHP storage with fictitious files; never reads production credentials.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { signLiteralUpload } from '../lib/literal-upload.mjs';
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'alfaro-literal-'));
const secret = randomBytes(32).toString('hex');
const origin = 'https://intranet.inmobiliariaalbertoalfaro.com.pe';
const previewOrigin = 'https://inmobiliaria-alfarov2-cpbo90tho-puma19.vercel.app';
const endpoint = 'http://127.0.0.1:3169/documentos.php';
const storage = path.join(work, 'private'); fs.mkdirSync(storage);
const config = path.join(work, 'config.php');
fs.writeFileSync(config, `<?php return ['token'=>'${secret}','directory'=>'${storage}','upload_origins'=>['${origin}','${previewOrigin}']];`);
fs.writeFileSync(path.join(work, 'documentos.php'), fs.readFileSync('hosting/documentos.php', 'utf8').replace('/home5/inmobi16/documentos-config.php', config));
const server = spawn('php', ['-d', 'memory_limit=256M', '-S', '127.0.0.1:3169', '-t', work], { stdio: 'ignore' });
const master = { Authorization: `Bearer ${secret}` };
const claims = { filename: 'literal.pdf', nombre: 'Literal ficticia', size: 100 * 1048576, observacion: '', path: 'inmuebles/TEST-posicion-1/copia-literal-cri/test-literal.pdf', type: 'COPIA_LITERAL_CRI', propertyId: 1, userId: 2, expires: Math.floor(Date.now()/1000) + 600 };
const url = endpoint + '?path=' + encodeURIComponent(claims.path);
const signed = changes => ({ Origin: origin, Authorization: `Bearer ${signLiteralUpload({...claims,...changes},secret)}`, 'Content-Type':'application/octet-stream' });
try {
  let started = false;
  for (let i=0;i<50;i++) {
    try { if ((await fetch(endpoint)).status === 401) { started=true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve,100));
  }
  assert.ok(started,'PHP server ready');
  assert.equal((await fetch(endpoint+'?capabilities=1',{headers:master}).then(r=>r.json())).literalUploadVersion,1);
  const options = await fetch(url,{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Headers':'authorization,content-type','Access-Control-Request-Method':'PUT'}});
  assert.equal(options.status,204); assert.equal(options.headers.get('access-control-allow-origin'),origin);
  const previewOptions = await fetch(url,{method:'OPTIONS',headers:{Origin:previewOrigin,'Access-Control-Request-Headers':'authorization,content-type','Access-Control-Request-Method':'PUT'}});
  assert.equal(previewOptions.status,204); assert.equal(previewOptions.headers.get('access-control-allow-origin'),previewOrigin);
  assert.equal((await fetch(url,{method:'OPTIONS',headers:{Origin:'https://evil.invalid'}})).status,403);
  assert.equal((await fetch(url,{method:'OPTIONS',headers:{Origin:'https://untrusted.vercel.app'}})).status,403);
  const body = Buffer.alloc(claims.size,32); body.write('%PDF-1.7\n');
  const result = await fetch(url,{method:'PUT',headers:signed({}),body});
  assert.equal(result.status,201); assert.equal(result.headers.get('access-control-allow-origin'),origin);
  assert.equal((await fetch(url)).status,401);
  assert.equal((await fetch(url,{headers:signed({})})).status,401,'upload token cannot download');
  const stored = await fetch(url,{headers:master}); assert.equal(Number(stored.headers.get('content-length')),body.length);
  assert.deepEqual(Buffer.from(await stored.arrayBuffer()),body);
  assert.equal((await fetch(url,{method:'PUT',headers:signed({}),body})).status,409,'no overwrite');
  assert.equal((await fetch(url,{method:'DELETE',headers:master})).status,204);
  const previewBody = Buffer.from('%PDF-1.7\n');
  const previewUpload = await fetch(url,{method:'PUT',headers:{...signed({size:previewBody.length}),Origin:previewOrigin},body:previewBody});
  assert.equal(previewUpload.status,201); assert.equal(previewUpload.headers.get('access-control-allow-origin'),previewOrigin);
  assert.equal((await fetch(url,{method:'DELETE',headers:master})).status,204);
  for(const changes of [{size:101*1048576},{expires:1},{type:'VENDEDOR_DNI'},{path:'inmuebles/TEST-posicion-1/vendedor-dni/test.pdf'}]) assert.ok([401,403].includes((await fetch(url,{method:'PUT',headers:signed(changes),body:Buffer.from('%PDF-')})).status));
  assert.equal((await fetch(url,{method:'PUT',headers:signed({size:6}),body:Buffer.from('MZ-bad')})).status,400);
  assert.equal((await fetch(url,{method:'PUT',headers:{...master,'Content-Type':'application/octet-stream'},body:Buffer.alloc(100*1048576+1)})).status,413);
  const dniPath = 'inmuebles/TEST-posicion-1/vendedor-dni/test.pdf';
  const dniUrl = endpoint + '?path=' + encodeURIComponent(dniPath);
  assert.equal((await fetch(dniUrl,{method:'PUT',headers:signed({type:'VENDEDOR_DNI',path:dniPath}),body})).status,201);
  assert.equal((await fetch(dniUrl,{method:'DELETE',headers:master})).status,204);
  console.log(JSON.stringify({php:'PASS',literal100MBRoundtrip:true,privateStorage:true,cors:true,restrictedToken:true,allDocuments100MB:true,temporaryFilesRemoved:true}));
} finally { server.kill(); fs.rmSync(work,{recursive:true,force:true}); }
