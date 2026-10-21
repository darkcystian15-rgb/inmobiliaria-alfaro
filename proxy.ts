import { NextRequest, NextResponse } from "next/server";

// An early redirect improves navigation; layouts and API handlers verify the
// actual session in the database before exposing data or accepting mutations.
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const documentPreview = /^\/api\/inmuebles\/[^/]+\/archivos\/\d+$/.test(request.nextUrl.pathname);
  const csp = `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-src 'self'; frame-ancestors ${documentPreview ? "'self'" : "'none'"}; object-src 'none'; base-uri 'self'; form-action 'self'`;
  const headers = new Headers(request.headers);
  headers.set('Content-Security-Policy', csp);
  headers.set('x-nonce', nonce);
  const next = () => {
    const response = NextResponse.next({ request: { headers } });
    response.headers.set('Content-Security-Policy', csp);
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  };
  const path = request.nextUrl.pathname;
  if (path === "/login" || path === "/apple-icon.png" || path.startsWith("/api/auth/") || path === "/api/portal-web/bridge") return next();
  if (!request.cookies.get("aa_session")?.value) {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "Inicia sesión para continuar." }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|branding/|favicon.ico|.*\\.svg$).*)"],
};
