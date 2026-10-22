import { isAdministrator } from './access.mjs';
export const isPhaseOneFile = type => ['FOTO_INMUEBLE', 'TEXTO_PUBLICACION', 'VIDEO_INMUEBLE'].includes(type);
export const canWritePropertyFile = (user, type) => Boolean(user) && (!isPhaseOneFile(type) || isAdministrator(user));
