/**
 * Nome do cookie da sessão do professor. Em produção usa o prefixo __Host-:
 * o browser só aceita o cookie se for Secure, com path=/ e sem Domain
 * (não pode ser plantado por subdomínio nem lido fora deste host).
 * Fica separado de session.ts porque o proxy.ts também precisa dele.
 */
export const ADMIN_COOKIE = process.env.NODE_ENV === "production" ? "__Host-admin_session" : "admin_session";
