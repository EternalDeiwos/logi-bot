import { OperationStatus } from './types';

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

export function collectResults(results: OperationStatus[]): OperationStatus {
  const messages = results.reduce((accumulator, result) => {
    if (!result.success) {
      accumulator.push(result.message);
    }
    return accumulator;
  }, [] as string[]);

  if (messages.length) {
    return { success: false, message: messages.map((m) => `- ${m}`).join('\n') };
  }

  return { success: true, message: 'Done' };
}
