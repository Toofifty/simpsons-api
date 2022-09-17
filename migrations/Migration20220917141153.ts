import { Migration } from '@mikro-orm/migrations';

export class Migration20220917141153 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table `seasons` (`id` int unsigned not null auto_increment primary key, `dp_uuid` varchar(255) not null, `title` varchar(255) not null) default character set utf8mb4 engine = InnoDB;');

    this.addSql('create table `episodes` (`id` int unsigned not null auto_increment primary key, `dp_uuid` varchar(255) not null, `season_id` int unsigned not null, `id_in_season` int not null, `title` varchar(255) not null, `subtitle_index` varchar(255) not null) default character set utf8mb4 engine = InnoDB;');
    this.addSql('alter table `episodes` add index `episodes_season_id_index`(`season_id`);');

    this.addSql('create table `subtitles` (`id` int unsigned not null auto_increment primary key, `episode_id` int unsigned not null, `time_begin` varchar(255) not null, `time_end` varchar(255) not null, `text` varchar(255) not null, `index_begin` int not null, `index_end` int not null) default character set utf8mb4 engine = InnoDB;');
    this.addSql('alter table `subtitles` add index `subtitles_episode_id_index`(`episode_id`);');

    this.addSql('alter table `episodes` add constraint `episodes_season_id_foreign` foreign key (`season_id`) references `seasons` (`id`) on update cascade;');

    this.addSql('alter table `subtitles` add constraint `subtitles_episode_id_foreign` foreign key (`episode_id`) references `episodes` (`id`) on update cascade;');
  }

}
