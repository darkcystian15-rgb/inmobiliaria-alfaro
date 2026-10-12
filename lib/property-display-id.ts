import { propertyCode } from './property-code.mjs';

type PropertyIdentity = {
  id?: number | string | null;
  codigo?: string | null;
  numeroOrden?: number | null;
  posicion?: number | string | null;
  tipo?: string | null;
  nombre?: string | null;
  referencia?: string | null;
  propietario?: string | null;
  propietarioNombres?: string | null;
  propietarioApellidos?: string | null;
};

export function propertyDisplayId(property: PropertyIdentity): string {
  if (property.codigo) return property.codigo;
  if (typeof property.id === 'string' && !/^\d+$/.test(property.id)) return property.id;
  const name = property.nombre || property.referencia || 'Inmueble';
  if (property.numeroOrden) return propertyCode(property.numeroOrden, property.tipo || 'Otros', name);
  return [property.tipo, name].filter(Boolean).join(' · ');
}
