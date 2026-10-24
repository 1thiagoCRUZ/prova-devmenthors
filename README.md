# prova-app-backend

API NestJS para aplicar provas online (objetivas e discursivas) sem vazar o gabarito e sem um aluno acessar dados de outro.

Stack: NestJS 12 · Prisma 7 + PostgreSQL · class-validator/class-transformer · @nestjs/jwt · @nestjs/throttler · @nestjs/schedule · helmet.

## Rodando localmente

```bash
npm install
cp .env.example .env          # preencha ADMIN_KEY e JWT_SECRET (>= 32 chars) e o banco (abaixo)
npx prisma migrate deploy     # aplica as migrations
npx prisma generate           # gera o client
npm run seed                  # (opcional, só dev) cria uma prova de exemplo publicada
npm run start:dev
```

### Banco

**Neon (recomendado):** no painel do projeto, copie as duas connection strings:

| Variável | Qual string | Usada por |
| --- | --- | --- |
| `DATABASE_URL` | **Pooled** (host com `-pooler`) | o app em runtime e o seed |
| `DIRECT_URL` | **Direct** (sem `-pooler`) | `prisma migrate` (o pooler não suporta migrations) |

Ambas com `?sslmode=require`. Dica: use uma branch `dev` do Neon para desenvolvimento e a `main` para produção.

**Postgres local:** defina só `DATABASE_URL` (sem `DIRECT_URL`, o Prisma usa a mesma). Sem Postgres instalado, `npm run db:embedded` sobe um embutido em `localhost:5433` (dados em `.pg-dev/`). Para criar migrations novas (`prisma migrate dev`), use um banco local ou uma branch descartável do Neon: o `migrate dev` cria um shadow database.

Testes:

```bash
npm test          # unitários
npm run test:e2e  # e2e contra um Postgres real descartável (embedded-postgres, porta 5434), nunca no Neon
```

> NestJS 12 é ESM-only; por isso os scripts de teste rodam o Jest com `--experimental-vm-modules`.

## Endpoints

Professor: `POST /admin/login` com `{ username, password }` devolve um token → `Authorization: Bearer <token>`. Para scripts/automação, o header `x-admin-key: <ADMIN_KEY>` também vale.

Definir ou trocar a senha do professor (grava só o hash scrypt no `.env`; reinicie a API depois):

```bash
npm run admin:password -- "sua senha forte"            # usuário "admin"
npm run admin:password -- "sua senha forte" --user ana
npm run admin:password                                 # gera uma senha aleatória e mostra uma vez
```
Aluno: cookie `exam_token` (httpOnly) emitido por `POST /exams/:id/start`, válido só para aquela prova.

| Método | Rota | Quem | Descrição |
| --- | --- | --- | --- |
| POST | `/admin/login` | público | `{ username, password }` → `{ accessToken, expiresIn }` (5 req/min) |
| POST | `/exams` | professor | Cria prova (`DRAFT`) |
| PATCH | `/exams/:id` | professor | Edita / publica / encerra (`status`) |
| GET | `/exams` | ambos | Professor: todas. Aluno: `?email=` → publicadas, na janela e atribuídas |
| GET | `/exams/:id` | ambos | Professor: detalhe com contagens. Aluno: `?email=` → só metadados públicos |
| POST | `/exams/:id/questions` | professor | Cria questão + alternativas + gabarito |
| GET | `/admin/exams/:id/questions` | professor | Questões **com** gabarito |
| PATCH | `/questions/:id` | professor | Edita (enviar `options` substitui todas) |
| DELETE | `/questions/:id` | professor | Remove |
| POST/GET | `/exams/:id/assignments` | professor | `{ emails: [] }` / lista |
| DELETE | `/exams/:id/assignments/:assignmentId` | professor | Remove atribuição |
| POST | `/exams/:id/start` | público | `{ name, email }` → cria/retoma a submissão e seta o cookie |
| GET | `/exams/:id/questions` | aluno (token) | Questões **sem** gabarito + as próprias respostas |
| POST | `/exams/:id/answers` | aluno (token) | `{ questionId, selectedOptionId? , text? }` autosave idempotente |
| POST | `/exams/:id/submit` | aluno (token) | Fecha a submissão e corrige as objetivas |
| GET | `/exams/:id/submissions` | professor | Lista submissões |
| GET | `/submissions/:id` | professor | Detalhe com respostas, notas e gabarito |
| PATCH | `/submissions/:id/answers/:answerId` | professor | `{ score }` nota de discursiva |
| GET | `/exams/:id/report` | professor | Estatísticas agregadas (sem identificar alunos) |

### Exemplo de questão

