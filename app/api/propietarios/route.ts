import { authorizeApi } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const auth = await authorizeApi();
  if (auth.response) return auth.response;
  return NextResponse.json({ error: "La búsqueda de propietarios fue retirada. Registra el nombre de contacto y adjunta el DNI en Información de inmuebles." }, { status: 410 });
}
