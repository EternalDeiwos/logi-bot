import { LocaleString, Snowflake } from 'discord.js';
import { ConsumerResponseError } from 'src/errors';

export enum CrewMemberAccess {
  OWNER = 0,
  ADMIN = 1,
  MEMBER = 10,
}

export enum AccessMode {
  OWNER = 0,
  ADMIN = 1,
  WRITE = 10,
  READ = 100,
}

export enum TicketTag {
  TRIAGE = 'Triage',
  ACCEPTED = 'Accepted',
  DECLINED = 'Declined',
  REPEATABLE = 'Repeatable',
  IN_PROGRESS = 'In Progress',
  DONE = 'Done',
  MOVED = 'Moved',
  ABANDONED = 'Abandoned',
}

export type ArrayElement<A> = A extends readonly (infer T)[] ? T : never;
export type ArrayOrElement<A> = A | A[];

export type DiscordAPIWebhook = {
  id: Snowflake;
  token: string;
  url: string;
};

export type DiscordAPIInteractionOptions = {};
export type DiscordAPIInteraction = {
  type: number;
  id: Snowflake;
  applicationId: Snowflake;
  channelId: Snowflake;
  guildId: Snowflake;
  user: Snowflake;
  member: Snowflake;
  version: number;
  appPermissions: Snowflake;
  memberPermissions: Snowflake;
  locale: LocaleString;
  guildLocale: LocaleString;
  commandId: Snowflake;
  commandName: string;
  commandType: number;
  commandGuildId: Snowflake;
  deferred: boolean;
  replied: boolean;
  ephemeral: boolean;
  webhook: DiscordAPIWebhook;
  options: DiscordAPIInteractionOptions;
};

export enum MoveTicketBehaviour {
  DELETE = 'delete',
  ARCHIVE = 'archive',
}

export type MoveTicketOptions = {
  moveTicketMode: MoveTicketBehaviour;
};

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

export type DiscordCommandHandlerPayload = {
  interaction: DiscordAPIInteraction;
};

// Useful helper for correctly assigning type of a serialized Discord Interaction on the consumer side
export function isDiscordAPIInteraction(interaction: any): interaction is DiscordAPIInteraction {
  return 'commandType' in interaction;
}

export type ConsumerResponsePayload<C = any> = {
  content?: C;
  error?: ConsumerResponseError;
};
