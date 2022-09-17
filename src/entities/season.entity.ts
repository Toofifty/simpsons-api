import {
  Collection,
  Entity,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { Episode } from './episode.entity';

@Entity({ tableName: 'seasons' })
export class Season {
  @PrimaryKey({ type: 'number' })
  id!: number;

  @Property({ type: 'string' })
  dpUuid!: string;

  @Property({ type: 'string' })
  title!: string;

  @OneToMany(() => Episode, (episode) => episode.season)
  episodes = new Collection<Episode>(this);
}
