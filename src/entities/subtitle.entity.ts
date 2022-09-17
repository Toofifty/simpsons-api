import {
  Entity,
  EntityRepositoryType,
  IdentifiedReference,
  ManyToOne,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { SubtitleRepository } from '../repositories';
import { secondsToTS, tsToSeconds } from '../utils';
import { Episode } from './episode.entity';

@Entity({ tableName: 'subtitles', customRepository: () => SubtitleRepository })
export class Subtitle {
  [EntityRepositoryType]?: SubtitleRepository;

  @PrimaryKey({ type: 'number' })
  id!: number;

  @ManyToOne(() => Episode, { wrappedReference: true })
  episode!: IdentifiedReference<Episode>;

  @Property({ type: 'string' })
  timeBegin!: string;

  @Property({ type: 'string' })
  timeEnd!: string;

  @Property({ type: 'string' })
  text!: string;

  @Property({ type: 'number' })
  indexBegin!: number;

  @Property({ type: 'number' })
  indexEnd!: number;

  public normalize() {
    return {
      id: this.id,
      episode_id: this.episode.id,
      time_begin: this.timeBegin,
      time_end: this.timeEnd,
      text: this.text,
    };
  }

  public getTimeBegin(offset: number) {
    return secondsToTS(tsToSeconds(this.timeBegin) + offset);
  }

  public getTimeEnd(offset: number) {
    return secondsToTS(tsToSeconds(this.timeEnd) + offset);
  }
}
