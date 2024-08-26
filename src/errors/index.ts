import { DisplayError, ErrorBase } from './base.error';
export * from './base.error';

export const InternalError = DisplayError.factory({
  INTERNAL_SERVER_ERROR: `Something went wrong on our side.`,
  OFFLINE_ERROR: `At least part of our service is offline.`,
  TEST_ERROR: `If you weren't expecting to see this then please report it.`,
});

export const AuthError = DisplayError.factory({
  FORBIDDEN: 'You do not have access',
});

export const ValidationError = DisplayError.factory({
  MALFORMED_INPUT: 'One or more required fields are missing.',
});

export const ApiError = ErrorBase.factory({
  CLAPFOOT_ERROR: 'Failed to access the war api',
  CATALOG_ERROR: 'Failed to retrieve catalog document',
  DISCORD_ERROR: 'Rejected',
});

export type DatabaseErrorCodes = 'QUERY_FAILED';
export class DatabaseError extends ErrorBase<DatabaseErrorCodes> {}

export const DisplayErrors = {
  InternalError,
  AuthError,
  ValidationError,
};

export const Errors = {
  InternalError,
  AuthError,
  ValidationError,
  ApiError,
  DatabaseError,
};

export type DisplayErrorType = (typeof DisplayErrors)[keyof typeof DisplayErrors];
export type DisplayErrorKey = ConstructorParameters<DisplayErrorType>[0];
export type ErrorType = (typeof Errors)[keyof typeof Errors];
export type ErrorKey = ConstructorParameters<ErrorType>[0];
