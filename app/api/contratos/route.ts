import { NextResponse } from 'next/server';
import { and, asc, eq } from 'drizzle-orm';
import { authorizeApi } from '@/lib/auth';
import { db } from '@/lib/db';
import { inmInmuebles } from '@/db/schema';
import { selectedZone, zoneCondition } from '@/lib/zone-scope';

export async function GET(request: Request) {
  const auth = await authorizeApi(); if (auth.response) return auth.response;
  if (!selectedZone(request)) return NextResponse.json({ error: 'Selecciona una zona de cartera.' }, { status: 400 });
  try {
    const properties = await db.select({ id: inmInmuebles.id, codigo: inmInmuebles.codigo, nombre: inmInmuebles.referencia, direccion: inmInmuebles.direccion, tipo: inmInmuebles.tipo, operacion: inmInmuebles.operacion }).from(inmInmuebles).where(and(eq(inmInmuebles.estado, 'activo'), zoneCondition(request))).orderBy(asc(inmInmuebles.numeroOrden), asc(inmInmuebles.id));
    return NextResponse.json({ properties }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return NextResponse.json({ error: 'No se pudo consultar la cartera.' }, { status: 500 }); }
}
