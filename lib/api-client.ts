/**
 * Wrapper de fetch para a API NestJS. As chamadas vão para a mesma origem
 * (o next.config.ts reescreve /exams/* para a API), então o cookie httpOnly
 * da submissão é enviado pelo browser sem o JS nunca tocar nele.
 */

export type ApiErrorKind =
  | "network"
  | "bad-request"
  | "unauthorized"
  | "forbidden"
  | "not-found"
  | "conflict"
  | "rate-limited"
  | "server";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly kind: ApiErrorKind,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiResponse<T> {
  data: T;
  /**
   * Diferença estimada (ms) entre o relógio do servidor e o do browser,
   * a partir do header Date. Usada só para exibir o timer; quem decide
   * se o tempo acabou é sempre o backend.
   */
  clockOffset: number | null;
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  json?: unknown;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
  const { json, headers, ...init } = options;
  const sentAt = Date.now();
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: json !== undefined ? JSON.stringify(json) : undefined,
    });
  } catch {
    throw new ApiError(0, "Sem conexão com o servidor", "network");
  }
  const receivedAt = Date.now();
  const body = await readBody(res);

  if (!res.ok) {
    throw new ApiError(res.status, messageOf(body) ?? res.statusText, kindOf(res.status));
  }
  return { data: body as T, clockOffset: estimateClockOffset(res, sentAt, receivedAt) };
}

async function readBody(res: Response): Promise<unknown> {
  if (res.status === 204) return null;
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Corpo de erro padrão do NestJS: { statusCode, message: string | string[], error }. */
function messageOf(body: unknown): string | undefined {
  if (!body || typeof body !== "object" || !("message" in body)) return undefined;
  const { message } = body as { message: unknown };
  if (typeof message === "string") return message;
  if (Array.isArray(message)) return message.filter((m) => typeof m === "string").join("; ");
  return undefined;
}

function kindOf(status: number): ApiErrorKind {
  if (status === 400) return "bad-request";
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not-found";
  if (status === 409) return "conflict";
  if (status === 429) return "rate-limited";
  return "server";
}

function estimateClockOffset(res: Response, sentAt: number, receivedAt: number): number | null {
  const header = res.headers.get("date");
  if (!header) return null;
  const serverTime = Date.parse(header);
  if (Number.isNaN(serverTime)) return null;
  // O header Date tem resolução de 1s: soma meio segundo e usa o meio da viagem.
  return serverTime + 500 - (sentAt + receivedAt) / 2;
}

export function isApiError(err: unknown, kind?: ApiErrorKind): err is ApiError {
  return err instanceof ApiError && (kind === undefined || err.kind === kind);
}

/** Erros que valem tentar de novo sozinhos (rede, servidor, rate limit). */
export function isTransient(err: unknown): boolean {
  return isApiError(err) && (err.kind === "network" || err.kind === "server" || err.kind === "rate-limited");
}
