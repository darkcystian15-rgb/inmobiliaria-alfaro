export async function deletePortalProperty(sourceId: number, revision: number) {
  const endpoint=new URL(process.env.PORTAL_WEB_SYNC_URL || '');
  if(endpoint.protocol!=='https:' && !(['localhost','127.0.0.1'].includes(endpoint.hostname)&&['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL!).hostname)))throw Error('Portal no configurado.');
  const response=await fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${process.env.PORTAL_WEB_SYNC_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({kind:'property',sourceId,revision,status:'deleted'}),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(25000)});
  if(!response.ok)throw Error('El portal no confirmó la eliminación.');
  const body=await response.json();
  if(body.deleted!==true||body.sourceId!==sourceId)throw Error('Confirmación de eliminación no válida.');
}
