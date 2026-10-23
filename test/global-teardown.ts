import type EmbeddedPostgres from 'embedded-postgres';

export default async function globalTeardown() {
  const pg = (globalThis as Record<string, unknown>).__EMBEDDED_PG__ as EmbeddedPostgres | undefined;
  await pg?.stop();
}
