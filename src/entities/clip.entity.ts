import {
  Collection,
  Entity,
  EntityRepositoryType,
  Formula,
  IdentifiedReference,
  ManyToOne,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { ClipRepository } from '../repositories';
import { Episode } from './episode.entity';
import { Generation } from './generation.entity';

@Entity({ tableName: 'clips', customRepository: () => ClipRepository })
export class Clip {
  [EntityRepositoryType]?: ClipRepository;

  @PrimaryKey({ type: 'char(36)' })
  uuid: string = randomUUID();

  @ManyToOne(() => Episode, { wrappedReference: true })
  episode!: IdentifiedReference<Episode>;

  @OneToMany(() => Generation, (generation) => generation.clip)
  generations = new Collection<Generation>(this);

  @Property({ type: 'number' })
  subtitleBegin!: number;

  @Property({ type: 'number' })
  subtitleEnd!: number;

  @Property({ type: 'string' })
  subtitleIndex!: string;

  // todo: if episode offset changes, apply diff to this too
  @Property({ type: 'double' })
  offset!: number;

  @Property({ type: 'double' })
  extend!: number;

  @Property({ type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @Property({ type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();

  @Formula(
    (alias) =>
      `(select sum(views) from generations g where g.clip_uuid = ${alias}.uuid)`,
    { type: 'number' }
  )
  views?: number;

  @Formula(
    (alias) =>
      `(select sum(copies) from generations g where g.clip_uuid = ${alias}.uuid)`,
    { type: 'number' }
  )
  copies?: number;

  public getOptions() {
    return {
      begin: this.subtitleBegin,
      end: this.subtitleEnd,
      offset: this.offset,
      extend: this.extend,
    };
  }

  public async getCopies() {
    return (await this.generations.loadItems()).reduce((sum, generation) => {
      return sum + generation.copies;
    }, 0);
  }

  public async getViews() {
    return (await this.generations.loadItems()).reduce((sum, generation) => {
      return sum + generation.views;
    }, 0);
  }
}
