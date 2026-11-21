export const referencePlanModelUrl = '/api/planos/modelo';
export const planTypes = ['PLANO', 'PLANO_UBICACION_REFERENCIAL', 'MODELO_PLANO_UBICACION_REFERENCIAL'];
export const registrySourceTypes = ['COPIA_LITERAL_CRI', 'COPIA_LITERAL', 'DOCUMENTO_PROPIEDAD'];

export function referencePlanPrompt(item, password = '') {
  const value = text => String(text ?? '').trim() || 'XXXXXX';
  const filename = ['PLANO DE UBICACIÓN REFERENCIAL', value(item.tipo), value(item.direccion), value(item.contacto)]
    .join(' ').replace(/[\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim();

  return `PROMPT INTRANET PARA PLANO REFERENCIAL DE LOTE

INGRESA A  :
SISTEMA DE INTRANET DE INMOBILIARIA ALBERTO ALFARO,
${password ? `USANDO EL  USUARIO: administrador / CONTRASEÑA: ${password}` : 'USANDO TU SESIÓN AUTORIZADA DE LA INTRANET.'}
INGRESA A FASE 2
FICHA, DOCUMENTOS Y FOTOS
ZONA   ${value(item.zona)}       ( ESTA ZONA DEBE SALIR AUTOMATICAMENTE SEGÚN EL INMUEBLE QUE ESTAMOS TRABLAJANDO)  ,
INMUEBLE NUMERO  ${value(item.numero)}       ( EL NUMERO APARECE AUTOMATICAMENTE SEGÚN EL INMUEBLE QUE ESTAMOS TRABAJANDO ).

INGRESA A CARPETAS DEL INMUEBLE

PRIMERO INGRESA AL PUNTO :
2. DOCUMENTOS DEL INMUEBLE
Y ALLI ENCONTRARAS LA COPIA LITERAL O EL CRI DEL PREDIO CON TODOS LOS DATOS,
COMO ÁREA , LINDEROS.

LUEGO INGRESA A PUNTO :
8. PLANOS
ALLI ENCONTRARÁS EL ARCHIVO LLAMADO :  MODELO PLANO DE UBICACION REFERENCIAL

QUIERO QUE ELABORES UN PLANO DE UBICACIÓN REFERENCIAL DEL INMUEBLE SOLICITADO , USANDO EL GOOGLE MAPS.  AL  ARCHIVO LE LLAMARAS  :
${filename}  , EJEMPLO :   PLANO DE UBICACIÓN REFERENCIAL  LOCAL  AV MEIGGS JOSE RAMON LEYTON

PARA ELABORAR ESTE PLANO , VAS A USAR COMO MODELO EL ARCHIVO LLAMADO : MODELO DE PLANO UBICACIÓN REFERENCIAL ( UBICADO EN EL PUNTO 8. PLANOS )  ,  RESPETANDO TODAS Y CADA UNA DE LAS CARACETERISTICAS DE ESTE MODELO COMO SON :  FORMA VERTICAL , TIPO Y COLOR DEL ACHURADO O PINTADO DEL INMUEBLE , TIPO DE ACABADO, LOGOTIPO DE LA INMOBILIARIA ALBERTO ALFARO QUE FIGURA EN EL MODELO ( NO PUEDES USAR OTRO MODELO DISTINTO).
TODOS LOS DATOS Y CARACTERISTICAS DEL LOTE DEL INMUEBLE LOS SACARÁS DEL PUNTO 2 . DOCUMENTOS DEL INMUEBLE , DONDE ENCONTRARÁS LA COPIA LITERAL DEL PREDIO.

EL ARCHIVO CREADO LO DEBES COLOCAR EN EN PUNTO 8. PLANOS EN EL ITEM :
 PLANO DE UBICACIÓN REFERENCIAL .`;
}

const sidePattern = /^(?:por\s+(?:el|la)\s+)?(frente|fondo|derecha|izquierda)\b\s*[:;,]?\s*/i;

function normalizeRegistryValue(key, value) {
  const text = value.trim().toLocaleLowerCase('es').replace(/\s+/g, ' ');
  if (key === 'area') {
    const number = text.match(/^([\d., ]+)\s*(?:m\s*[²2]|metros cuadrados)$/)?.[1].replace(/ /g, '');
    if (number && /^\d+(?:[.,]\d{1,2})?$/.test(number)) return String(Number(number.replace(',', '.')));
  }
  return text.replace(/[.;]+$/, '');
}

export function resolveReferencePlan(proposals) {
  const observations = [];
  const fields = { partida: '', area: '', linderos: '' };
  const groups = new Map();
  for (const proposal of proposals) {
    if (!Object.hasOwn(fields, proposal.key)) continue;
    const values = proposal.key === 'linderos'
      ? proposal.value.split(/;\s*(?=(?:por\s+(?:el|la)\s+)?(?:frente|fondo|derecha|izquierda)\b)/i)
      : [proposal.value];
    for (const value of values) {
      const side = proposal.key === 'linderos' ? value.match(sidePattern) : null;
      const label = side?.[1].toLowerCase() ?? { partida: 'Partida registral', area: 'Área', linderos: 'Linderos' }[proposal.key];
      const group = groups.get(label) ?? { key: proposal.key, candidates: new Map() };
      groups.set(label, group);
      const normalized = normalizeRegistryValue(proposal.key, side ? value.slice(side[0].length) : value);
      if (!normalized) continue;
      const candidate = group.candidates.get(normalized) ?? { value, sources: [] };
      candidate.sources.push(proposal.source);
      group.candidates.set(normalized, candidate);
    }
  }
  for (const [label, { key, candidates }] of groups) {
    if (candidates.size > 1) {
      const details = [...candidates.values()].map(({ value, sources }) => `«${value}» (${sources.join(', ')})`);
      observations.push(`${label}: valores distintos. Revisa ${details.join(' o ')}.`);
      continue;
    }
    const [candidate] = candidates.values();
    if (candidate) fields[key] = [fields[key], candidate.value].filter(Boolean).join('\n');
  }
  return { fields, observations };
}

export function resolveReferencePlanLots(documents, propertyArea) {
  const groups = new Map();
  for (const document of documents) {
    const { fields } = resolveReferencePlan(document.proposals);
    const key = fields.partida ? normalizeRegistryValue('partida', fields.partida) : document.id;
    const group = groups.get(key) ?? { id: document.id, names: [], proposals: [] };
    group.names.push(document.name);
    group.proposals.push(...document.proposals);
    groups.set(key, group);
  }
  if (!groups.size) groups.set(0, { id: 0, names: [], proposals: [] });
  return [...groups.values()].map(group => {
    const proposals = [...group.proposals];
    if (groups.size === 1 && propertyArea?.trim()) {
      proposals.push({ key: 'area', value: `${propertyArea} m²`, source: 'Ficha del inmueble' });
    }
    const { fields, observations } = resolveReferencePlan(proposals);
    return { id: group.id, name: group.names.join(' / '), ...fields, observations };
  });
}
