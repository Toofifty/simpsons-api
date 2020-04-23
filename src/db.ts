import mysql from "mysql2/promise";

export const dbcon = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
  database: "simpsons-api",
});
