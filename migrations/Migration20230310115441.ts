import { Migration } from '@mikro-orm/migrations';

export class Migration20230310115441 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table `snippets` add `snapshot` varchar(255) not null;');
  }

  async down(): Promise<void> {
    this.addSql('alter table `snippets` drop `snapshot`;');
  }

}
