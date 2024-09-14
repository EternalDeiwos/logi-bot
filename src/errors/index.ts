import { DiscordAPIError, PermissionsString } from 'discord.js';
import { BaseError } from 'src/errors';
import { QueryFailedError } from 'typeorm';

export * from './base.error';

type InternalErrorConfig = {
  INTERNAL_SERVER_ERROR: undefined;
};

type ExternalErrorConfig = {
  INSUFFICIENT_PRIVILEGES: PermissionsString[];
  DISCORD_API_ERROR: DiscordAPIError | DiscordAPIError[];
  CLAPFOOT_API_ERROR: Error;
  CATALOG_ERROR: Error;
};

type DatabaseErrorConfig = {
  QUERY_FAILED: QueryFailedError;
};

type QueueErrorConfig = {
  QUEUE_FAILED: Error;
};

type ValidationErrorConfig = {
  VALIDATION_FAILED: Error[];
};

type AuthErrorConfig = {
  FORBIDDEN: any;
};

export class InternalError<K extends keyof InternalErrorConfig> extends BaseError<
  K,
  InternalErrorConfig[K]
> {}

export class ExternalError<K extends keyof ExternalErrorConfig> extends BaseError<
  K,
  ExternalErrorConfig[K]
> {}

export class DatabaseError<K extends keyof DatabaseErrorConfig> extends BaseError<
  K,
  DatabaseErrorConfig[K]
> {}

export class QueueError<K extends keyof QueueErrorConfig> extends BaseError<
  K,
  QueueErrorConfig[K]
> {}

export class ValidationError<K extends keyof ValidationErrorConfig> extends BaseError<
  K,
  ValidationErrorConfig[K]
> {}

export class AuthError<K extends keyof AuthErrorConfig> extends BaseError<K, AuthErrorConfig[K]> {}
