import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { config } from './config';

export const getDataPath = (...components: string[]) =>
  join(
    dirname(fileURLToPath(import.meta.url)),
    '..',
    '..',
    config('DATA_DIR'),
    ...components
  );
