import { SuccessEmbed } from './success.embed';
import { ErrorEmbed } from './error.embed';
import { PromptEmbed } from './prompt.embed';

const PreparedEmbeds = {
  SuccessEmbed,
  PromptEmbed,
  ErrorEmbed,
};

export type PreparedEmbed = (typeof PreparedEmbeds)[keyof typeof PreparedEmbeds];
export type PreparedEmbedKey = ConstructorParameters<PreparedEmbed>[0];

export * from './factory/embed.factory';
export * from './success.embed';
export * from './error.embed';
export * from './prompt.embed';
