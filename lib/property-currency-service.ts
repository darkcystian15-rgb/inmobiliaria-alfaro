import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { inmInmuebles, inmTasaciones, inmLiberaciones, inmAnuncios, inmTimeline } from '@/db/schema';
import { parseCurrency } from '@/lib/prices.mjs';
import { propertyCurrency } from '@/lib/property-currency.mjs';

type Executor = Pick<typeof db, 'select' | 'update' | 'insert' | 'execute'>;
export async function synchronizePropertyCurrency(executor: Executor, id: number, currency: string, user: number) {
  if (!parseCurrency(currency)) throw Error('Selecciona soles o dólares.');
  const [property] = await executor.select().from(inmInmuebles).where(eq(inmInmuebles.id,id)).limit(1).for('update');
  if (!property || property.estado !== 'activo') throw Error('El inmueble ya no está activo.');
  const [appraisal] = await executor.select().from(inmTasaciones).where(eq(inmTasaciones.inmuebleId,id)).limit(1).for('update');
  const closures = await executor.select().from(inmLiberaciones).where(eq(inmLiberaciones.inmuebleId,id));
  const ads = await executor.select().from(inmAnuncios).where(eq(inmAnuncios.inmuebleId,id));
  const key=`draft:${id}`;
  const [drafts] = await executor.execute(sql`SELECT contenido,version FROM inm_portal_web WHERE clave=${key} FOR UPDATE`) as unknown as [{contenido:string|{draft:Record<string,unknown>};version:number}[],unknown];
  const stored = drafts[0] ? (typeof drafts[0].contenido === 'string' ? JSON.parse(drafts[0].contenido) : drafts[0].contenido) as {draft:Record<string,unknown>;sourceRevision:string} : null;
  const mismatched = propertyCurrency(property,appraisal) !== currency || (appraisal && [appraisal.valorReferenciaMoneda,appraisal.precioObjetivoMoneda,appraisal.precioVentaMoneda].some(value=>value!==currency)) || ads.some(row=>row.precioPublicadoMoneda!==currency) || closures.some(row=>(row.moneda??'PEN')!==currency) || (stored && stored.draft.currency!==currency);
  await executor.update(inmInmuebles).set({moneda:currency}).where(eq(inmInmuebles.id,id));
  await executor.update(inmTasaciones).set({valorReferenciaMoneda:currency,precioObjetivoMoneda:currency,precioVentaMoneda:currency}).where(eq(inmTasaciones.inmuebleId,id));
  await executor.update(inmLiberaciones).set({moneda:currency}).where(eq(inmLiberaciones.inmuebleId,id));
  await executor.update(inmAnuncios).set({precioPublicadoMoneda:currency}).where(eq(inmAnuncios.inmuebleId,id));
  if (stored && stored.draft.currency!==currency) {
    stored.draft={...stored.draft,currency,dataAuthorized:false,photosAuthorized:false};
    await executor.execute(sql`UPDATE inm_portal_web SET contenido=${JSON.stringify(stored)},version=${Number(drafts[0].version)+1},usuario_id=${user} WHERE clave=${key}`);
  }
  if (mismatched || property.moneda!==currency) await executor.insert(inmTimeline).values({inmuebleId:id,usuarioId:user,evento:'moneda_uniformizada',observacion:JSON.stringify({monedaAnterior:property.moneda,tasacionAnterior:appraisal, cierresAnteriores:closures,anunciosAnteriores:ads,moneda:currency,conversionAutomatica:false,nota:'Los importes se conservan; la conversión, si corresponde, se ingresa manualmente. El anuncio público conserva su versión enviada hasta volver a publicarlo.'})});
  return currency;
}
