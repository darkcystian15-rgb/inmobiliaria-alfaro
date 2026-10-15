export const baseZones = [
  { nombre: 'Chimbote', capacidad: 50 },
  { nombre: 'Nuevo Chimbote', capacidad: 90 },
  { nombre: 'Tortugas', capacidad: 20 },
];
export function zoneKey(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();
}
export function zoneName(value) {
  const cleaned = String(value ?? '').trim().replace(/\s+/g, ' ');
  const key = zoneKey(cleaned);
  if (['nvo chimbote', 'nvo. chimbote', 'nuevo chimbote'].includes(key)) return 'Nuevo Chimbote';
  return baseZones.find(z => zoneKey(z.nombre) === key)?.nombre || cleaned;
}
export function planZones(properties, assignments, positions, missingZone) {
  const zones = new Map(baseZones.map(z => [zoneKey(z.nombre), { ...z }]));
  const mapped = properties.map(property => {
    const name = zoneName(property.distrito || missingZone);
    if (!name) throw Error('Hay inmuebles sin zona. Indica explícitamente --missing-zone.');
    const key = zoneKey(name);
    if (!zones.has(key)) zones.set(key, { nombre: name, capacidad: 10 });
    return { id: Number(property.id), zona: zones.get(key).nombre, active: property.estado === 'activo' };
  });
  const pos = new Map(positions.map(p => [Number(p.id), Number(p.numero)]));
  const active = new Map();
  for (const a of assignments.filter(a => Number(a.activa))) {
    if (active.has(Number(a.inmueble_id))) throw Error('Un inmueble tiene más de una asignación activa.');
    active.set(Number(a.inmueble_id), a);
  }
  const propertyIds = new Set(mapped.map(p => p.id));
  if (assignments.some(a => !propertyIds.has(Number(a.inmueble_id)) || !pos.has(Number(a.posicion_id)))) throw Error('Hay referencias de asignaciones incompletas.');
  for (const p of mapped.filter(p => !p.active)) if (active.has(p.id)) throw Error('Hay una ficha histórica con posición activa.');
  const allocations = [];
  for (const z of zones.values()) {
    const rows = mapped.filter(p => p.zona === z.nombre && p.active).sort((a,b) => a.id-b.id);
    if (rows.length > z.capacidad) throw Error(`La zona ${z.nombre} tiene ${rows.length} activos y admite ${z.capacidad}. No se aplicó la adaptación.`);
    const used = new Set();
    for (const p of rows) {
      const previous = pos.get(Number(active.get(p.id)?.posicion_id));
      if (previous && previous <= z.capacidad && !used.has(previous)) { used.add(previous); allocations.push({ inmuebleId:p.id,zona:z.nombre,numero:previous,previous:previous ?? null }); }
    }
    for (const p of rows.filter(p => !allocations.some(a => a.inmuebleId===p.id))) {
      const number=Array.from({length:z.capacidad},(_,i)=>i+1).find(n=>!used.has(n));
      used.add(number);allocations.push({inmuebleId:p.id,zona:z.nombre,numero:number,previous:pos.get(Number(active.get(p.id)?.posicion_id))??null});
    }
  }
  return {zones:[...zones.values()],properties:mapped,allocations};
}
