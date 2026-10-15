import { operation } from "./operation.mjs";
export class PropertyInputError extends Error {}
function text(value, label, max, required = false) {
  if (typeof value !== 'string' && value != null) throw new PropertyInputError(`${label}: valor no válido.`);
  const result = String(value ?? '').trim();
  if ((required && !result) || result.length > max) throw new PropertyInputError(`Revisa ${label} (máximo ${max} caracteres).`);
  return result || null;
}
function number(value, label, integer = false) {
  if (value === '' || value == null) return null;
  if (!['string', 'number'].includes(typeof value) || !/^\d+(?:\.\d{1,2})?$/.test(String(value))) throw new PropertyInputError(`Revisa ${label}; usa un número positivo o cero.`);
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > (integer ? 2147483647 : 9999999999.99) || (integer && !Number.isInteger(n))) throw new PropertyInputError(`Revisa ${label}.`);
  return integer ? n : n.toFixed(2);
}
export function propertyInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new PropertyInputError('Datos no válidos.');
  const result = {};
  if (body.operacion !== undefined) {
    try { result.operacion = operation(body.operacion); } catch { throw new PropertyInputError("Selecciona Venta o Alquiler."); }
  }
  for (const [key, label, max, required] of [
    ['tipo', 'tipo de inmueble', 30, true],
    ['direccion', 'ubicación referencial', 350, true], ['nombreContacto', 'nombre de contacto', 281, true], ['distrito', 'distrito', 100], ['provincia', 'provincia', 100],
    ['departamento', 'departamento', 100], ['caracteristicas', 'características', 10000], ['observaciones', 'observaciones', 10000],
  ]) if (body[key] !== undefined) result[key] = text(body[key], label, max, required);
  for (const [key, label, integer] of [['areaTerreno', 'área de terreno', false], ['areaConstruida', 'área construida', false], ['habitaciones', 'habitaciones', true], ['banos', 'baños', true]]) {
    if (body[key] !== undefined) result[key] = number(body[key], label, integer);
  }
  return result;
}

export function registrationInput(body) {
  const values = propertyInput(body);
  for (const key of ['operacion', 'tipo', 'direccion', 'nombreContacto']) {
    if (!values[key]) throw new PropertyInputError('Completa operación, tipo, ubicación referencial y nombre de contacto.');
  }
  const posicion = Number(body.posicion);
  if (!['number', 'string'].includes(typeof body.posicion) || !Number.isInteger(posicion) || posicion < 1 || posicion > 90) throw new PropertyInputError('La posición debe estar entre 01 y 90.');
  return { posicion, operacion: values.operacion, tipo: values.tipo, direccion: values.direccion,
    referencia: values.direccion.slice(0, 255), nombreContacto: values.nombreContacto,
    departamento: values.departamento, provincia: values.provincia, distrito: values.distrito };
}
export function ownerInput(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new PropertyInputError('Datos del propietario no válidos.');
  const result = {};
  for (const [key, label, max] of [['dni', 'DNI', 8], ['nombres', 'nombres', 120], ['apellidos', 'apellidos', 160], ['telefono', 'teléfono', 40], ['email', 'correo', 160], ['referenciaContacto', 'referencia de contacto', 255]]) result[key] = text(value[key], label, max);
  if (Object.values(result).every(v => v === null)) return null;
  if ((result.dni && !/^\d{8}$/.test(result.dni)) || !result.nombres) throw new PropertyInputError('Completa el nombre del propietario y, si ingresas DNI, usa 8 dígitos.');
  if (result.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)) throw new PropertyInputError('Correo del propietario no válido.');
  return { dni: result.dni, nombres: result.nombres, apellidos: result.apellidos ?? "",
    telefono: result.telefono, email: result.email, referenciaContacto: result.referenciaContacto };
}
