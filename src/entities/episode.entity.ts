import {
  Collection,
  Entity,
  EntityRepositoryType,
  ManyToOne,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { EpisodeRepository } from '../repositories';
import { Season } from './season.entity';
import { Subtitle } from './subtitle.entity';

@Entity({ tableName: 'episodes', customRepository: () => EpisodeRepository })
export class Episode {
  [EntityRepositoryType]?: EpisodeRepository;

  @PrimaryKey({ type: 'number' })
  id!: number;

  @Property({ type: 'string' })
  dpUuid!: string;

  @ManyToOne(() => Season)
  season!: Season;

  @Property({ type: 'number' })
  idInSeason!: number;

  @Property({ type: 'string' })
  title!: string;

  @Property({ type: 'string' })
  subtitleIndex!: string;

  @OneToMany(() => Subtitle, (subtitle) => subtitle.episode)
  subtitles = new Collection<Subtitle>(this);
}
