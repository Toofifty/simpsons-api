import { Migration } from '@mikro-orm/migrations';

export class Migration20240603121405 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table `clips` (`uuid` varchar(255) not null, `episode_id` int unsigned not null, `subtitle_begin` int not null, `subtitle_end` int not null, `subtitle_index` varchar(255) not null, `offset` double not null, `extend` double not null, `created_at` datetime not null, `updated_at` datetime not null, primary key (`uuid`)) default character set utf8mb4 engine = InnoDB;');
    this.addSql('alter table `clips` add index `clips_episode_id_index`(`episode_id`);');

    this.addSql('create table `generations` (`uuid` varchar(255) not null, `clip_uuid` varchar(255) not null, `snapshot` varchar(255) not null, `filetype` varchar(255) not null, `resolution` int not null, `render_subtitles` tinyint(1) not null, `substitutions` varchar(255) null, `copies` int not null, `views` int not null, `created_at` datetime not null, `updated_at` datetime not null, primary key (`uuid`)) default character set utf8mb4 engine = InnoDB;');
    this.addSql('alter table `generations` add index `generations_clip_uuid_index`(`clip_uuid`);');

    this.addSql('alter table `clips` add constraint `clips_episode_id_foreign` foreign key (`episode_id`) references `episodes` (`id`) on update cascade;');

    this.addSql('alter table `generations` add constraint `generations_clip_uuid_foreign` foreign key (`clip_uuid`) references `clips` (`uuid`) on update cascade;');
  }

  async down(): Promise<void> {
    this.addSql('alter table `generations` drop foreign key `generations_clip_uuid_foreign`;');

    this.addSql('drop table if exists `clips`;');

    this.addSql('drop table if exists `generations`;');
  }

}
