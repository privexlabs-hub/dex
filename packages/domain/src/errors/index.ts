/**
 * Domain errors. HTTP mapping happens at the edge (route handlers), never here.
 */
export type DomainErrorCode =
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'UNAUTHENTICATED'
  | 'STEP_UP_REQUIRED'
  | 'VALIDATION'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'QUOTA_EXCEEDED'
  | 'INTERNAL';

export class DomainError extends Error {
  constructor(
    public readonly code: DomainErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export const notFound = (what: string) => new DomainError('NOT_FOUND', `${what} not found`);
export const forbidden = (why = 'Forbidden') => new DomainError('FORBIDDEN', why);
export const unauthenticated = () => new DomainError('UNAUTHENTICATED', 'Authentication required');
export const stepUpRequired = (permission: string) =>
  new DomainError('STEP_UP_REQUIRED', 'Recent re-authentication required', { permission });
