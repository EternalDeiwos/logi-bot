import { ErrorBase, ErrorBaseFactory } from './error-base';
export { ErrorBase, ErrorBaseFactory };
export * from './discord-err-handler';
export * from './rmq-err-hander';

export const InternalError = ErrorBaseFactory('InternalError', {
  INTERNAL_SERVER_ERROR: 'Something went wrong; please try again later',
  TEST_ERROR: 'You were expecting this',
});

export const AuthError = ErrorBaseFactory('AuthError', {
  FORBIDDEN: 'You do not have access',
});

export const ValidationError = ErrorBaseFactory('ValidationError', {
  MALFORMED_INPUT: 'Missing required properties',
});

export const ApiError = ErrorBaseFactory('ApiError', {
  CLAPFOOT: 'Failed to access the war api',
  CATALOG: 'Failed to retrieve catalog document',
  DISCORD: 'Rejected',
});

type DatabaseErrorName = 'QUERY_FAILED';
export class DatabaseError extends ErrorBase<DatabaseErrorName> {}
