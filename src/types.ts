import { LocaleString, Snowflake } from 'discord.js';
import { ErrorKey } from 'src/errors';

export type ArrayElement<A> = A extends readonly (infer T)[] ? T : never;

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
export type DiscordCommandHandlerPayload = { interaction: DiscordAPIInteraction };

// Useful helper for correctly assigning type of a serialized Discord Interaction on the consumer side
export function isDiscordAPIInteraction(interaction: any): interaction is DiscordAPIInteraction {
  return 'commandType' in interaction;
}

export type ConsumerResponseError = {
  code: ErrorKey;
  message?: string;
  cause?: string;
};
export type ConsumerResponsePayload<C = any> = {
  content?: C;
  error?: ConsumerResponseError;
};
