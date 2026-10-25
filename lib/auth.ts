import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { inmSesiones, inmUsuarios } from "@/db/schema";
import { hashSessionToken } from "@/lib/password.mjs";
import { sameOrigin } from "@/lib/request-origin.mjs";
import { isAdministrator, canAccessPortal } from "@/lib/access.mjs";
import { LOGIN_MFA_REQUIRED } from "@/lib/auth-policy";

export { sameOrigin };

export const SESSION_COOKIE = "aa_session";
export const SESSION_SECONDS = 60 * 60 * 8;
export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function findSession(token?: string) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const [record] = await db.select({
    id: inmUsuarios.id,
    nombre: inmUsuarios.nombre,
    usuario: inmUsuarios.usuario,
    rol: inmUsuarios.rol,
    mfaSecret: inmUsuarios.mfaSecret,
    lastSeen: inmSesiones.lastSeen,
  }).from(inmSesiones).innerJoin(inmUsuarios, eq(inmUsuarios.id, inmSesiones.usuarioId))
    .where(and(
      eq(inmSesiones.tokenHash, hashSessionToken(token)),
      gt(inmSesiones.expira, new Date()),
      eq(inmUsuarios.activo, true),
    )).limit(1);
  if (!record || (LOGIN_MFA_REQUIRED && record.rol === 'administrador' && !record.mfaSecret) || record.lastSeen < new Date(Date.now()-30*60*1000)) return null;
  await db.update(inmSesiones).set({ lastSeen: new Date() }).where(and(eq(inmSesiones.tokenHash,hashSessionToken(token)),gt(inmSesiones.lastSeen,new Date(Date.now()-30*60*1000))));
  return {id:record.id,nombre:record.nombre,usuario:record.usuario,rol:record.rol};
}

export const getSession = cache(async () => {
  return findSession((await cookies()).get(SESSION_COOKIE)?.value);
});

export async function requireRecentAuthentication() {
  const token=(await cookies()).get(SESSION_COOKIE)?.value;
  if(!token)return NextResponse.json({error:'Inicia sesión para continuar.'},{status:401});
  const [session]=await db.select({at:inmSesiones.authenticatedAt}).from(inmSesiones).where(eq(inmSesiones.tokenHash,hashSessionToken(token))).limit(1);
  if(!session || session.at < new Date(Date.now()-5*60*1000)) return NextResponse.json({error:'Confirma tu identidad para cambiar accesos.',reauthRequired:true},{status:428});
  return null;
}

export async function authorizeApi(request?: Request, access: "administrador" | "informacion" | "portal" = "administrador") {
  if (request && !["GET", "HEAD", "OPTIONS"].includes(request.method) && !sameOrigin(request)) {
    return { user: null, response: NextResponse.json({ error: "Solicitud no permitida." }, { status: 403 }) };
  }
  const user = await getSession();
  if (!user) {
    return { user: null, response: NextResponse.json({ error: "Inicia sesión para continuar." }, { status: 401 }) };
  }
  if (access === "portal" && !canAccessPortal(user)) return { user: null, response: NextResponse.json({ error: "No tienes permiso para acceder al Portal web." }, { status: 403 }) };
  if (access === "administrador" && !isAdministrator(user)) {
    return { user: null, response: NextResponse.json({ error: "No tienes permiso para acceder a este módulo." }, { status: 403 }) };
  }
  return { user, response: null };
}
