# prova-app-front

Front Next.js 16 (App Router) + React 19 + Tailwind 4 + TanStack Query da aplicação de provas.
Consome a API NestJS de `../prova-app-backend`. Specs em `docs/`.

## Rodando

```bash
npm install
cp .env.example .env.local   # API_ORIGIN=http://localhost:3000
npm run dev                  # http://localhost:3001
```

O browser fala só com o front: `next.config.ts` reescreve `/exams/*` para `API_ORIGIN`.
Assim o cookie httpOnly `exam_token` (path `/exams/:id`) fica na mesma origem do front,
sem CORS nem `SameSite=None`. Atrás desse proxy, rode a API com `TRUST_PROXY=1` para o
rate limit usar o IP do aluno (`x-forwarded-for`), e não o do servidor do Next.

## Fluxo do aluno

`/` (nome, e-mail, código) → `/prova/:id` → modal de envio → `/prova/:id/obrigado`.

- Timer a partir do `expiresAt` da API (com correção de relógio pelo header `Date`); ao zerar, o front pergunta ao backend.
- Autosave por questão (debounce de 800ms, fila por questão, retry com backoff).
- Resposta ainda não confirmada fica em `sessionStorage` e é reenviada depois de recarregar a página (e com `keepalive` ao sair).
- 403 → tempo esgotado · 409 → já enviada · 403 "Token…" → aberta em outra aba/aparelho.
- Abas do mesmo navegador conversam por `BroadcastChannel`: se outra aba iniciar a prova, esta para de salvar.

## Área do professor

`/admin/login` (chave = `ADMIN_KEY` do backend) → `/admin` (provas) → `/admin/provas/:id` (questões, gabarito,
e-mails liberados, publicar/encerrar) → `/admin/provas/:id/submissoes` (lista + relatório) → correção.

- A chave vai uma vez para `POST /admin/login` **pelo servidor do Next** (Server Action); o JWT devolvido fica num
  cookie `httpOnly` + `SameSite=Strict` (+ `Secure` e prefixo `__Host-` em produção). O JS do browser nunca vê chave nem token.
- Toda leitura/escrita do painel é feita no servidor (Server Components + Server Actions, que já checam `Origin`);
  `proxy.ts` barra `/admin/*` sem sessão e marca as páginas como `no-store`.
- Sair apaga o cookie; o JWT em si continua válido até expirar (`ADMIN_TOKEN_TTL_MINUTES`), pois o backend não tem revogação.
- Produção exige HTTPS (cookie `Secure`).
