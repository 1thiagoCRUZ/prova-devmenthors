"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";

/** Link da prova para mandar aos alunos (montado com a origem atual do front). */
export function CopyLink({ path }: { path: string }) {
  const origin = useSyncExternalStore(noopSubscribe, () => window.location.origin, () => "");
  const [copied, setCopied] = useState(false);
  const url = `${origin}${path}`;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <code className="min-w-0 flex-1 truncate rounded-control border border-line bg-paper-sunken px-3 py-2.5 font-mono text-sm">
        {url}
      </code>
      <Button
        variant="secondary"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          } catch {
            setCopied(false);
          }
        }}
      >
        <span aria-live="polite">{copied ? "Copiado" : "Copiar link"}</span>
      </Button>
    </div>
  );
}

function noopSubscribe() {
  return () => {};
}
