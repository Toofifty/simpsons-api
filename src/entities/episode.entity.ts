import {
  Collection,
  Entity,
  EntityRepositoryType,
  ManyToOne,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { readdirSync } from 'fs';
import { EpisodeRepository } from '../repositories';
import { getDataPath } from '../utils';
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

  @Property({ type: 'number' })
  subtitleCorrection = 0;

  public get source() {
    const sources = readdirSync(getDataPath('source'));
    const episodeRegex = new RegExp(
      `S0?${this.season.id}E0?${this.idInSeason}`
    );
    return sources.find((source) => episodeRegex.test(source));
  }

  public get identifier() {
    return `s${this.season.id.toString().padStart(2, '0')}e${this.idInSeason}`;
  }
}
