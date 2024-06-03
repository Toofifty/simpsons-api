import { EntityRepository } from '@mikro-orm/mysql';
import type { Clip } from '../entities';
import type {
  FilterQuery,
  FindOneOptions,
  Loaded,
  RequiredEntityData,
} from '@mikro-orm/core';

export class ClipRepository extends EntityRepository<Clip> {
  async upsert<P extends string = never>(
    where: FilterQuery<Clip>,
    data: RequiredEntityData<Clip>,
    options?: FindOneOptions<Clip, P>
  ): Promise<Loaded<Clip, P>> {
    let entity = await this.findOne(where, options);

    if (!entity) {
      entity = this.create(data) as Loaded<Clip, P>;
    } else {
      this.assign(entity, data);
    }

    await this.persistAndFlush(entity);

    return entity;
  }
}
