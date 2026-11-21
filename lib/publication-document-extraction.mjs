// Conservative, local extraction: no external AI service and no inferred facts.
export const COMMERCIAL_DOCUMENT_TYPES = ['COPIA_LITERAL_CRI', 'COPIA_LITERAL', 'HR_VENTA', 'TASACION_EXPRESS', 'TASACION', 'TASACION_PROPIETARIO'];
export const COMMERCIAL_FIELDS = {
  direccion: 'Ubicación del inmueble', areaTerreno: 'Área de terreno', areaConstruida: 'Área construida',
  medidas: 'Medidas y linderos', distribucion: 'Distribución', antiguedad: 'Antigüedad', conservacion: 'Estado de conservación', areaParcial: 'Área parcial / por verificar',
};
const patterns = {
  direccion: /(?:ubicaci[oó]n\s*(?:del\s+(?:predio|inmueble))?|direcci[oó]n\s+del\s+(?:predio|inmueble)|(?:el\s+)?inmueble\s+(?:se\s+encuentra\s+)?ubicado\s+en)\s*[:.\-]?\s*([^\n]{8,350})/giu,
  areaTerreno: /(?:[aá]rea\s+(?:total\s+)?(?:de[l]?\s+)?terreno|[aá]rea\s+del\s+predio)\s*[:=\-]?\s*([\d][\d., ]{0,25})\s*(?:m[²2]|metros\s+cuadrados)/giu,
  areaConstruida: /(?:[aá]rea\s+(?:total\s+)?(?:construida|(?:de\s+)?construcci[oó]n)|[aá]rea\s+techada(?:\s+total)?)\s*[:=\-]?\s*([\d][\d., ]{0,25})\s*(?:m[²2]|metros\s+cuadrados)/giu,
  medidas: /(?:linderos\s+y\s+medidas\s+perim[eé]tricas|medidas\s+perim[eé]tricas|por\s+el\s+frente)\s*[:\-]?\s*([^\n]{3,350}(?:\n[^\n]{1,200}){0,3})/giu,
  distribucion: /(?:distribuci[oó]n(?:\s+(?:del\s+inmueble|de\s+ambientes))?)\s*[:\-]\s*([^\n]{0,200}(?:\n[^\n]{1,200}){0,5})/giu,
  antiguedad: /antig[uü]edad\s*[:\-]?\s*(\d{1,3}\s*a[ñn]os)/giu,
  conservacion: /estado\s+de\s+conservaci[oó]n\s*[:\-]\s*([^\n]{3,120})/giu,
};

/** Every proposal retains its page and literal evidence; nothing updates the property. */
export function extractCommercialProposals(pages) {
  const proposals = [];
  for (const [index, page] of pages.entries()) {
    const text = String(page).replace(/\r/g, '').slice(0, 100000);
    for (const [field, pattern] of Object.entries(patterns)) {
      pattern.lastIndex = 0;
      for (const match of text.matchAll(pattern)) {
        let value = match[1].trim();
        if (!value) continue;
        if (field.startsWith('area')) value = `${value} m²`;
        const evidence = text.slice(Math.max(0, match.index - 80), Math.min(text.length, match.index + match[0].length + 80)).trim();
        // Keep alternative sources for review rather than guessing which is correct.
        if (proposals.some(item => item.field === field && item.value === value && item.page === index + 1)) continue;
        const partial = field === 'areaConstruida' && !/total/i.test(match[0]);
        const contextual = /comparables?|referencias de mercado|predio matriz|terreno matriz/i.test(text);
        const destination = partial || (contextual && field.startsWith('area')) ? 'areaParcial' : field;
        proposals.push({ field: destination, label: COMMERCIAL_FIELDS[destination], value, page: index + 1, evidence, requiresClassification: destination === 'areaParcial' });
        if (proposals.length >= 60) return proposals;
      }
    }
  }
  return proposals;
}
