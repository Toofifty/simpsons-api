import { Migration } from '@mikro-orm/migrations';

export class Migration20220920123549 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table `logs` add `body` varchar(255) null;');
  }

  async down(): Promise<void> {
    this.addSql('alter table `logs` drop `body`;');
  }

}
