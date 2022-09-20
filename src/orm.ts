import { MikroORM } from '@mikro-orm/core';
import type { MySqlDriver } from '@mikro-orm/mysql';
import config from './mikro-orm.config';

export let orm: MikroORM<MySqlDriver>;

MikroORM.init<MySqlDriver>(config).then((o) => (orm = o));
