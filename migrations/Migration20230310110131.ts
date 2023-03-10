import { Migration } from '@mikro-orm/migrations';

export class Migration20230310110131 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table `snippets` (`uuid` varchar(255) not null, `episode_id` int unsigned not null, `filepath` varchar(255) not null, `published` tinyint(1) not null, `options` json not null, `views` int not null, `created_at` datetime not null, `updated_at` datetime not null, primary key (`uuid`)) default character set utf8mb4 engine = InnoDB;');
    this.addSql('alter table `snippets` add index `snippets_episode_id_index`(`episode_id`);');
    this.addSql('alter table `snippets` add index `snippets_filepath_index`(`filepath`);');
    this.addSql('alter table `snippets` add index `snippets_published_index`(`published`);');
    this.addSql('alter table `snippets` add index `snippets_views_index`(`views`);');

    this.addSql('create table `snippets_subtitles` (`snippet_uuid` varchar(255) not null, `subtitle_id` int unsigned not null, primary key (`snippet_uuid`, `subtitle_id`)) default character set utf8mb4 engine = InnoDB;');
    this.addSql('alter table `snippets_subtitles` add index `snippets_subtitles_snippet_uuid_index`(`snippet_uuid`);');
    this.addSql('alter table `snippets_subtitles` add index `snippets_subtitles_subtitle_id_index`(`subtitle_id`);');

    this.addSql('alter table `snippets` add constraint `snippets_episode_id_foreign` foreign key (`episode_id`) references `episodes` (`id`) on update cascade;');

    this.addSql('alter table `snippets_subtitles` add constraint `snippets_subtitles_snippet_uuid_foreign` foreign key (`snippet_uuid`) references `snippets` (`uuid`) on update cascade on delete cascade;');
    this.addSql('alter table `snippets_subtitles` add constraint `snippets_subtitles_subtitle_id_foreign` foreign key (`subtitle_id`) references `subtitles` (`id`) on update cascade on delete cascade;');
  }

  async down(): Promise<void> {
    this.addSql('alter table `snippets_subtitles` drop foreign key `snippets_subtitles_snippet_uuid_foreign`;');

    this.addSql('drop table if exists `snippets`;');

    this.addSql('drop table if exists `snippets_subtitles`;');
  }

}
