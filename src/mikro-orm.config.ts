import type { Options } from '@mikro-orm/core';
import type { MySqlDriver } from '@mikro-orm/mysql';
import { config } from './config';
import * as entities from './entities';

export default {
  debug: true,
  entities: Object.values(entities),
  dbName: 'simpsons-api',
  type: 'mysql',
  host: config('DB_HOST'),
  user: config('DB_USER'),
  password: config('DB_PASS'),
  database: config('DB_NAME'),
} as Options<MySqlDriver>;
