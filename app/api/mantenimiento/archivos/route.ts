import {timingSafeEqual} from 'node:crypto';
import {NextResponse} from 'next/server';
import {pool} from '@/lib/db';
import type {RowDataPacket} from 'mysql2/promise';
import {cleanFileJob} from '@/lib/data-integrity.mjs';
import {finishDeletion} from '@/lib/property-deletion.mjs';
import {hostingRequest} from '@/lib/document-hosting';
import {deletePortalProperty} from '@/lib/portal-deletion';
export const maxDuration=120;
export async function GET(request:Request){
 const expected=Buffer.from(`Bearer ${process.env.CRON_SECRET||''}`),actual=Buffer.from(request.headers.get('authorization')||'');
 if(!process.env.CRON_SECRET||actual.length!==expected.length||!timingSafeEqual(actual,expected))return new NextResponse(null,{status:401});
 const started=Date.now();let completed=0,pending=0;
 const connection=await pool.getConnection();
 try{
  const [jobs]=await connection.query<RowDataPacket[]>('SELECT id FROM inm_tareas_archivos WHERE expira<=NOW() ORDER BY expira LIMIT 30');
  for(const job of jobs){if(Date.now()-started>20000)break;try{if(await cleanFileJob(connection,job.id,async(path:string)=>{await hostingRequest('DELETE',path);}))completed++;}catch{pending++;}}
  const [deletions]=await connection.query<RowDataPacket[]>("SELECT e.id,z.nombre zona FROM inm_eliminaciones_pendientes e JOIN inm_zonas z ON z.id=e.zona_id WHERE e.estado IN ('portal','archivos') ORDER BY e.creado LIMIT 10");
  for(const job of deletions){if(Date.now()-started>25000)break;try{if(await finishDeletion(connection,job.zona,job.id,async(path:string)=>{await hostingRequest('DELETE',path);},deletePortalProperty))completed++;else pending++;}catch{pending++;}}
  return NextResponse.json({ok:true,completed,pending});
 }finally{connection.release();}
}
