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

  get className() {
    return this.constructor.name;
  }

  toString() {
    return `${this.className} [${this.name}]: ${this.message}`;
  }
}

export const ErrorBaseFactory = <T extends string = string, C = any>(
  className: string,
  messages: { [K in T]: string },
) => {
  const Class = class extends ErrorBase<T, C> {
    constructor(name: T, cause?: C) {
      super(name, messages[name], cause);
    }
  };
  Object.defineProperty(Class, 'name', { value: className });
  return Class;
};
