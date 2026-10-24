import type { Metadata } from "next";
import { Suspense } from "react";
import { SheetPage } from "../../../(aluno)/_components/SheetPage";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Entrar como professor" };

export default function AdminLoginPage() {
  return (
    <SheetPage eyebrow="Área do professor" title="Entrar no painel">
      <Suspense>
        <LoginForm />
      </Suspense>
    </SheetPage>
  );
}
