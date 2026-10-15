import { PropertyInputError } from './property-input.mjs';

const portfolioFields = ['operacion', 'tipo', 'nombreContacto'];
export function validatePropertyEditFields(body, portfolio) {
  if (portfolio ? Object.keys(body).some(key => !portfolioFields.includes(key)) : portfolioFields.some(key => body[key] !== undefined)) {
    throw new PropertyInputError(portfolio ? 'Desde Cartera solo se editan operación, tipo y contacto.' : 'Operación, tipo y contacto se editan únicamente desde Cartera.');
  }
}
export function canChangeOperation({ estado, hasPrices, hasPublication }) {
  return estado === 'activo' && !hasPrices && !hasPublication;
}
