import { env } from "./env";

export const hostname = env.HOST
  ? `https://${env.HOST}`
  : "http://localhost:3312";

export const tsToSeconds = (ts: string) => {
  const [h, m, s] = ts.split(":").map(Number);
  return s + m * 60 + h * 60 * 60;
};
