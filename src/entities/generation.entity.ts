import {
  Entity,
  EntityRepositoryType,
  IdentifiedReference,
  ManyToOne,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Clip } from './clip.entity';
import { hash } from '../utils/hash';
import { GenerationRepository } from '../repositories/generation.repository';
import { join } from 'path';

@Entity({
  tableName: 'generations',
  customRepository: () => GenerationRepository,
})
export class Generation {
  [EntityRepositoryType]?: GenerationRepository;

  @PrimaryKey({ type: 'char(36)' })
  uuid: string = randomUUID();

  @ManyToOne(() => Clip, { wrappedReference: true })
  clip!: IdentifiedReference<Clip>;

  @Property({ type: 'string' })
  snapshot!: string;

  @Property({ type: 'string' })
  filetype!: string;

  @Property({ type: 'number' })
  resolution!: number;

  @Property({ type: 'boolean' })
  renderSubtitles!: boolean;

  @Property({ type: 'string', nullable: true })
  substitutions?: string;

  /**
   * Amount of times this generated clip was downloaded or
   * the URL was copied
   */
  @Property({ type: 'number' })
  copies!: number;

  /**
   * Amount of views originating outside of the Linguo frontend
   */
  @Property({ type: 'number' })
  views!: number;

  @Property({ type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @Property({ type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();

  public getFilename() {
    if (!this.clip.isInitialized()) {
      throw 'Clip not loaded when generating filename';
    }
    const clip = this.clip.getEntity();

    return Generation.getFilename(clip, this);
  }

  public getFilepath() {
    if (!this.clip.isInitialized()) {
      throw 'Clip not loaded when generating filepath';
    }
    const clip = this.clip.getEntity();
    if (!clip.episode.isInitialized()) {
      throw 'Episode not loaded when generating filepath';
    }
    const episode = clip.episode.getEntity();

    return join(this.filetype, episode.identifier, this.getFilename());
  }

  public static getFilename(
    clip: Clip,
    {
      resolution,
      renderSubtitles,
      substitutions,
      filetype,
    }: {
      resolution: number;
      renderSubtitles?: boolean;
      substitutions?: string;
      filetype: string;
    }
  ) {
    return `x${resolution}${renderSubtitles ? 's' : 'ns'}b${
      clip.subtitleBegin
    }e${clip.subtitleEnd}${clip.offset ? `~${clip.offset}` : ''}${
      clip.extend ? `+${clip.extend}` : ''
    }${substitutions ? '_' + hash(substitutions) : ''}.${filetype}`;
  }
}
