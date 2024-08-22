export class ErrorBase<T extends string, C = any> extends Error {
  name: T;
  message: string;
  public cause?: C;

  constructor(name: T, message: string, cause?: C) {
    super();
    this.name = name;
    this.message = message;
    this.cause = cause;
  }

  get errorName() {
    return this.constructor.name;
  }

  toString() {
    return `${this.errorName} \`${this.name}\`: ${this.message}`;
  }
}

export const ErrorBaseFactory = <T extends string>(descriptions: { [K in T]: string }) =>
  class<C = any> extends ErrorBase<T, C> {
    constructor(name: T, cause?: C) {
      super(name, descriptions[name], cause);
    }
  };
