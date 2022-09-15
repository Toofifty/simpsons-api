import { config } from './config';

export const hostname = config('HOST')
  ? `https://${config('HOST')}`
  : `http://localhost:${config('PORT') || 3312}`;

export const tsToSeconds = (ts: string) => {
  const [h, m, s] = ts.split(':').map(Number);
  return s + m * 60 + h * 60 * 60;
};

export const padZero = (num: number | string) => {
  if (Number(num) < 10) return `0${num}`;
  return num.toString();
};

export const secondsToTS = (seconds: number) => {
  const s = (seconds % 60).toFixed(3);
  const m = Math.floor(seconds / 60);
  const h = Math.floor(seconds / (60 * 60));
  return `${padZero(h)}:${padZero(m)}:${padZero(s)}`;
};
