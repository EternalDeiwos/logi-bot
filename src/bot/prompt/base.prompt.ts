import { BaseMessageOptions, MessageCreateOptions, MessageFlags } from 'discord.js';
import { mergeWith } from 'lodash';

export class BasePromptBuilder {
  public static base: MessageCreateOptions = {
    flags: [MessageFlags.SuppressNotifications],
  };
  private options: BaseMessageOptions[];

  constructor(options: BaseMessageOptions = {}) {
    this.options = [{ ...(this.constructor as typeof BasePromptBuilder).base, ...options }];
  }

  private static customizer(objValue: any, srcValue: any) {
    if (Array.isArray(objValue)) {
      return objValue.concat(srcValue);
    }
  }

  public get length() {
    return this.options.reduce(
      (state, current) => (current.embeds || current.content ? state + 1 : state),
      0,
    );
  }

  public add(options: BaseMessageOptions | BasePromptBuilder) {
    if (options instanceof BasePromptBuilder) {
      this.options = this.options.concat(options.options);
    } else {
      this.options.push(options);
    }

    return this;
  }

  public build() {
    return mergeWith({}, ...this.options, BasePromptBuilder.customizer) as BaseMessageOptions;
  }

  public clone<T extends BasePromptBuilder>() {
    const Class = this.constructor as typeof BasePromptBuilder;
    return new Class(this.build()) as T;
  }
}
