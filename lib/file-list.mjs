export const fileListTypes = [
  { key: 'tasaciones', label: 'Tasaciones', singular: 'Tasación', categories: ['TASACION', 'TASACION_EXPRESS', 'TASACION_PROPIETARIO'] },
  { key: 'contratos-alquiler', label: 'Contratos de alquiler', singular: 'Contrato de alquiler', categories: ['CONTRATO_ALQUILER'] },
  { key: 'minutas', label: 'Minutas de compraventa', singular: 'Minuta de compraventa', categories: ['MINUTA_COMPRAVENTA'] },
  { key: 'escrituras', label: 'Escrituras públicas de compraventa', singular: 'Escritura pública de compraventa', categories: ['ESCRITURA_PUBLICA'] },
];

export function fileListType(category, operation) {
  if (category === 'CONTRATO' && operation === 'alquiler') return fileListTypes[1];
  return fileListTypes.find(type => type.categories.includes(category)) ?? null;
}

export function fileListFilters(params) {
  const zone = params.get('zona')?.trim() || '*';
  const type = params.get('tipo') || '*';
  const page = Number(params.get('pagina') || 1);
  if (zone.length > 100 || !['*', ...fileListTypes.map(item => item.key)].includes(type)) throw Error('Filtros de archivos no válidos.');
  if (!Number.isSafeInteger(page) || page < 1 || page > 1000000) throw Error('Página no válida.');
  return { zone, type, page, pageSize: 50 };
}
