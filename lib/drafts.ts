/**
 * Rascunho das respostas que ainda NÃO foram confirmadas pelo backend.
 * Fica em sessionStorage (some ao fechar a aba) só para sobreviver a um
 * recarregamento antes do autosave terminar. Nunca guarda token nem nada
 * além do texto/alternativa do próprio aluno, e é apagado assim que o
 * backend confirma o salvamento.
 *
 * A chave inclui o startedAt da submissão: se outra pessoa iniciar a prova
 * no mesmo navegador, o rascunho antigo não é aplicado na submissão nova.
 */

export type DraftValues = Record<string, string | null>;

export function draftKeyFor(examId: string, startedAt: string) {
  return `prova:draft:${examId}:${startedAt}`;
}

export function readDrafts(key: string): DraftValues {
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out: DraftValues = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "string" || v === null) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function writeDrafts(key: string, values: DraftValues) {
  try {
    if (Object.keys(values).length === 0) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, JSON.stringify(values));
  } catch {
    // Storage cheio ou bloqueado: o autosave no backend continua valendo.
  }
}

/** Remove todos os rascunhos desta prova (após envio ou tempo esgotado). */
export function clearExamDrafts(examId: string) {
  try {
    const prefix = `prova:draft:${examId}:`;
    for (let i = window.sessionStorage.length - 1; i >= 0; i--) {
      const key = window.sessionStorage.key(i);
      if (key?.startsWith(prefix)) window.sessionStorage.removeItem(key);
    }
  } catch {
    // ignora
  }
}
