const mysql = require("mysql2/promise");

(async () => {
  const db = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root",
    database: "simpsons-api",
  });

  await db.execute(`
    create table if not exists seasons (
        id int unsigned auto_increment primary key,
        dp_uuid varchar(36) not null unique,
        title varchar(30) not null
    )
  `);

  await db.execute(`
    create table if not exists episodes (
        id int unsigned auto_increment primary key,
        dp_uuid varchar(36) not null unique,
        season_id int unsigned not null,
        id_in_season int unsigned not null,
        title varchar(255) not null,
        subtitle_index longtext not null,
        foreign key (season_id)
            references seasons(id)
            on delete cascade
    )
  `);

  await db.execute(`
    create table if not exists subtitles (
        id int unsigned auto_increment primary key,
        episode_id int unsigned not null,
        time_begin varchar(12) not null,
        time_end varchar(12) not null,
        text varchar(255) not null,
        index_begin int unsigned,
        index_end int unsigned,
        foreign key (episode_id)
            references episodes(id)
            on delete cascade
    )
  `);

  db.close();
})();
