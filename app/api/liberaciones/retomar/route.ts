import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { authorizeApi } from '@/lib/auth';
import { selectedZone, zoneCondition } from '@/lib/zone-scope';
import { inmAsignacionesPosicion, inmInmuebles, inmLiberaciones, inmPosiciones, inmTimeline } from '@/db/schema';

// Reactivation preserves the original property and all its operational records.
export async function POST(request: Request) {
  const auth = await authorizeApi(request);
  if (auth.response) return auth.response;
  if (!selectedZone(request)) return NextResponse.json({ error: 'Selecciona la zona de la venta suspendida.' }, { status: 400 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Solicitud no válida.' }, { status: 400 }); }
  if (!body || !Number.isSafeInteger(body.inmuebleId) || body.inmuebleId < 1 || !Number.isSafeInteger(body.posicionId) || body.posicionId < 1 || body.confirmacion !== 'RETOMAR') {
    return NextResponse.json({ error: 'Selecciona inmueble y posición disponible y confirma el retorno.' }, { status: 400 });
  }
  try {
    await db.transaction(async tx => {
      const [property] = await tx.select().from(inmInmuebles).where(and(eq(inmInmuebles.id, body.inmuebleId), zoneCondition(request))).limit(1).for('update');
      if (!property || property.operacion !== 'venta' || property.estado !== 'inactivo') throw new Error('La ficha debe ser una venta suspendida de esta zona.');
      const [suspension] = await tx.select().from(inmLiberaciones).where(and(eq(inmLiberaciones.inmuebleId, property.id), eq(inmLiberaciones.motivo, 'venta_suspendida'), eq(inmLiberaciones.confirmado, true), eq(inmLiberaciones.anulada, false))).limit(1).for('update');
      if (!suspension) throw new Error('Solo se pueden retomar ventas suspendidas por el propietario.');
      const [position] = await tx.select().from(inmPosiciones).where(and(eq(inmPosiciones.id, body.posicionId), eq(inmPosiciones.zonaId, property.zonaId!), eq(inmPosiciones.activo, true))).limit(1).for('update');
      if (!position) throw new Error('Selecciona una posición disponible de la misma zona.');
      const [occupied] = await tx.select({ id: inmAsignacionesPosicion.id }).from(inmAsignacionesPosicion).where(and(eq(inmAsignacionesPosicion.posicionId, position.id), eq(inmAsignacionesPosicion.activa, true))).limit(1).for('update');
      const [assigned] = await tx.select({ id: inmAsignacionesPosicion.id }).from(inmAsignacionesPosicion).where(and(eq(inmAsignacionesPosicion.inmuebleId, property.id), eq(inmAsignacionesPosicion.activa, true))).limit(1).for('update');
      if (occupied || assigned) throw new Error('La posición está ocupada o el inmueble ya tiene una posición activa. Actualiza la cartera.');
      const now = new Date();
      await tx.insert(inmAsignacionesPosicion).values({ inmuebleId: property.id, posicionId: position.id, activa: true });
      // Conclude the suspension without deleting its evidence or treating it as a sale.
      await tx.update(inmLiberaciones).set({ anulada: true, fechaAnulacion: now }).where(eq(inmLiberaciones.id, suspension.id));
      await tx.update(inmInmuebles).set({ estado: 'activo', fechaSalida: null }).where(eq(inmInmuebles.id, property.id));
      await tx.insert(inmTimeline).values({ inmuebleId: property.id, usuarioId: auth.user.id, evento: 'venta_retomada', observacion: `Venta retomada desde Histórico en posición ${position.numero}. Suspensión ${suspension.id} finalizada; se conservan ficha, documentos, precios y antecedentes. Revisar vigencia de precios y condiciones antes de publicar.` });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const code = (error as { code?: string; cause?: { code?: string } }).cause?.code ?? (error as { code?: string }).code;
    if (code) {
      console.error('Retorno de venta fallido:', code);
      return NextResponse.json({ error: 'No se pudo reservar la posición. Actualiza la cartera e inténtalo nuevamente.' }, { status: code === 'ER_DUP_ENTRY' || code === 'ER_LOCK_DEADLOCK' ? 409 : 500 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo retomar la venta.' }, { status: 409 });
  }
}
