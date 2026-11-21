import { sql } from 'drizzle-orm';
import { inmInmuebles } from '@/db/schema';

// Keep the outer column qualified when Drizzle compiles a single-table selection.
const outerPropertyId = sql`${inmInmuebles.id}`;

// Prefer the active slot; historical files retain their last assigned zone position.
export const propertyLastPosition = sql<number | null>`(SELECT p.numero
  FROM inm_asignaciones_zona a JOIN inm_posiciones_zona p ON p.id=a.posicion_id
  WHERE a.inmueble_id=${outerPropertyId}
  ORDER BY a.activa DESC,a.id DESC LIMIT 1)`;
