import { plainToInstance, Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export class EnvironmentVariables {
  @IsIn(['development', 'production', 'test'])
  NODE_ENV: 'development' | 'production' | 'test' = 'development';

  @Transform(({ value }) => Number(value))
  @IsInt()
  PORT = 3000;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsString()
  @MinLength(32)
  ADMIN_KEY: string;

  @IsString()
  @MinLength(32)
  JWT_SECRET: string;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(24 * 60)
  ADMIN_TOKEN_TTL_MINUTES = 60;

  @IsString()
  @IsNotEmpty()
  CORS_ORIGIN: string;

  @Transform(({ value }) => value === true || value === 'true')
  COOKIE_SECURE = true;

  @IsOptional()
  @IsIn(['lax', 'strict', 'none'])
  COOKIE_SAMESITE: 'lax' | 'strict' | 'none' = 'lax';

  /** Nº de proxies reversos na frente da API (para o rate limit usar o IP real). */
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(0)
  TRUST_PROXY?: number;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    exposeDefaultValues: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    // Só os nomes das variáveis: nunca o valor (pode ser ADMIN_KEY/JWT_SECRET).
    const names = errors.map((e) => e.property).join(', ');
    throw new Error(`Variáveis de ambiente inválidas: ${names}`);
  }
  if (validated.NODE_ENV === 'production') {
    if (!validated.COOKIE_SECURE) {
      throw new Error('COOKIE_SECURE precisa ser true em produção');
    }
    if (validated.CORS_ORIGIN.split(',').some((o) => o.trim() === '*')) {
      throw new Error("CORS_ORIGIN não pode ser '*' em produção");
    }
  }
  return validated;
}
