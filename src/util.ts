export const hostname = process.env.HOST
  ? `https://${process.env.HOST}`
  : "http://localhost:3312";

export const tsToSeconds = (ts: string) => {
  const [h, m, s] = ts.split(":").map(Number);
  return s + m * 60 + h * 60 * 60;
};
