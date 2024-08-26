import { EmbedBuilder } from 'discord.js';
import { compact } from 'lodash';

export type BaseEmbedInput = ConstructorParameters<typeof EmbedBuilder>[0] & {
  titlePrefix?: string;
};

export class BaseEmbed<T extends string = string> extends EmbedBuilder {
  name: string;
  titlePrefix: string = '';

  constructor(name: T, data: BaseEmbedInput = {}) {
    const { titlePrefix, ...embed } = data;
    super(embed);
    this.name = name;
    this.titlePrefix = titlePrefix;
  }

  setTitlePrefix(title: string | null): this {
    this.titlePrefix = title ?? '';
    return this;
  }

  setTitle(title: string | null): this {
    const titleParts = compact([this.titlePrefix, title]);
    super.setTitle(titleParts.join(' '));
    return this;
  }

  static factory<T extends string = string>(options: { [K in T]: BaseEmbedInput }) {
    return class extends BaseEmbed<T> {
      static readonly codes: string[] = Object.keys(options);
      constructor(name: T) {
        const { [name]: embed } = options;
        super(name, embed);
      }
    };
  }
}
