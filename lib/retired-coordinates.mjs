const retired = new Set(['latitud', 'longitud', 'latitude', 'longitude']);

// Old browser sessions and recovered drafts must not persist retired fields.
export function stripCoordinates(value) {
  if (Array.isArray(value)) return value.filter(item => !retired.has(item)).map(stripCoordinates);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).filter(([key]) => !retired.has(key)).map(([key, item]) => [key, stripCoordinates(item)]));
  }
  return value;
}

export function scrubCoordinateJson(text) {
  if (text == null) return text;
  const value = JSON.parse(text);
  const cleaned = stripCoordinates(value);
  return JSON.stringify(value) === JSON.stringify(cleaned) ? text : JSON.stringify(cleaned);
}
