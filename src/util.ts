// https://gist.github.com/codeguy/6684588
export function toSlug(input: string, separator = '-') {
  return input
    .toString()
    .normalize('NFD') // split an accented letter in the base letter and the acent
    .replace(/[\u0300-\u036f]/g, '') // remove all previously split accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 ]/g, '') // remove all chars not letters, numbers and spaces (to be replaced)
    .replace(/\s+/g, separator);
}

export class OperationStatus<T = any> {
  success: boolean;
  message: string;
  data?: T;

  constructor(options: { [P in keyof OperationStatus]: OperationStatus[P] }) {
    Object.assign(this, options);
  }

  static get SUCCESS() {
    return new OperationStatus({ success: true, message: 'Done' });
  }

  static collect(
    results: OperationStatus[],
    failMessage: string = 'One or more operations did not succeed',
  ): OperationStatus<string[]> {
    const messages = results.reduce((accumulator, result) => {
      if (!result.success) {
        accumulator.push(result.message);
      }
      return accumulator;
    }, [] as string[]);

    if (messages.length) {
      return new OperationStatus({ success: false, message: failMessage, data: messages });
    }

    return OperationStatus.SUCCESS;
  }

  toString() {
    if (!this.data) {
      return this.message;
    } else if (Array.isArray(this.data)) {
      return `${this.message}:\n\n${this.data.map((item) => `- ${item}`).join('\n')}`;
    }
  }
}
