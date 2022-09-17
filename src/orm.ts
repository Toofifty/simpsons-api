import { MikroORM } from '@mikro-orm/core';
import type { MySqlDriver } from '@mikro-orm/mysql';
import config from './mikro-orm.config';

export const orm = await MikroORM.init<MySqlDriver>(config);