```json
POST /exams/:id/questions
{
  "order": 1,
  "type": "MCQ",
  "statement": "Qual é a saída?",
  "codeSnippet": "console.log(typeof null)",
  "points": 2,
  "options": [{ "label": "A", "text": "\"null\"" }, { "label": "B", "text": "\"object\"" }],
  "answerKey": { "correctOptionLabel": "B", "explanation": "..." }
}
```

Discursiva: `"type": "DISCURSIVE"`, sem `options`, e `answerKey` com `expectedPoints` / `rubric` opcionais.

### Código nas questões

- `statement` e `options[].text` são **Markdown mínimo**: só `` `código inline` ``, blocos cercados (` ```php ` … ` ``` `) e tabelas simples (`| a | b |` + linha `| --- | --- |`). Todo o resto é texto puro.
- `codeSnippet` é o bloco principal da questão; `codeLanguage` diz a linguagem (`php`, `sql`, `html`, `css`, `javascript`, `typescript`, `json`, `python`, `java`, `c`, `cpp`, `csharp`, `bash`, `plaintext`) para o syntax highlight.
- O front renderiza isso com `RichText`/`CodeBlock` (highlight.js), sem HTML cru.

### Importar uma prova de um JSON

```bash
npm run import:exam -- provas/minha-prova.json
```

Formato: `{ "exam": { title, description?, durationMinutes }, "questions": [CreateQuestionDto...] }`. A prova entra como `DRAFT` com janela provisória (agora → +7 dias); ajuste datas, duração e pontos no painel e publique. Passa pelos mesmos services/validações da API. A pasta `provas/` está no `.gitignore` porque contém gabarito.

Para corrigir questões de uma prova já importada (enquanto ninguém começou), edite o JSON e rode:

```bash
npm run sync:exam -- <examId> provas/minha-prova.json
```

Casa as questões pela `order` e atualiza enunciado, código, alternativas e gabarito, sem mexer em datas, duração, status ou pontos.

## Regras importantes

- **Gabarito**: vive só na tabela `AnswerKey` (`Option` não tem `isCorrect`). A rota do aluno usa exclusivamente `QuestionsService.findForStudent()`, que faz `select` explícito e passa pela whitelist `StudentQuestionDto`. Há teste de contrato que quebra se um campo novo vazar.
- **Isolamento**: toda rota de aluno resolve a submissão pelo hash SHA-256 do token (`OwnershipGuard` → `SubmissionsService.resolveOwnedSubmission`) e confere que é da prova da URL. Nada é buscado por e-mail digitado.
- **Retomar**: novo `start` com o mesmo e-mail enquanto `IN_PROGRESS` emite token novo e invalida o anterior. Depois de `SUBMITTED`, nenhum token novo é emitido (quem só sabe o e-mail não lê respostas).
- **Uma tentativa**: `UNIQUE(examId, studentEmail)` no banco; e-mails normalizados para minúsculas. Submit, autosave e correção travam a linha da submissão (`SELECT … FOR UPDATE`).
- **Tempo**: `expiresAt = min(startedAt + durationMinutes, closesAt)`, calculado no servidor. Fora da janela → `403`; a tentativa vencida é fechada e corrigida (no próximo request ou pelo cron de 1 em 1 minuto). Depois de enviada → `409`.
- **Edição**: questões/gabarito só mudam enquanto a prova não tem submissões. Prova `CLOSED` é imutável.
- **Pontuação**: `Question.points` (default 1). MCQ certa = `points`, errada/em branco = 0. Discursiva em branco = 0; respondida fica pendente até o professor dar nota. Status `GRADED` quando todas as respostas têm nota.
- **Auditoria**: `AuditLog` + log JSON para login, início/retomada/envio/fechamento automático, edições do professor, notas, e todo `401/403/409/429`. Nunca grava token, chave ou conteúdo de resposta.
- **Validação**: `ValidationPipe` global com `whitelist` + `forbidNonWhitelisted` (ex.: `score` enviado pelo aluno → `400`).

## Produção

- `NODE_ENV=production` exige `COOKIE_SECURE=true` e `CORS_ORIGIN` sem `*` (a aplicação não sobe caso contrário).
- HTTPS obrigatório. Se front e API estiverem em domínios diferentes, use `COOKIE_SAMESITE=none` (+ `COOKIE_SECURE=true`) e `credentials: 'include'` no front.
- Atrás de proxy/load balancer, defina `TRUST_PROXY` (nº de hops) para o rate limit usar o IP real. O rate limit é por IP: uma sala inteira atrás do mesmo NAT divide o limite (30 `start`/min, 300 req/min no geral).
- O cookie usa `path=/exams/:id`; se a API for servida sob um prefixo (ex.: `/api`), ajuste `submissionCookieOptions`.
- Migrations: `npm run prisma:deploy` (usa `DIRECT_URL`). O seed recusa rodar em produção.

## Fora desta entrega

- Aluno consultar a própria nota final (precisa de um flag de "liberar resultado" e de um token que dure além da prova).
