import { execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { rmSync } from 'node:fs';
import EmbeddedPostgres from 'embedded-postgres';
import { hashPassword } from '../src/common/utils/password';

const PORT = 5434;
const DATA_DIR = './.pg-test';
const TEST_ADMIN_PASSWORD = randomBytes(12).toString('base64url');

/** Sobe um PostgreSQL descartável, aplica as migrations e exporta as env vars do app. */
export default async function globalSetup() {
  rmSync(DATA_DIR, { recursive: true, force: true });
  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: 'postgres',
    password: 'postgres',
    port: PORT,
    persistent: false,
    onLog: () => {},
  });
  await pg.initialise();
  await pg.start();
  await pg.createDatabase('provas_test');
  (globalThis as Record<string, unknown>).__EMBEDDED_PG__ = pg;

  const testUrl = `postgresql://postgres:postgres@localhost:${PORT}/provas_test?schema=public`;
  Object.assign(process.env, {
    NODE_ENV: 'test',
    PORT: '0',
    DATABASE_URL: testUrl,
    // Precisa ser setada: senão o prisma.config.ts pegaria a DIRECT_URL do .env (ex.: Neon).
    DIRECT_URL: testUrl,
    ADMIN_KEY: randomBytes(32).toString('hex'),
    ADMIN_USERNAME: 'professor',
    ADMIN_PASSWORD_HASH: await hashPassword(TEST_ADMIN_PASSWORD),
    TEST_ADMIN_PASSWORD,
    JWT_SECRET: randomBytes(32).toString('hex'),
    ADMIN_TOKEN_TTL_MINUTES: '5',
    CORS_ORIGIN: 'http://localhost:5173',
    COOKIE_SECURE: 'false',
    COOKIE_SAMESITE: 'lax',
  });

  execSync('npx prisma migrate deploy', { stdio: 'ignore', env: process.env });
}
