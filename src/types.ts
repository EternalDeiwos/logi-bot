import { Snowflake } from 'discord.js';

export type OperationStatus<T = any> = {
  success: boolean;
  message: string;
  data?: T;
};

export enum MoveTicketBehaviour {
  DELETE = 'delete',
  ARCHIVE = 'archive',
}

export type AdminOverrideOptions = {
  isAdmin: boolean;
};

export type SkipAccessControlOptions = {
  skipAccessControl: boolean;
};

export type DeleteOptions = {
  softDelete: boolean;
} & AdminOverrideOptions &
  SkipAccessControlOptions;

export type ArchiveOptions = {
  archiveTargetRef: Snowflake;
  archiveTag: string;
};
