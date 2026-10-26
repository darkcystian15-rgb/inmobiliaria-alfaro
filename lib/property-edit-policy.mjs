import { PropertyInputError } from './property-input.mjs';

const portfolioFields = ['operacion', 'tipo', 'nombreContacto'];
const portfolioAllowedFields = [...portfolioFields, 'direccion'];
export function validatePropertyEditFields(body, portfolio) {
  if (portfolio ? Object.keys(body).some(key => !portfolioAllowedFields.includes(key)) : portfolioFields.some(key => body[key] !== undefined)) {
    throw new PropertyInputError(portfolio ? 'Desde Cartera solo se editan operación, tipo, contacto y dirección referencial.' : 'Operación, tipo y contacto se editan únicamente desde Cartera.');
  }
}
export function canChangeOperation({ estado }) {
  return estado === 'activo';
}
