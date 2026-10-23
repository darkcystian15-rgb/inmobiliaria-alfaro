// Read-only default. Applying requires a reviewed private JSON plan.
import { loadEnvFile } from 'node:process';
import { readFile, writeFile } from 'node:fs/promises';
import mysql from 'mysql2/promise';
import { observationCurrencyHints } from '../lib/appraisal-currency-observations.mjs';
try { loadEnvFile('.env.local'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL.');
const connection = await mysql.createConnection({uri:process.env.DATABASE_URL,...(process.env.DATABASE_SSL_CA || process.env.DATABASE_TLS_REQUIRED === '1' ? {ssl:{...(process.env.DATABASE_SSL_CA ? {ca:process.env.DATABASE_SSL_CA.replace(/\\n/g,'\n')} : {}),rejectUnauthorized:true,verifyIdentity:true}} : {})});
const columns = {valorReferencia:'valor_referencia_moneda',precioObjetivo:'precio_objetivo_moneda',precioVenta:'precio_venta_moneda'};
try {
  const [rows] = await connection.query(`SELECT t.id, t.inmueble_id inmuebleId, i.nombre_contacto contacto,
    t.observacion, i.observaciones observacionInmueble, t.valor_referencia valorReferencia, t.precio_objetivo precioObjetivo, t.precio_venta precioVenta,
    t.valor_referencia_moneda valorReferenciaMoneda, t.precio_objetivo_moneda precioObjetivoMoneda, t.precio_venta_moneda precioVentaMoneda
    FROM inm_tasaciones t JOIN inm_inmuebles i ON i.id=t.inmueble_id ORDER BY t.inmueble_id`);
  const candidates = rows.map(row=>({...row,...observationCurrencyHints([row.observacion,row.observacionInmueble].filter(Boolean).join(". "))})).filter(row=>row.mentionsDollars);
  const planIndex = process.argv.indexOf('--apply-plan');
  if (planIndex < 0) {
    const outputIndex = process.argv.indexOf('--output');
    if (outputIndex < 0 || !process.argv[outputIndex+1]) throw new Error('Indica --output con una ruta privada para revisar los candidatos.');
    await writeFile(process.argv[outputIndex+1],JSON.stringify({createdAt:new Date().toISOString(),candidates},null,2),{mode:0o600,flag:'wx'});
    console.log(`Tasaciones revisadas: ${rows.length}. Candidatos: ${candidates.length}. Informe privado creado; sin cambios.`);
  } else {
    const plan = JSON.parse(await readFile(process.argv[planIndex+1],'utf8'));
    if (!Array.isArray(plan.changes) || !Number.isSafeInteger(plan.actorId)) throw new Error('El plan requiere changes y actorId de administrador.');
    const [actors] = await connection.execute("SELECT id FROM inm_usuarios WHERE id=? AND activo=1 AND rol='administrador'",[plan.actorId]);
    if (!actors.length) throw new Error('Administrador de revisión no válido.');
    await connection.beginTransaction();
    try {
      for (const change of plan.changes) {
        const candidate = candidates.find(row=>row.id===change.id);
        if (!candidate || candidate.observacion!==change.observacion || candidate.observacionInmueble!==change.observacionInmueble || !Array.isArray(change.fields) || !change.fields.length || change.fields.some(field=>!Object.hasOwn(columns,field))) throw new Error('El plan contiene una tasación o campos no válidos.');
        const [locked] = await connection.execute('SELECT * FROM inm_tasaciones WHERE id=? FOR UPDATE',[candidate.id]);
        if (locked[0].observacion!==candidate.observacion || Object.entries(columns).some(([field,column])=>locked[0][column]!==candidate[`${field}Moneda`])) throw new Error('La tasación cambió después de la revisión.');
        await connection.execute(`UPDATE inm_tasaciones SET ${change.fields.map(field=>`${columns[field]}='USD'`).join(',')} WHERE id=?`,[candidate.id]);
        await connection.execute("INSERT INTO inm_timeline (inmueble_id,evento,observacion,usuario_id) VALUES (?,'moneda_tasacion_revisada',?,?)",[candidate.inmuebleId,JSON.stringify({origen:'Revision técnica de observaciones autorizada',tasacionId:candidate.id,campos:change.fields,anterior:Object.fromEntries(change.fields.map(field=>[field,candidate[`${field}Moneda`]])),nuevo:'USD',nota:candidate.observacion}),plan.actorId]);
      }
      await connection.commit();
      console.log(`Monedas corregidas: ${plan.changes.length}. Importes y observaciones conservados.`);
    } catch (error) { await connection.rollback(); throw error; }
  }
} finally { await connection.end(); }
