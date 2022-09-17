import { config } from './config';

export const url = (path: string = '') =>
  config('HOST')
    ? `https://${config('HOST')}/${path}`
    : `http://localhost:${config('PORT') || 3312}/${path}`;
