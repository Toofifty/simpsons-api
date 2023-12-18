export const splitCSV = (str: string, delimeter = ',') => {
  const values: string[] = [];
  let lastQuote = '';
  let current = '';
  str.split('').forEach((char) => {
    if (char === delimeter && !lastQuote) {
      values.push(current);
      current = '';
      return;
    }

    if (char === "'" || char === '"') {
      if (lastQuote === char) {
        lastQuote = '';
        return;
      }

      if (!lastQuote) {
        lastQuote = char;
        return;
      }
    }

    current += char;
  });

  values.push(current);
  return values;
};
