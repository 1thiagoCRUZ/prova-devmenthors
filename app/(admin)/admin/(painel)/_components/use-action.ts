"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/lib/admin/types";

/** Roda uma Server Action em transição e guarda erro/mensagem para exibir. */
export function useAction() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  const run = (action: () => Promise<ActionResult | void>, onSuccess?: () => void) => {
    setResult(null);
    startTransition(async () => {
      try {
        const outcome = await action();
        if (outcome) setResult(outcome);
        if (!outcome || outcome.ok) onSuccess?.();
      } catch (err) {
        // redirect() de dentro da action chega aqui como erro de navegação: deixa o Next tratar.
        if (err instanceof Error && "digest" in err) throw err;
        setResult({ ok: false, error: "Não foi possível falar com o servidor. Tente de novo." });
      }
    });
  };

  return { pending, result, run, clear: () => setResult(null) };
}
