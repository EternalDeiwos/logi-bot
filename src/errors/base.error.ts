import { PreparedEmbedKey } from 'src/bot/embed';

export class ErrorBase<T extends string = string, C = any> extends Error {
  name: T;
  message: string;
  public cause?: C;

  constructor(name: T, message: string, cause?: C) {
    super();
    this.name = name;
    this.message = message;
    this.cause = cause;
  }

  static factory<T extends string = string, C = any>(messages: { [K in T]: string }) {
    return class extends this<T> {
      static readonly codes: string[] = Object.keys(messages);
      constructor(name: T, cause?: C) {
        super(name, messages[name], cause);
      }
    };
  }
}

export class DisplayError<T extends string = PreparedEmbedKey, C = any> extends ErrorBase<T, C> {}

export type PreparedError<T extends string = string, C = any> =
  | ReturnType<typeof ErrorBase.factory<T, C>>
  | ReturnType<typeof DisplayError.factory<T, C>>;
export type PreparedErrorCodes<T extends PreparedError> = ConstructorParameters<T>[0];
