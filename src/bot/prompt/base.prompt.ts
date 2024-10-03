import { BaseMessageOptions } from 'discord.js';
import { mergeWith } from 'lodash';

export class BasePromptBuilder {
  public static base: BaseMessageOptions = {};
  private options: BaseMessageOptions[];

  constructor(options: BaseMessageOptions = {}) {
    this.options = [{ ...options, ...(this.constructor as typeof BasePromptBuilder).base }];
  }

  private static customizer(objValue: any, srcValue: any) {
    if (Array.isArray(objValue)) {
      return objValue.concat(srcValue);
    }
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
    const [first, ...rest] = this.options;
    return mergeWith(first, ...rest, BasePromptBuilder.customizer) as BaseMessageOptions;
  }
}
