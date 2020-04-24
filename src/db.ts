import mysql from "mysql2/promise";
import { env } from "./env";

export const dbcon = mysql.createConnection({
  host: env.DB_HOST,
  user: env.DB_USER,
  password: env.DB_PASS,
  database: env.DB_NAME,
});
