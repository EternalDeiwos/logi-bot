import { LocaleString, Snowflake } from 'discord.js';

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

export function isDiscordAPIInteraction(interaction: any): interaction is DiscordAPIInteraction {
  return 'commandType' in interaction;
}
