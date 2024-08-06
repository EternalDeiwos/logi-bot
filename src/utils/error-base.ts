export class ErrorBase<T extends string> extends Error {
  name: T;
  message: string;
  public cause: any;

  constructor(name: T, message: string, cause: any) {
    super();
    this.name = name;
    this.message = message;
    this.cause = cause;
  }
}
