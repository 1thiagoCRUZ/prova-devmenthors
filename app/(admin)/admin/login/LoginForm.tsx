"use client";

import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { loginAction, type LoginState } from "@/lib/admin/actions";

const initial: LoginState = { error: null };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initial);
  const expired = useSearchParams().get("sessao") === "expirada";

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {expired && !state.error ? (
        <Notice tone="warn" title="Sua sessão expirou">
          Entre de novo com seu usuário e senha.
        </Notice>
      ) : null}
      <Input
        label="Usuário"
        name="username"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        required
        maxLength={100}
        disabled={pending}
      />
      <Input
        label="Senha"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        maxLength={256}
        disabled={pending}
        hint="A senha não fica salva no navegador: vira uma sessão curta, invisível para o JavaScript da página."
      />
      {state.error ? <Notice tone="danger">{state.error}</Notice> : null}
      <Button type="submit" size="lg" loading={pending} loadingLabel="Entrando…" className="w-full">
        Entrar
      </Button>
    </form>
  );
}
