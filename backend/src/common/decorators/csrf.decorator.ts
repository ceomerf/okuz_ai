import { SetMetadata } from '@nestjs/common';

export const CSRF_REQUIRED = 'csrf_required';
export const CSRF_OPTIONAL = 'csrf_optional';

/**
 * CSRF koruması gerektiren endpoint'ler için decorator
 */
export const RequireCsrf = () => SetMetadata(CSRF_REQUIRED, true);

/**
 * CSRF koruması opsiyonel endpoint'ler için decorator
 */
export const OptionalCsrf = () => SetMetadata(CSRF_OPTIONAL, true);
