import { ErrorBase, ErrorBaseFactory } from './base';
export { ErrorBase, ErrorBaseFactory };
export * from './database';

export const InternalError = ErrorBaseFactory({
  INTERNAL_SERVER_ERROR: 'Something went wrong; please try again later',
});

export const AuthError = ErrorBaseFactory({
  FORBIDDEN: 'You do not have access',
});

export const DiscordError = ErrorBaseFactory({
  MALFORMED_INPUT: 'Missing required properties',
});

export const ApiError = ErrorBaseFactory({
  CLAPFOOT: 'Failed to access the war api',
  CATALOG: 'Failed to retrieve catalog document',
  DISCORD: '',
});
