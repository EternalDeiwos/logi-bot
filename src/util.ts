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

// https://stackoverflow.com/a/38927158
export function midString(prev, next) {
  let p, n, pos, str;
  for (pos = 0; p == n; pos++) {
    // find leftmost non-matching character
    p = pos < prev.length ? prev.charCodeAt(pos) : 96;
    n = pos < next.length ? next.charCodeAt(pos) : 123;
  }
  str = prev.slice(0, pos - 1); // copy identical part of string
  if (p == 96) {
    // prev string equals beginning of next
    while (n == 97) {
      // next character is 'a'
      n = pos < next.length ? next.charCodeAt(pos++) : 123; // get char from next
      str += 'a'; // insert an 'a' to match the 'a'
    }
    if (n == 98) {
      // next character is 'b'
      str += 'a'; // insert an 'a' to match the 'b'
      n = 123; // set to end of alphabet
    }
  } else if (p + 1 == n) {
    // found consecutive characters
    str += String.fromCharCode(p); // insert character from prev
    n = 123; // set to end of alphabet
    while ((p = pos < prev.length ? prev.charCodeAt(pos++) : 96) == 122) {
      // p='z'
      str += 'z'; // insert 'z' to match 'z'
    }
  }
  return str + String.fromCharCode(Math.ceil((p + n) / 2)); // append middle character
}
