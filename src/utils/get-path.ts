import { join } from 'path';
import { config } from './config';

export const getDataPath = (...components: string[]) =>
  join(__dirname, '..', '..', config('DATA_DIR'), ...components);
