import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'logs' })
export class Log {
  @PrimaryKey({ type: 'number', autoincrement: true })
  id?: number;

  @Property({ type: 'datetime' })
  createdAt?: Date = new Date();

  @Property({ type: 'number' })
  status!: number;

  @Property({ type: 'string' })
  requestPath!: string;

  @Property({ type: 'string', nullable: true })
  body?: string;

  @Property({ type: 'boolean' })
  success!: boolean;

  @Property({ type: 'number' })
  responseTime!: number;

  @Property({ type: 'number', nullable: true })
  renderTime?: number;
}
