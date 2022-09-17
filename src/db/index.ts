import mysql from 'mysql2/promise';

import { config } from '../config';

export const dbcon = () =>
  mysql.createConnection({
    host: config('DB_HOST'),
    user: config('DB_USER'),
    password: config('DB_PASS'),
    database: config('DB_NAME'),
  });
