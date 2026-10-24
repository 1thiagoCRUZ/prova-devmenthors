import "server-only";
import { notFound, redirect } from "next/navigation";
import { isExamId } from "../exam-id";
import { getAdminToken } from "./session";

export const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:3000";

export class AdminApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

/** IDs vão para a URL da API: só UUID passa (evita path injection tipo "../"). */
export function requireId(value: string): string {
  if (!isExamId(value)) notFound();
  return value.toLowerCase();
}

interface AdminFetchOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  json?: unknown;
}

/**
 * Chamada autenticada à API, feita SÓ no servidor do Next. O token sai do
 * cookie httpOnly e vai como Bearer; nunca é devolvido ao browser.
 * Sem sessão ou com sessão vencida (401) → tela de login.
 */
export async function adminFetch<T>(path: string, { method = "GET", json }: AdminFetchOptions = {}): Promise<T> {
  const token = await getAdminToken();
  if (!token) redirect("/admin/login");

  let res: Response;
  try {
    res = await fetch(`${API_ORIGIN}${path}`, {
      method,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: json !== undefined ? JSON.stringify(json) : undefined,
    });
  } catch {
    throw new AdminApiError(0, "A API não respondeu. Confira se o backend está no ar.");
  }

  if (res.status === 401) redirect("/admin/login?sessao=expirada");

  const text = await res.text();
  const body: unknown = text ? safeJson(text) : null;
  if (!res.ok) throw new AdminApiError(res.status, messageOf(body) ?? `Erro ${res.status}`);
  return body as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function messageOf(body: unknown): string | undefined {
  if (!body || typeof body !== "object" || !("message" in body)) return undefined;
  const { message } = body as { message: unknown };
  if (typeof message === "string") return message;
  if (Array.isArray(message)) return message.join("; ");
  return undefined;
}
