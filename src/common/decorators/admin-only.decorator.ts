import { SetMetadata } from '@nestjs/common';

export const ADMIN_ONLY_KEY = 'adminOnly';

/** Marca a rota (ou o controller inteiro) como exclusiva do professor. */
export const AdminOnly = () => SetMetadata(ADMIN_ONLY_KEY, true);
