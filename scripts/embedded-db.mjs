// Sobe um PostgreSQL local (binário embutido, sem Docker) para desenvolvimento.
// Uso: npm run db:embedded  ->  postgresql://postgres:postgres@localhost:5433/provas
import EmbeddedPostgres from 'embedded-postgres';
import { existsSync } from 'node:fs';

const dataDir = './.pg-dev';
const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: 'postgres',
  password: 'postgres',
  port: 5433,
  persistent: true,
});

if (!existsSync(dataDir)) {
  await pg.initialise();
}
await pg.start();
try {
  await pg.createDatabase('provas');
} catch {
  // já existe
}
console.log('PostgreSQL em postgresql://postgres:postgres@localhost:5433/provas (Ctrl+C para parar)');

const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
setInterval(() => {}, 1 << 30);
