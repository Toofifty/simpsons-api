export const normalizeTerm = (str: string) =>
  str.replace(/\W+/g, ' ').trim().toLowerCase();
