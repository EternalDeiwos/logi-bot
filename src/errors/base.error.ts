export type ExtractErrorKeys<E extends BaseError> = E extends BaseError<infer T> ? T : string;
export type ExtractErrorCause<E extends BaseError> =
  E extends BaseError<infer _, infer C> ? C : any;

export type ConsumerResponseError<E extends BaseError = BaseError> = {
  code: ExtractErrorKeys<E>;
  internal: boolean;
  message?: string;
  cause?: ExtractErrorCause<E>;
};

export class BaseError<T extends string = string, C = any> extends Error {
  name: T;
  message: string;
  private internal: boolean = true;
  public cause?: C;

  constructor(name: T, message: string, cause?: C) {
    super();
    this.name = name;
    this.message = message;

    // Preserve root cause
    if (cause instanceof BaseError) {
      this.cause = cause.cause;
    } else {
      this.cause = cause;
    }
  }

  get isInternal() {
    return this.internal;
  }

  asDisplayable() {
    this.internal = false;
    return this;
  }

  getCause(): string | undefined {
    return (
      this.cause &&
      (typeof this.cause === 'string'
        ? this.cause
        : this.cause instanceof Error
          ? this.cause?.stack
          : JSON.stringify(this.cause))
    );
  }

  toJSON() {
    const obj: ConsumerResponseError<this> = {
      code: this.name as any,
      cause: this.getCause() as any,
      internal: this.isInternal,
    };

    if (!this.isInternal) {
      obj.message = this.message;
    }

    return obj;
  }

  static from<E extends BaseError>(options: ConsumerResponseError<E>): E {
    const ErrorClass = this;
    const err = new ErrorClass<ExtractErrorKeys<E>, ExtractErrorCause<E>>(
      options.code,
      options.message,
      options.cause,
    ) as unknown as E;
    err.internal = options.internal;
    return err;
  }
}
