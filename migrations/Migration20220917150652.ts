import { Migration } from '@mikro-orm/migrations';

export class Migration20220917150652 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table `episodes` add `subtitle_correction` int not null;');
  }

  async down(): Promise<void> {
    this.addSql('alter table `episodes` drop `subtitle_correction`;');
  }

}
