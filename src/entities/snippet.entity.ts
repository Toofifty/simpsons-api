import {
  Collection,
  Entity,
  EntityRepositoryType,
  IdentifiedReference,
  ManyToMany,
  ManyToOne,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { SnippetRepository } from '../repositories';
import type { SnippetOptions } from '../types';
import { Episode } from './episode.entity';
import { Subtitle } from './subtitle.entity';

@Entity({ tableName: 'snippets', customRepository: () => SnippetRepository })
export class Snippet {
  [EntityRepositoryType]?: SnippetRepository;

  @PrimaryKey({ type: 'char(36)' })
  uuid: string = randomUUID();

  @ManyToOne(() => Episode, { wrappedReference: true })
  episode!: IdentifiedReference<Episode>;

  @Property({ type: 'string', index: true })
  filepath!: string;

  @Property({ type: 'boolean', index: true })
  published: boolean = false;

  @Property({ type: 'json' })
  options!: SnippetOptions;

  @Property({ type: 'number', index: true })
  views!: number;

  @ManyToMany(() => Subtitle, (subtitle) => subtitle.published, { owner: true })
  subtitles: Collection<Subtitle> = new Collection<Subtitle>(this);

  @Property({ type: 'datetime', onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
