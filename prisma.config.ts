import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node prisma/seed.ts',
  },
  datasource: {
    // CLI (migrate) usa a conexão direta: o pooler do Neon não suporta migrations.
    // Sem DIRECT_URL (ex.: Postgres local), cai na DATABASE_URL.
    url: process.env.DIRECT_URL || env('DATABASE_URL'),
  },
});
