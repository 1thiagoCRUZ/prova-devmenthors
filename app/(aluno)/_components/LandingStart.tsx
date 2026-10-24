"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { wasClosedByTime } from "@/lib/student-api";
import { SheetPage } from "./SheetPage";
import { StartForm } from "./StartForm";
import { AlreadySubmittedScreen } from "./StatusScreen";

export function LandingStart() {
  const router = useRouter();
  const [closed, setClosed] = useState<{ timeUp: boolean } | null>(null);

  if (closed) return <AlreadySubmittedScreen timeUp={closed.timeUp} />;

  return (
    <SheetPage eyebrow="Prova online" title="Entrar na sala">
      <StartForm
        onInProgress={(examId) => router.push(`/prova/${examId}`)}
        onClosed={(_, result) => setClosed({ timeUp: wasClosedByTime(result) })}
      />
    </SheetPage>
  );
}
