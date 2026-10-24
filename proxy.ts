import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE } from "./lib/admin/cookie";

/**
 * Barreira otimista da área do professor: sem cookie de sessão, nem chega a
 * renderizar. A checagem que vale é a da API (JWT validado em toda chamada
 * feita pelo servidor do Next). Também marca as páginas do painel como
 * não-armazenáveis (computador compartilhado + botão voltar).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(ADMIN_COOKIE);
  const isLogin = pathname === "/admin/login";

  if (!hasSession && !isLogin) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const response = NextResponse.next();
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
