import { Migration } from '@mikro-orm/migrations';

export class Migration20220920121626 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table `logs` (`id` int unsigned not null auto_increment primary key, `created_at` datetime not null, `status` int not null, `request_path` varchar(255) not null, `success` tinyint(1) not null, `response_time` int not null, `render_time` int null) default character set utf8mb4 engine = InnoDB;');
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists `logs`;');
  }

}
