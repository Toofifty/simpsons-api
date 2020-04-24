// custom env cos it has to read at runtime

import fs from "fs";

const file = fs.readFileSync(".env").toString().split("\n");

export const env: Record<string, string> = file.reduce((acc, line) => {
  const [key, ...splitValue] = line.split("=");
  return { ...acc, [key]: splitValue.join("=") };
}, {});
