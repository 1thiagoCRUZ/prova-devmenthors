/**
 * Define o usuário e a senha do professor no .env (guarda só o hash scrypt).
 *
 *   npm run admin:password -- "minha senha forte"            # usuário "admin"
 *   npm run admin:password -- "minha senha forte" --user ana
 *   npm run admin:password                                   # gera uma senha aleatória e mostra uma vez
 *
 * Reinicie a API depois. Em produção, copie ADMIN_USERNAME e ADMIN_PASSWORD_HASH
 * para as variáveis de ambiente do servidor.
 */
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { hashPassword } from '../src/common/utils/password';

const MIN_LENGTH = 10;

function setVar(env: string, name: string, value: string): string {
  const line = `${name}=${value}`;
  const pattern = new RegExp(`^${name}=.*$`, 'm');
  // Função como substituto: o hash tem "$", que viraria padrão de replace.
  return pattern.test(env) ? env.replace(pattern, () => line) : `${env.replace(/\n?$/, '\n')}${line}\n`;
}

async function main() {
  const args = process.argv.slice(2);
  const userFlag = args.indexOf('--user');
  const username = userFlag >= 0 ? args[userFlag + 1] : 'admin';
  const given = args.find((a, i) => !a.startsWith('--') && i !== userFlag + 1);

  if (!username || username.length < 3) throw new Error('Usuário precisa ter ao menos 3 caracteres');
  const password = given ?? randomBytes(12).toString('base64url');
  if (password.length < MIN_LENGTH) throw new Error(`A senha precisa ter ao menos ${MIN_LENGTH} caracteres`);

  const envFile = '.env';
  let env = existsSync(envFile) ? readFileSync(envFile, 'utf8') : '';
  env = setVar(env, 'ADMIN_USERNAME', username);
  env = setVar(env, 'ADMIN_PASSWORD_HASH', await hashPassword(password));
  writeFileSync(envFile, env);

  console.log(`Usuário: ${username}`);
  if (!given) console.log(`Senha gerada (anote, não é mostrada de novo): ${password}`);
  console.log('Hash salvo no .env. Reinicie a API para valer.');
}

main().catch((err) => {
  console.error((err as Error).message);
  process.exit(1);
});
