import "server-only";
import { cookies } from "next/headers";
import { ADMIN_COOKIE } from "./cookie";

const secure = process.env.NODE_ENV === "production";

/**
 * O JWT de professor emitido por POST /admin/login vive só neste cookie:
 * httpOnly (JS do browser não lê), SameSite=Strict (não vai em navegação
 * vinda de outro site) e Secure em produção. Só o servidor do Next o lê
 * e o repassa para a API como Bearer.
 */
export async function getAdminToken(): Promise<string | null> {
  return (await cookies()).get(ADMIN_COOKIE)?.value ?? null;
}

export async function setAdminToken(token: string, maxAgeSeconds: number) {
  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: "strict",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export async function clearAdminToken() {
  (await cookies()).delete({ name: ADMIN_COOKIE, path: "/", secure, httpOnly: true, sameSite: "strict" });
}
