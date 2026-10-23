// DECIMAL(15,2): thirteen integer digits and at most two decimal places.
export function parsePrice(value) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value).trim();
  if (!/^\d{1,13}(\.\d{1,2})?$/.test(text) || Number(text) <= 0) return null;
  const [integer, fraction = ""] = text.split(".");
  return `${BigInt(integer)}.${fraction.padEnd(2, "0")}`;
}

export function parseCurrency(value = "PEN") {
  return value === "PEN" || value === "USD" ? value : null;
}
export function formatPrice(value, currency = "PEN") {
  if (value == null || value === "") return "Por definir";
  return `${currency === "USD" ? "US$" : "S/"} ${Number(value).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
/** @param {Record<string, unknown>} body
 * @param {Record<string, string | number | Date | null> | null} previous */
export function appraisalPrices(body, previous = null) {
  /** @type {Record<string, string>} */
  const result = {};
  for (const field of ["valorReferencia", "precioObjetivo", "precioVenta"]) {
    const value = body[field] === undefined && previous ? previous[field] : parsePrice(body[field]);
    const currencyField = `${field}Moneda`;
    const currency = parseCurrency(body[currencyField] === undefined ? previous?.[currencyField] ?? "PEN" : body[currencyField]);
    if (!value || !currency) throw new Error("Ingresa los tres importes positivos con hasta dos decimales y selecciona soles o dólares.");
    result[field] = value;
    result[currencyField] = currency;
  }
  return result;
}
