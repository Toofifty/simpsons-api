import type { Options } from '@mikro-orm/core';
import type { MySqlDriver } from '@mikro-orm/mysql';

export default {
  debug: true,
  entities: ['./dist/entities/*.entity.js'],
  entitiesTs: ['./src/entities/*.entity.ts'],
  dbName: 'simpsons-api',
  type: 'mysql',
  host: process.env['DB_HOST'],
  user: process.env['DB_USER'],
  password: process.env['DB_PASS'],
  database: process.env['DB_NAME'],
} as Options<MySqlDriver>;
