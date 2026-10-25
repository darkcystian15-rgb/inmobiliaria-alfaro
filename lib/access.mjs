export function isAdministrator(user) {
  return user?.rol === "administrador";
}

export function homeForUser(user) {
  return isAdministrator(user) ? "/" : "/datos-inmuebles";
}

export const canAccessPortal = user => Boolean(user && ['administrador', 'operador', 'usuario'].includes(user.rol));
