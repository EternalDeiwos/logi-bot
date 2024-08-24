import { Colors, EmbedBuilder, EmbedData, EmbedField, EmbedFooterData } from 'discord.js';
import { ErrorBase } from './base.error';

export class DiscordEmbeddableError<T extends string = string, C = any> extends ErrorBase<T, C> {
  embed: EmbedData;

  constructor(name: T, message: string, cause?: C, embed: Omit<EmbedData, 'description'> = {}) {
    super(name, message, cause);
    this.embed = embed;
  }

  get footer(): EmbedFooterData {
    return { text: `CODE: ${this.name}` };
  }

  withFields(...fields: (Omit<EmbedField, 'inline'> & { inline?: boolean })[]) {
    this.embed.fields = fields.concat(this.embed.fields || []);
    return this;
  }

  toEmbed(): EmbedBuilder {
    return new EmbedBuilder({
      title: this.name,
      description: this.message,
      color: Colors.DarkRed,
      footer: this.footer,
      ...this.embed,
    });
  }
}

export const DiscordEmbeddableErrorFactory = <T extends string>(
  className: string,
  options: { [K in T]: Omit<EmbedData, 'description'> & { message: string } },
) => {
  const Class = class<C = any> extends DiscordEmbeddableError<T, C> {
    constructor(name: T, cause?: C) {
      const {
        [name]: { message, ...embed },
      } = options;
      super(name, message, cause, embed);
    }
  };
  Object.defineProperty(Class, 'name', { value: className });
  return Class;
};
